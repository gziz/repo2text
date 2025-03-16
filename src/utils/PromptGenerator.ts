import * as vscode from "vscode";
import * as path from "path";
import { WorkspaceFileManager } from "./WorkspaceFileManager";
import { DEFAULT_PROMPT_TEMPLATE, DEFAULT_FILE_TEMPLATE } from './defaultTemplate';

/**
 * Handles the generation of prompts with context from the workspace
 */
export class PromptGenerator {
  private _fileManager: WorkspaceFileManager;

  constructor(fileManager: WorkspaceFileManager) {
    this._fileManager = fileManager;
  }

  // Generate a prompt with file context based on the mentioned files/folders
  public async generatePrompt(userText: string, mentions: Array<{id: string, label: string, type: string, uniqueId?: string}>): Promise<string> {
    try {
      // Get workspace root path
      const workspaceRootPath = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || '';
      
      // Create file map and get ordered file paths
      const { fileMapStr, orderedFilePaths } = await this._generateFileMap(mentions, workspaceRootPath);
      
      // Generate file contents using the ordered paths
      const fileContentsStr = await this._generateFileContentSection(mentions, orderedFilePaths);
      
      // Format the final prompt
      const prompt = this._formatPrompt(fileMapStr, fileContentsStr, userText);
      return prompt;

    } catch (error) {
      console.error("Error generating prompt:", error);
      throw error;
    }
  }

