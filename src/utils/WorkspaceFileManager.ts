import * as vscode from "vscode";
import * as path from "path";
import * as fg from "fast-glob";
import { COMMON_EXCLUDED_DIRS, EXCLUDED_FILE_EXTENSIONS } from "./constants";
import { WorkspaceFolder, WorkspaceFile } from "./types";

/**
 * Manages file system operations and caching for the repo2prompt extension
 */
export class WorkspaceFileManager {
  // Cache of workspace files (paths only, not content)
  private filePathCache: Map<string, WorkspaceFile> = new Map();
  // Cache of workspace folders (paths only)
  private folderPathCache: Map<string, WorkspaceFolder> = new Map();
  // Flag to track if the cache is initialized
  private cacheInitialized: boolean = false;
  // Event emitters for cache changes
  private _onCacheChanged = new vscode.EventEmitter<void>();
  // Effective excluded directories (combining static list with configuration)
  private excludeHiddenDirectories: boolean = false;

  private globalIgnorePatterns: Set<string> = new Set();

  // Event that can be subscribed to
  public readonly onCacheChanged = this._onCacheChanged.event;

  // Add a new private property to track initialization
  private effectiveExcludedDirsInitialized: boolean = false;

  constructor() {
    // Watch for configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('repo2prompt.excludeHiddenDirectories') ||
            event.affectsConfiguration('repo2prompt.respectGitignore')) {
            this.updateEffectiveExcludedDirs();
        }
    });
  }

  // Add static factory method
  public static async create(): Promise<WorkspaceFileManager> {
    const instance = new WorkspaceFileManager();
    // Initialize the effective excluded directories
    await instance.updateEffectiveExcludedDirs();
    instance.effectiveExcludedDirsInitialized = true;
    return instance;
  }

  /**
   * Update the effective excluded directories based on current configuration
   */
  private async updateEffectiveExcludedDirs(): Promise<void> {
    // Check if we should exclude hidden directories
    this.excludeHiddenDirectories = vscode.workspace.getConfiguration('repo2prompt').get('excludeHiddenDirectories', true);
    const respectGitignore = vscode.workspace.getConfiguration('repo2prompt').get('respectGitignore', true);

    this.globalIgnorePatterns = new Set([
        ...COMMON_EXCLUDED_DIRS.map(dir => `**/${dir}/**`),
        ...EXCLUDED_FILE_EXTENSIONS.map(ext => `**/*${ext}`)
    ]);

    if (this.excludeHiddenDirectories) {
        this.globalIgnorePatterns.add('**/.*/**');
    }

    if (respectGitignore) {
        await this.addGitignorePatterns();
    }
  }

  private async addGitignorePatterns(): Promise<void> {
    try {
        const workspaceRootPath = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
        if (!workspaceRootPath) return;

        const gitignorePath = path.join(workspaceRootPath, '.gitignore');
        const gitignoreUri = vscode.Uri.file(gitignorePath);

        try {
            const content = await vscode.workspace.fs.readFile(gitignoreUri);
            let patterns: string[] = [];
            
            new TextDecoder().decode(content)
                .split('\n')
                .map(line => line.trim())
                // Filter out comments and empty lines
                .filter(line => line && !line.startsWith('#'))
                // Convert patterns to glob format
                .forEach(pattern => {
                    // Remove leading slash if present
                    pattern = pattern.replace(/^\//, '');
                    
                    // Handle directory patterns (those ending with a slash)
                    if (pattern.endsWith('/')) {
                        // Remove the trailing slash
                        const dirPattern = pattern.slice(0, -1);
                        // Add two patterns: one for the directory itself and one for its contents
                        patterns.push(`**/${dirPattern}`);
                        patterns.push(`**/${dirPattern}/**`);
                    } else {
                        // If pattern doesn't start with **, add it
                        if (!pattern.startsWith('**/')) {
                            pattern = `**/${pattern}`;
                        }
                        patterns.push(pattern);
                    }
                });

            patterns.forEach(pattern => this.globalIgnorePatterns.add(pattern));
        } catch (error) {
            // .gitignore file doesn't exist or can't be read - that's fine, just continue
            console.log('.gitignore file not found or not readable');
        }
    } catch (error) {
        console.error('Error processing .gitignore patterns:', error);
    }
  }

  /**
   * Initialize the file and folder cache
   */
  public async initialize(): Promise<void> {
    if (!this.effectiveExcludedDirsInitialized) {
        await this.updateEffectiveExcludedDirs();
        this.effectiveExcludedDirsInitialized = true;
    }

    if (!this.cacheInitialized) {
        this.cacheInitialized = true;
        await this.refreshCache();
    }
  }

  /**
   * Get all workspace files (cached)
   */
  public async getWorkspaceFiles(): Promise<WorkspaceFile[]> {
    await this.ensureCacheInitialized();
    return Array.from(this.filePathCache.values());
  }


  /**
   * Get all workspace folders (cached)
   */
  public async getWorkspaceFolders(): Promise<WorkspaceFolder[]> {
    await this.ensureCacheInitialized();
    const folders = Array.from(this.folderPathCache.values());
    
    // Get workspace root folder if available
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const rootFolder = workspaceFolders[0];
      
      folders.push(
        {
          uri: rootFolder.uri.toString(),
          path: rootFolder.uri.fsPath,
          name: rootFolder.name,
          relativePath: rootFolder.name
        }
      );
    }
    return folders;
  }

  /**
   * Read file content
   * @param filePath Path to the file
   */
  public async readFile(filePath: string): Promise<string> {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      return new TextDecoder().decode(content);
    } catch (error) {
      console.error("Error reading file:", error);
      return "";
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this._onCacheChanged.dispose();
  }

  /**
   * Refresh the file and folder caches (public method for external use)
   * @returns Promise that resolves when refresh is complete
   */
  public async refreshCache(): Promise<void> {
    await this._refreshCache();
    // Notify listeners that the cache has changed
    this._onCacheChanged.fire();
  }

  /**
   * Internal implementation of cache refresh
   */
  private async _refreshCache(): Promise<void> {
    if (!this.effectiveExcludedDirsInitialized) {
        await this.updateEffectiveExcludedDirs();
        this.effectiveExcludedDirsInitialized = true;
    }

    try {
      // Clear existing caches
      this.filePathCache.clear();
      this.folderPathCache.clear();
      
      // Get all workspace folders
      const workspaceFolders = vscode.workspace.workspaceFolders;
      
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return;
      }
      
      // Process each workspace folder
      for (const folder of workspaceFolders) {
        // Get all entries using the shared method
        const entries = await this._getFilesWithGlob(folder.uri.fsPath, false, Array.from(this.globalIgnorePatterns));

        // Process each entry
        for (const entry of entries) {
          const entryPath = entry.path;
          const uri = vscode.Uri.file(entryPath);
          
          const relativePath = vscode.workspace.asRelativePath(entryPath);
          
          // If it's a directory
          if (entry.stats?.isDirectory()) {
            const folder: WorkspaceFolder = {
              uri: uri.toString(),
              path: entryPath,
              name: path.basename(entryPath),
              relativePath
            };
            this.folderPathCache.set(entryPath, folder);
          } 
          // If it's a file
          else if (entry.stats?.isFile()) {
            // Binary files are already excluded by the glob pattern
            const file: WorkspaceFile = {
              uri: uri.toString(),
              path: entryPath,
              name: path.basename(entryPath),
              relativePath
            };
            this.filePathCache.set(entryPath, file);
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing cache:", error);
      throw error;
    }
  }

  /**
   * Shared private method to get files using fast-glob with standard options
   * @param folderPath Path to search
   * @param onlyFiles Whether to return only files (not directories)
   * @returns Array of file entries with path and stats
   */
  private async _getFilesWithGlob(folderPath: string, onlyFiles: boolean, ignorePatterns: string[]): Promise<Array<{path: string, stats?: any}>> {
    // Use fast-glob to find all entries in the folder
    const globPattern = path.join(folderPath, '**/*');
    return await fg(globPattern, {
      onlyFiles,
      dot: true,
      ignore: ignorePatterns,
      absolute: true,
      stats: true
    });
  }

  /**
   * Check if a file should be excluded
   */
  public isExcludedFile(filePath: string): boolean {
    // Get file name and extension
    const fileExt = path.extname(filePath).toLowerCase();
    
    // Skip binary files
    if (EXCLUDED_FILE_EXTENSIONS.includes(fileExt)) {
      return true;
    }

    // Split path into segments for more accurate matching
    const pathSegments = filePath.split(path.sep).filter(Boolean);
    
    // Check if the file is in an excluded directory
    // Iterate through all path segments except the last one (which is the file name)
    for (let i = 0; i < pathSegments.length - 1; i++) {
      const segment = pathSegments[i];
      if (COMMON_EXCLUDED_DIRS.includes(segment)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if a directory should be excluded
   */
  public isExcludedDirectory(dirPath: string): boolean {
    // Get the directory name (last segment of the path)
    const dirName = path.basename(dirPath);
    
    // Check if it's a hidden directory (starts with .)
    // Only apply this if the setting is enabled
    if (this.excludeHiddenDirectories && dirName.startsWith('.')) {
      return true;
    }
    
    // Split path into segments for more accurate matching
    const pathSegments = dirPath.split(path.sep).filter(Boolean);
    
    // Check if any segment matches the standard excluded directories
    for (const segment of pathSegments) {
      if (COMMON_EXCLUDED_DIRS.includes(segment)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get files from a specific folder with exclusions applied
   * @param folderPath Path to the folder
   * @param onlyFiles Whether to return only files (not directories)
   * @param maxFileSize Maximum file size to include (bytes)
   * @returns Object containing matched entries and any warnings
   */
  public async getFilesFromFolder(folderPath: string, onlyFiles: boolean = true, maxFileSize?: number): Promise<{
    entries: Array<{path: string, stats?: any}>,
    warnings: string[]
  }> {
    const warnings: string[] = [];
    
    try {
      // Use internal method to get all entries
      const entries = await this._getFilesWithGlob(folderPath, onlyFiles, Array.from(this.globalIgnorePatterns));
      
      // Filter by file size if maxFileSize is specified
      if (maxFileSize) {
        const filteredEntries = [];
        for (const entry of entries) {
          if (entry.stats && entry.stats.size > maxFileSize) {
            const warningMsg = `Skipped large file ${path.basename(entry.path)} (${Math.round(entry.stats.size / 1024)}KB)`;
            console.warn(warningMsg);
            warnings.push(warningMsg);
            continue;
          }
          filteredEntries.push(entry);
        }
        return { entries: filteredEntries, warnings };
      }
      
      return { entries, warnings };
    } catch (error) {
      console.error(`Error getting files from folder ${folderPath}:`, error);
      return { entries: [], warnings: [`Error processing folder ${folderPath}: ${error}`] };
    }
  }

  /**
   * Build a file tree structure from a list of file paths
   * @param filePaths Set of file paths to include in the tree
   * @param rootPath Root path for calculating relative paths
   * @returns A tree structure representation of the files
   */
  public buildFileTree(filePaths: Set<string>, rootPath: string): Record<string, any> {
    const tree: Record<string, any> = {};
    
    // Convert absolute paths to relative paths and build the tree
    for (const filePath of filePaths) {
      let relativePath = filePath;
      
      // Convert to relative path if it's an absolute path and within the workspace
      if (path.isAbsolute(filePath) && filePath.startsWith(rootPath)) {
        relativePath = path.relative(rootPath, filePath);
      }
      
      // Split the path and create the tree structure
      const parts = relativePath.split(path.sep);
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
          }
        current = current[part];
        }
  }

    // Sort the tree keys alphabetically
    const sortObjectKeys = (obj: Record<string, any>): Record<string, any> => {
      const sortedObj: Record<string, any> = {};
      
      // Get all keys and sort them alphabetically
      const sortedKeys = Object.keys(obj).sort();
    
      // Create a new object with sorted keys
    for (const key of sortedKeys) {
        sortedObj[key] = typeof obj[key] === 'object' && obj[key] !== null
          ? sortObjectKeys(obj[key])  // Recursively sort child objects
          : obj[key];
    }
    
      return sortedObj;
    };
    
    return sortObjectKeys(tree);
  }

  /**
   * Render a tree structure to a string representation
   * @param node The tree node to render
   * @param level The current indentation level
   * @param prefix The prefix for the current line
   * @returns A string representation of the tree
   */
  public renderTree(node: Record<string, any>, level: number = 0, prefix = ''): string {
    let result = '';
    const entries = Object.entries(node);
    
    if (entries.length === 0) {
      return result;
    }
    
    entries.forEach(([name, children], index) => {
      const isLast = index === entries.length - 1;
      const linePrefix = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';
      
      // Add the current node
      result += `${prefix}${linePrefix}${name}\n`;
      
      // Process children
      if (Object.keys(children).length > 0) {
        result += this.renderTree(children, level + 1, `${prefix}${childPrefix}`);
      }
    });
    
    return result;
  }

  /**
   * Ensure the cache is initialized
   */
  private async ensureCacheInitialized(): Promise<void> {
    if (!this.cacheInitialized) {
      await this.initialize();
    }
  }
}
