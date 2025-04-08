import * as vscode from "vscode";
import * as path from "path";
import { WorkspaceFileManager } from "./WorkspaceFileManager";
import { TemplateManager } from './TemplateManager';
import { BYTES_PER_MB, PRECISION_FACTOR } from './constants';
import { ConfigurationManager } from './ConfigurationManager';

/**
 * Handles the generation of prompts with context from the workspace
 */
export class PromptGenerator {
  private _fileManager: WorkspaceFileManager;
  private _templateManager: TemplateManager;
  private _configManager: ConfigurationManager;

  constructor(fileManager: WorkspaceFileManager) {
    this._fileManager = fileManager;
    this._templateManager = new TemplateManager();
    this._configManager = ConfigurationManager.getInstance();
  }

  // Add static factory method here too
  public static async create(): Promise<PromptGenerator> {
    const fileManager = await WorkspaceFileManager.create();
    return new PromptGenerator(fileManager);
  }

  // Generate a prompt with file context based on the mentioned files/folders
  public async generatePrompt(
    userText: string, 
    mentions: Array<{id: string, label: string, type: string, uniqueId?: string}>,
    options: { source?: 'editor' | 'treeView' } = { source: 'editor' }
  ): Promise<string> {
    try {
      // Get workspace root path
      const workspaceRootPath = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || '';
      
      // Process files and get both the file map and contents in one pass
      const { fileMapStr, fileContents } = await this._processFiles(mentions, workspaceRootPath);
      
      // Format the final prompt with the appropriate template
      const prompt = await this._formatPrompt(fileMapStr, fileContents, userText, options.source);
      return prompt;

    } catch (error) {
      console.error("Error generating prompt:", error);
      throw error;
    }
  }

  // Process files to generate both file map and file contents in a single pass
  private async _processFiles(mentions: Array<{id: string, label: string, type: string, uniqueId?: string}>, rootPath: string): 
    Promise<{fileMapStr: string, fileContents: Array<{path: string, content: string}>}> {
    try {
      // Track all file paths to include
      const allFilePaths = new Set<string>();
      
      // First add all directly mentioned files
      for (const mention of mentions) {
        if (mention.type === 'file') {
          allFilePaths.add(mention.id);
        } else if (mention.type === 'folder') {
          // For folders, add the folder itself
          allFilePaths.add(mention.id);
          
          // And then recursively get all files inside the folder
          await this._collectFilesInFolder(mention.id, allFilePaths);
        }
      }
      
      if (allFilePaths.size === 0) {
        return { fileMapStr: '', fileContents: [] };
      }
      
      // Build and render the file tree for the file map
      const tree = this._fileManager.buildFileTree(allFilePaths, rootPath);
      const fileMapStr = this._fileManager.renderTree(tree);
      
      // Extract ordered file paths from the tree
      const orderedFilePaths: string[] = [];
      const extractOrderedPaths = (node: Record<string, any>, currentPath: string = '') => {
        // Sort keys to ensure consistent ordering
        const sortedKeys = Object.keys(node).sort();
        
        for (const key of sortedKeys) {
          // Always use forward slashes for paths, regardless of platform
          const newPath = currentPath ? `${currentPath}/${key}` : key;
          
          // Add path if it's a file (empty object in the tree)
          if (Object.keys(node[key]).length === 0) {
            // Convert to absolute path if needed
            let absolutePath;
            if (path.isAbsolute(newPath)) {
              absolutePath = newPath;
            } else {
              // Join path and normalize for platform compatibility
              absolutePath = path.join(rootPath, newPath);
            }
            orderedFilePaths.push(absolutePath);
          }
          
          // Recursively process subdirectories
          extractOrderedPaths(node[key], newPath);
        }
      };
      
      extractOrderedPaths(tree);
      
      // Now process the files to get their contents
      const processedPaths = new Set<string>();
      const fileContents: Array<{path: string, content: string}> = [];
      const warnings: string[] = [];
      
      // Process file paths in parallel using Promise.all while preserving order
      await Promise.all(
        orderedFilePaths.map(async (filePath) => {
          // Create a temporary array to hold this file's content
          const tempContents: Array<{path: string, content: string}> = [];
          await this._processFileForContent(filePath, processedPaths, tempContents);
          
          // If content was added, copy it to the main fileContents array
          if (tempContents.length > 0) {
            fileContents.push(tempContents[0]);
          }
        })
      );
      
      // Process any remaining files from folders in parallel
      const folderMentions = mentions.filter(mention => mention.type === 'folder');
      if (folderMentions.length > 0) {
        await Promise.all(
          folderMentions.map(mention => 
            this._processFilesInFolder(mention.id, processedPaths, fileContents, warnings)
          )
        );
      }
      
      // Add warnings as special comment file if there are any
      if (warnings.length > 0) {
        fileContents.push({
          path: "_system/warnings.txt",
          content: "```\n" + warnings.join("\n") + "\n```"
        });
      }
      
      return { fileMapStr, fileContents };
      
    } catch (error) {
      console.error("Error processing files:", error);
      return { fileMapStr: '', fileContents: [] };
    }
  }

