import * as vscode from "vscode";
import * as path from "path";
import * as fg from "fast-glob";
import { COMMON_EXCLUDED_DIRS, BINARY_FILE_EXTENSIONS } from "./constants";
import { WorkspaceFolder, WorkspaceFile } from "./types";

/**
 * Manages file system operations and caching for the repo2prompt extension
 */
export class WorkspaceFileManager {
  // Cache of workspace files (paths only, not content)
  private filePathCache: Map<string, WorkspaceFile> = new Map();
  // Cache of workspace folders (paths only)
  private folderPathCache: Map<string, WorkspaceFolder> = new Map();
  // Disposables for file system watchers
  private heavyFileWatcherDisposables: vscode.Disposable[] = [];
  // Lightweight watcher that persists even when webview is hidden
  private lightFileWatcherDisposables: vscode.Disposable[] = [];
  // Flag to track if changes occurred while webview was hidden
  private hasChangedSinceLastView: boolean = false;
  // Flag to track if the cache is initialized
  private cacheInitialized: boolean = false;
  // Event emitters for cache changes
  private _onCacheChanged = new vscode.EventEmitter<void>();
  // Effective excluded directories (combining static list with configuration)
  private excludeHiddenDirectories: boolean = true;

  private globalIgnorePatterns: string[] = [];

  // Event that can be subscribed to
  public readonly onCacheChanged = this._onCacheChanged.event;