  // Generate a file map showing the structure of the mentioned files/folders
  private async _generateFileMap(mentions: Array<{id: string, label: string, type: string}>, rootPath: string): Promise<{fileMapStr: string, orderedFilePaths: string[]}> {
    try {
      // Track all file paths to include in the map
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
        return { fileMapStr: '', orderedFilePaths: [] };
      }
      
      // Use FileManager to build and render the tree
      const tree = this._fileManager.buildFileTree(allFilePaths, rootPath);
      const fileMapStr = this._fileManager.renderTree(tree)
      
      // Extract ordered file paths from the tree
      const orderedFilePaths: string[] = [];
      const extractOrderedPaths = (node: Record<string, any>, currentPath: string = '') => {
        // Sort keys to ensure consistent ordering
        const sortedKeys = Object.keys(node).sort();
        
        for (const key of sortedKeys) {
          const newPath = currentPath ? `${currentPath}/${key}` : key;
          
          // Add path if it's a file (empty object in the tree)
          if (Object.keys(node[key]).length === 0) {
            // Convert to absolute path if needed
            const absolutePath = path.isAbsolute(newPath) ? newPath : path.join(rootPath, newPath);
            orderedFilePaths.push(absolutePath);
          }
          
          // Recursively process subdirectories
          extractOrderedPaths(node[key], newPath);
        }
      };
      
      extractOrderedPaths(tree);
      
      return { fileMapStr, orderedFilePaths };
    } catch (error) {
      console.error("Error generating file map:", error);
      return { fileMapStr: '', orderedFilePaths: [] };
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
  
  // Extract the contents of mentioned files
  private async _generateFileContentSection(
    mentions: Array<{id: string, label: string, type: string}>, 
    orderedFilePaths: string[] = []
  ): Promise<Array<{path: string, content: string}>> {
    // Create empty file contents array
    const fileContents: Array<{path: string, content: string}> = [];
    // Track processed files to avoid duplicates
    const processedFilePaths = new Set<string>();
    // Track warnings
    const warnings: string[] = [];
    
    // Process files in the specified order if provided
    if (orderedFilePaths.length > 0) {
      // Process files in the exact order they appear in the file map
      for (const filePath of orderedFilePaths) {
        await this._processFileForContent(filePath, processedFilePaths, fileContents);
      }
      
      // Process any folders that might contain files not yet processed
      for (const mention of mentions) {
        if (mention.type === 'folder') {
          await this._processFilesInFolder(mention.id, processedFilePaths, fileContents, warnings);
        }
      }
    } else {
      // Fall back to old method if no orderedFilePaths provided
      for (const mention of mentions) {
        if (mention.type === 'file') {
          await this._processFileForContent(mention.id, processedFilePaths, fileContents);
        } else if (mention.type === 'folder') {
          await this._processFilesInFolder(mention.id, processedFilePaths, fileContents, warnings);
        }
      }
    }
    
    // Add warnings as special comment file if there are any
    if (warnings.length > 0) {
      fileContents.push({
        path: "_system/warnings.txt",
        content: "```\n" + warnings.join("\n") + "\n```"
      });
    }
    
    return fileContents;
  }

  // Helper method to process all files in a folder recursively
  private async _processFilesInFolder(folderPath: string, processedPaths: Set<string>, fileContents: Array<{path: string, content: string}>, warnings: string[] = []): Promise<void> {
    try {
      // Skip if folder would be excluded
      if (this._fileManager.isExcludedDirectory(folderPath)) {
        return;
      }
      
      // Get maximum file size from configuration
      const configuration = vscode.workspace.getConfiguration('repo2prompt');
      const maxFileSizeKB = configuration.get<number>('maxFileSizeKB', 1000);
      const maxFileSize = maxFileSizeKB * 1024; // Convert KB to bytes
      
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
      // Get maximum file size from configuration
      const configuration = vscode.workspace.getConfiguration('repo2prompt');
      const maxFileSizeKB = configuration.get<number>('maxFileSizeKB', 100);
      const maxFileSize = maxFileSizeKB * 1024; // Convert KB to bytes
      
      // Check file size before reading
      const fileStat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      if (fileStat.size > maxFileSize) {
        fileContents.push({
          path: vscode.workspace.asRelativePath(filePath),
          content: `\`\`\`\nFile too large (${Math.round(fileStat.size / 1024)}KB). Max size: ${maxFileSizeKB}KB\n\`\`\``
        });
        processedPaths.add(filePath);
        return;
      }
      
      const content = await this._fileManager.readFile(filePath);
      // Get file extension for syntax highlighting in code blocks
      const extension = path.extname(filePath).slice(1);
      const relativePath = vscode.workspace.asRelativePath(filePath);
      
      fileContents.push({
        path: relativePath,
        content: content ? `\`\`\`${extension}\n${content}\n\`\`\`` : '```\nEmpty file\n```'
      });
      
      // Mark this file as processed
      processedPaths.add(filePath);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      fileContents.push({
        path: filePath,
        content: '```\nError reading file\n```'
      });
      
      // Also mark error files as processed to avoid duplicate error messages
      processedPaths.add(filePath);
    }
  }

  // Format the final prompt with file map, contents and user instructions
  private _formatPrompt(fileMap: string, fileContents: Array<{path: string, content: string}>, userText: string): string {
    // Get template from settings or use default
    const configuration = vscode.workspace.getConfiguration('repo2prompt');
    const customTemplate = configuration.get<any>('promptTemplate');
    
    // If there's no custom template, use the default formatting
    if (!customTemplate || !customTemplate.type || customTemplate.type !== 'doc') {
      // Use the default template object instead of hardcoded strings
      const defaultTemplate = DEFAULT_PROMPT_TEMPLATE;
      
      return this._formatWithTemplate(defaultTemplate, {
        fileMap,
        fileContents,
        userText
      });
    }
    
    // Format with the custom template
    return this._formatWithTemplate(customTemplate, {
      fileMap,
      fileContents,
      userText
    });
  }
  
  // Helper to format prompt using a template
  private _formatWithTemplate(template: any, variables: { 
    fileMap: string, 
    fileContents: Array<{path: string, content: string}>, 
    userText: string 
  }): string {
    // Get file template from settings or use default
    const configuration = vscode.workspace.getConfiguration('repo2prompt');
    const customFileTemplate = configuration.get<any>('fileTemplate');
    
    // Convert file contents to string format using template
    let fileContentsStr = '';
    for (const file of variables.fileContents) {
      // If there's a custom file template, use it, otherwise use the default
      if (customFileTemplate && customFileTemplate.type && customFileTemplate.type === 'doc') {
        fileContentsStr += this._formatFileWithTemplate(customFileTemplate, {
          filePath: file.path,
          fileContent: file.content
        });
      } else {
        fileContentsStr += this._formatFileWithTemplate(DEFAULT_FILE_TEMPLATE, {
          filePath: file.path,
          fileContent: file.content
        });
      }
    }
    
    // Create variables map for template formatting
    const templateVars = {
      'fileMap': variables.fileMap,
      'fileContents': fileContentsStr,
      'userText': variables.userText
    };
    
    // Use existing formatter functions
    return this._formatDocument(template, templateVars);
  }
  
  // Helper to format a single file using a template
  private _formatFileWithTemplate(template: any, variables: {
    filePath: string,
    fileContent: string
  }): string {
    const templateVars = {
      'filePath': variables.filePath,
      'fileContent': variables.fileContent
    };
    
    // Use the existing document formatter
    return this._formatDocument(template, templateVars);
  }
  
  // Format a TipTap document with variables
  private _formatDocument(doc: any, variables: { [key: string]: string }): string {
    let result = '';
    
    if (!doc.content || !Array.isArray(doc.content)) {
      return result;
    }
    
    // Process each node in the document
    for (const node of doc.content) {
      if (node.type === 'paragraph') {
        // Format the paragraph
        const paragraphText = this._formatParagraph(node, variables);
        
        // Add the paragraph text (which might be empty for blank lines)
        // Always add a newline after each paragraph, even empty ones
        result += paragraphText + '\n';
      }
    }
    
    return result;
  }
  
  // Format a paragraph node
  private _formatParagraph(paragraph: any, variables: { [key: string]: string }): string {
    // If paragraph has no content, return empty string (will still get a newline in formatDocument)
    if (!paragraph.content || !Array.isArray(paragraph.content) || paragraph.content.length === 0) {
      return '';
    }
    
    let result = '';
    
    // Process each inline node
    for (const inline of paragraph.content) {
      if (inline.type === 'text') {
        result += inline.text || '';
      } else if (inline.type === 'mention' && inline.attrs) {
        const variableId = inline.attrs.id;
        if (variables[variableId]) {
          result += variables[variableId];
        }
      }
    }
    
    return result;
  }
} 