  // Helper method to collect all files in a folder recursively
  private async _collectFilesInFolder(folderPath: string, filePaths: Set<string>): Promise<void> {
    try {
      // Skip if folder would be excluded
      if (this._fileManager.isExcludedDirectory(folderPath)) {
        return;
      }
      
      // Use the FileManager to get files
      const { entries } = await this._fileManager.getFilesFromFolder(folderPath, true);
      
      // Add each file to the set
      for (const entry of entries) {
        filePaths.add(entry.path);
      }
    } catch (error) {
      console.error(`Error collecting files from folder ${folderPath}:`, error);
    }
  }

  // Helper method to process all files in a folder recursively
  private async _processFilesInFolder(folderPath: string, processedPaths: Set<string>, fileContents: Array<{path: string, content: string}>, warnings: string[] = []): Promise<void> {
    try {
      // Skip if folder would be excluded
      if (this._fileManager.isExcludedDirectory(folderPath)) {
        return;
      }
      
      // Get maximum file size from configuration manager
      const maxFileSizeMB = this._configManager.maxFileSizeMB;
      const maxFileSize = maxFileSizeMB * BYTES_PER_MB; // Convert MB to bytes
      
      // Get files from the folder using FileManager
      const { entries, warnings: folderWarnings } = await this._fileManager.getFilesFromFolder(
        folderPath, 
        true, 
        maxFileSize
      );
      
      // Add any warnings
      warnings.push(...folderWarnings);
      
      // Process each file (respecting the processed set to avoid duplicates)
      for (const entry of entries) {
        await this._processFileForContent(entry.path, processedPaths, fileContents);
      }
    } catch (error) {
      console.error(`Error processing folder ${folderPath}:`, error);
    }
  }
  
  // Helper method to process a single file for content extraction
  private async _processFileForContent(filePath: string, processedPaths: Set<string>, fileContents: Array<{path: string, content: string}>): Promise<void> {
    // Skip if we've already processed this file
    if (processedPaths.has(filePath)) {
      return;
    }

    // Skip if file would be excluded
    if (this._fileManager.isExcludedFile(filePath)) {
      return;
    }

    try {
      // Convert to relative path once - use this consistently throughout the method
      const relativePath = vscode.workspace.asRelativePath(filePath);
      
      // Get maximum file size from configuration manager
      const maxFileSizeMB = this._configManager.maxFileSizeMB;
      const maxFileSize = maxFileSizeMB * BYTES_PER_MB; // Convert MB to bytes
      
      // Check file size before reading
      const fileStat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      if (fileStat.size > maxFileSize) {
        fileContents.push({
          path: relativePath,
          content: `\`\`\`\nFile too large (${Math.round(fileStat.size / BYTES_PER_MB * PRECISION_FACTOR) / PRECISION_FACTOR}MB). Max size: ${maxFileSizeMB}MB\n\`\`\``
        });
        processedPaths.add(filePath);
        return;
      }
      
      const content = await this._fileManager.readFile(filePath);
      // Get file extension for syntax highlighting in code blocks
      const extension = path.extname(filePath).slice(1);
      
      fileContents.push({
        path: relativePath,
        content: content ? `\`\`\`${extension}\n${content}\n\`\`\`` : '```\nEmpty file\n```'
      });
      
      // Mark this file as processed
      processedPaths.add(filePath);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      // Also convert error file paths to relative format for consistency
      const relativePath = vscode.workspace.asRelativePath(filePath);
      fileContents.push({
        path: relativePath,
        content: '```\nError reading file\n```'
      });
      
      // Also mark error files as processed to avoid duplicate error messages
      processedPaths.add(filePath);
    }
  }

  // Format the final prompt with file map, contents and user instructions
  private async _formatPrompt(
    fileMap: string, 
    fileContents: Array<{path: string, content: string}>, 
    userText: string,
    source: 'editor' | 'treeView' = 'editor'
  ): Promise<string> {
    // Get template strings from TemplateManager
    const templates = await this._templateManager.loadTemplates();
    
    // Select the right template based on source
    const templateString = source === 'treeView' 
      ? templates.treeViewTemplate 
      : templates.editorTemplate;
    
    // Convert file contents to string format using template
    const fileContentsStr = fileContents
      .map(file => {
        const fileVars = {
          filePath: file.path,
          fileContent: file.content
        };
        return TemplateManager.formatTemplate(templates.fileTemplate, fileVars);
      })
      .join('');
    
    // Format the main template
    const variables = {
      fileMap: fileMap,
      fileContents: fileContentsStr,
      userText: userText
    };
    
    return TemplateManager.formatTemplate(templateString, variables);
  }

  // Public method to get file contents for token counting
  public async getFileContentsForTokenCounting(
    mentions: Array<{id: string, label: string, type: string, uniqueId?: string}>
  ): Promise<Array<{path: string, content: string}>> {
    try {
      // Get workspace root path
      const workspaceRootPath = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || '';
      
      // Use the consolidated method to process files
      const { fileContents } = await this._processFiles(mentions, workspaceRootPath);
      
      return fileContents;
    } catch (error) {
      console.error("Error getting file contents for token counting:", error);
      return [];
    }
  }
} 