  constructor() {
    // Initialize the effective excluded directories
    this.updateEffectiveExcludedDirs();
    // Don't automatically start watching file system changes
    // We'll do this explicitly when the webview is visible
    
    // Set up persistent lightweight watchers
    this.setupLightFileSystemWatchers();
    
    // Watch for configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('repo2prompt.excludeHiddenDirectories')) {
        this.updateEffectiveExcludedDirs();
      }
    });
  }

  /**
   * Update the effective excluded directories based on current configuration
   */
  private updateEffectiveExcludedDirs(): void {
    // Check if we should exclude hidden directories
    this.excludeHiddenDirectories = vscode.workspace.getConfiguration('repo2prompt').get('excludeHiddenDirectories', true);
    this.globalIgnorePatterns = [
      ...COMMON_EXCLUDED_DIRS.map(dir => `**/${dir}/**`),
      ...BINARY_FILE_EXTENSIONS.map(ext => `**/*${ext}`)
    ];
    if (this.excludeHiddenDirectories) {
      this.globalIgnorePatterns.push('**/.*/**');
    }
  }

  /**
   * Initialize the file and folder cache
   */
  public async initialize(): Promise<void> {
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
      
      // Add two entries for the root folder with different names
      folders.unshift(
        {
          uri: rootFolder.uri.toString(),
          path: rootFolder.uri.fsPath,
          name: "root",
          relativePath: "./"
        }
      );
      folders.push(
        {
          uri: rootFolder.uri.toString(),
          path: rootFolder.uri.fsPath,
          name: "./",
          relativePath: "./"
        }
      );9
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
    this.heavyFileWatcherDisposables.forEach(d => d.dispose());
    this.heavyFileWatcherDisposables = [];
    this.lightFileWatcherDisposables.forEach(d => d.dispose());
    this.lightFileWatcherDisposables = [];
    this._onCacheChanged.dispose();
  }

  /**
   * Start file system watchers (should be called when webview becomes visible)
   */
  public startHeavyFileSystemWatchers(): void {
    // Only start if not already running
    if (this.heavyFileWatcherDisposables.length === 0) {
      this.setupHeavyFileSystemWatchers();
    }
  }

  /**
   * Stop file system watchers (should be called when webview is hidden)
   */
  public stopHeavyFileSystemWatchers(): void {
    this.heavyFileWatcherDisposables.forEach(d => d.dispose());
    this.heavyFileWatcherDisposables = [];
  }

  /**
   * Check if changes occurred while webview was hidden
   * @returns True if changes occurred, false otherwise
   */
  public hasChanges(): boolean {
    return this.hasChangedSinceLastView;
  }

  /**
   * Reset the change tracker flag after processing changes
   */
  public resetChangeTracker(): void {
    this.hasChangedSinceLastView = false;
  }

  /**
   * Set up lightweight persistent watchers that stay active even when webview is hidden
   */
  private setupLightFileSystemWatchers(): void {
    // Clean up any existing persistent watchers first
    this.lightFileWatcherDisposables.forEach(d => d.dispose());
    this.lightFileWatcherDisposables = [];
    
    // Watch for file creation
    const createWatcher = vscode.workspace.onDidCreateFiles(() => {
      this.hasChangedSinceLastView = true;
    });

    // Watch for file deletion
    const deleteWatcher = vscode.workspace.onDidDeleteFiles(() => {
      this.hasChangedSinceLastView = true;
    });

    // Watch for workspace folder changes
    const folderWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.hasChangedSinceLastView = true;
    });

    this.lightFileWatcherDisposables.push(
      createWatcher,
      deleteWatcher,
      folderWatcher
    );
  }

  /**
   * Refresh the file and folder caches (public method for external use)
   * @returns Promise that resolves when refresh is complete
   */
  public async refreshFileCache(): Promise<void> {
    await this.refreshCache();
    // Reset the change tracker after refreshing
    this.hasChangedSinceLastView = false;
  }

  /**
   * Set up file system watchers to keep the cache updated
   */
  private setupHeavyFileSystemWatchers(): void {
    // Watch for file creation
    const createWatcher = vscode.workspace.onDidCreateFiles(async (event) => {
      await this.handleFileCreation(event.files);
    });

    // Watch for file deletion
    const deleteWatcher = vscode.workspace.onDidDeleteFiles(async (event) => {
      await this.handleFileDeletion(event.files);
    });

    // Watch for workspace folder changes
    const folderWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      await this.refreshCache();
    });

    this.heavyFileWatcherDisposables.push(
      createWatcher,
      deleteWatcher,
      folderWatcher
    );
  }

  /**
   * Handle file creation events
   */
  private async handleFileCreation(files: readonly vscode.Uri[]): Promise<void> {
    let cacheChanged = false;

    for (const uri of files) {
      try {
        const fileStat = await vscode.workspace.fs.stat(uri);
        
        // If directory was created, refresh the whole cache for simplicity
        if (fileStat.type === vscode.FileType.Directory) {
          await this.refreshCache();
          return;
        } 
        // If it's a file and not excluded, add to cache
        else if (fileStat.type === vscode.FileType.File && !this.isExcludedFile(uri.fsPath)) {
          const file: WorkspaceFile = {
            uri: uri.toString(),
            path: uri.fsPath,
            name: path.basename(uri.fsPath),
            relativePath: vscode.workspace.asRelativePath(uri)
          };
          this.filePathCache.set(uri.fsPath, file);
          cacheChanged = true;
        }
      } catch (error) {
        console.error(`Error handling file creation for ${uri.fsPath}:`, error);
      }
    }

    if (cacheChanged) {
      this._onCacheChanged.fire();
    }
  }

  /**
   * Handle file deletion events
   */
  private async handleFileDeletion(files: readonly vscode.Uri[]): Promise<void> {
    let cacheChanged = false;

    for (const uri of files) {
      const uriString = uri.toString();
      
      // Check if it's a folder we have cached
      if (this.folderPathCache.has(uri.fsPath)) {
        this.folderPathCache.delete(uri.fsPath);
        
        // Also remove any files that were in this folder
        const prefix = uriString + '/';
        for (const [filePath, fileInfo] of this.filePathCache.entries()) {
          if (fileInfo.uri.startsWith(prefix)) {
            this.filePathCache.delete(filePath);
          }
        }
        
        // Also remove any subfolders
        for (const [folderPath, folderInfo] of this.folderPathCache.entries()) {
          if (folderInfo.uri.startsWith(prefix)) {
            this.folderPathCache.delete(folderPath);
          }
        }
        
        cacheChanged = true;
      } 
      // Check if it's a file we have cached
      else if (this.filePathCache.has(uri.fsPath)) {
        this.filePathCache.delete(uri.fsPath);
        cacheChanged = true;
      }
    }

    if (cacheChanged) {
      this._onCacheChanged.fire();
    }
  }

  /**
   * Handle file change events
   */
  private async handleFileChange(files: readonly vscode.Uri[]): Promise<void> {
    // For file changes, we just need to make sure the file is in our cache
    // We don't need to re-read content as that's done on demand
    let cacheChanged = false;

    for (const uri of files) {
      if (!this.isExcludedFile(uri.fsPath) && !this.filePathCache.has(uri.fsPath)) {
        try {
          const fileStat = await vscode.workspace.fs.stat(uri);
          
          if (fileStat.type === vscode.FileType.File) {
            const file: WorkspaceFile = {
              uri: uri.toString(),
              path: uri.fsPath,
              name: path.basename(uri.fsPath),
              relativePath: vscode.workspace.asRelativePath(uri)
            };
            this.filePathCache.set(uri.fsPath, file);
            cacheChanged = true;
          }
        } catch (error) {
          console.error(`Error handling file change for ${uri.fsPath}:`, error);
        }
      }
    }

    if (cacheChanged) {
      this._onCacheChanged.fire();
    }
  }

  /**
   * Refresh the file and folder caches by scanning the workspace folders using fast-glob
   */
  private async refreshCache(): Promise<void> {
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
        const startTime = Date.now();
      
        // Get all entries using the shared method
        const entries = await this._getFilesWithGlob(folder.uri.fsPath, false, this.globalIgnorePatterns);

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
      
      this.cacheInitialized = true;
      
      // Notify subscribers that workspace files have changed
      this._onCacheChanged.fire();
      
    } catch (error) {
      console.error("Error refreshing file cache:", error);
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
    if (BINARY_FILE_EXTENSIONS.includes(fileExt)) {
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
      const entries = await this._getFilesWithGlob(folderPath, onlyFiles, this.globalIgnorePatterns);
      
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
