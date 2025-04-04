import * as vscode from 'vscode';

export class TemplateManager {
  // Default templates
  private static readonly DEFAULT_EDITOR_TEMPLATE = 
    "<file_map>\n{{fileMap}}\n</file_map>\n\n<file_contents>\n{{fileContents}}\n</file_contents>\n\n<user>\n{{userText}}\n</user>";
  
  private static readonly DEFAULT_TREEVIEW_TEMPLATE = 
    "<file_map>\n{{fileMap}}\n</file_map>\n\n<file_contents>\n{{fileContents}}\n</file_contents>";
  
  private static readonly DEFAULT_FILE_TEMPLATE = 
    "-------------------------\n{{filePath}}\n-------------------------\n{{fileContent}}\n";

  // Constructor doesn't need to take an extension context
  constructor() {
    // No initialization needed
  }

  // Convert TipTap document to string template
  public static documentToString(document: any): string {
    if (!document || !document.content) {
      return '';
    }
    
    let result = '';
    for (const node of document.content) {
      if (node.type === 'paragraph') {
        if (!node.content) {
          result += '\n';
          continue;
        }
        
        for (const inline of node.content) {
          if (inline.type === 'text') {
            result += inline.text || '';
          } else if (inline.type === 'mention' && inline.attrs) {
            result += `{{${inline.attrs.id}}}`;
          }
        }
        result += '\n';
      }
    }
    
    return result;
  }
  
  // Convert string template to TipTap document
  public static stringToDocument(template: string): any {
    // If template is empty or undefined, use a default empty document
    if (!template) {
      return {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      };
    }
    
    const result = {
      type: 'doc',
      content: [] as any[]
    };
    
    const lines = template.split('\n');
    
    for (const line of lines) {
      const paragraph: any = {
        type: 'paragraph',
        content: []
      };
      
      // Parse the line for {{variable}} patterns
      let currentIndex = 0;
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      
      while ((match = regex.exec(line)) !== null) {
        // Add any text before the variable
        if (match.index > currentIndex) {
          const textBefore = line.substring(currentIndex, match.index);
          if (textBefore) {
            paragraph.content.push({
              type: 'text',
              text: textBefore
            });
          }
        }
        
        // Add the variable as a mention
        paragraph.content.push({
          type: 'mention',
          attrs: {
            id: match[1],
            label: match[1]
          }
        });
        
        currentIndex = match.index + match[0].length;
      }
      
      // Add any remaining text
      if (currentIndex < line.length) {
        const remainingText = line.substring(currentIndex);
        if (remainingText) {
          paragraph.content.push({
            type: 'text',
            text: remainingText
          });
        }
      }
      
      // Only add the paragraph if it has content or if it's an empty line
      if (paragraph.content.length > 0 || lines.length > 1) {
        result.content.push(paragraph);
      }
    }
    
    return result;
  }
  
  // Add the missing loadTemplates method
  public async loadTemplates(): Promise<{
    editorTemplate: string,
    treeViewTemplate: string,
    fileTemplate: string
  }> {
    try {
      const config = vscode.workspace.getConfiguration('repotext');
      
      // Get settings values with defaults if not set
      const editorTemplate = config.get<string>('editorTemplateString');
      const treeViewTemplate = config.get<string>('treeViewTemplateString');
      const fileTemplate = config.get<string>('fileTemplateString');
      
      // Return templates, using defaults for any that are empty
      return {
        editorTemplate: editorTemplate || TemplateManager.DEFAULT_EDITOR_TEMPLATE,
        treeViewTemplate: treeViewTemplate || TemplateManager.DEFAULT_TREEVIEW_TEMPLATE,
        fileTemplate: fileTemplate || TemplateManager.DEFAULT_FILE_TEMPLATE
      };
    } catch (error) {
      // On any error, return default templates
      console.error('Error loading templates, using defaults:', error);
      return {
        editorTemplate: TemplateManager.DEFAULT_EDITOR_TEMPLATE,
        treeViewTemplate: TemplateManager.DEFAULT_TREEVIEW_TEMPLATE,
        fileTemplate: TemplateManager.DEFAULT_FILE_TEMPLATE
      };
    }
  }
  
  // Format template with variables
  public static formatTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }
  
  // Add static method to get default templates
  public static getDefaultTemplates(): {
    editorTemplate: any,
    treeViewTemplate: any,
    fileTemplate: any
  } {
    return {
      editorTemplate: TemplateManager.stringToDocument(TemplateManager.DEFAULT_EDITOR_TEMPLATE),
      treeViewTemplate: TemplateManager.stringToDocument(TemplateManager.DEFAULT_TREEVIEW_TEMPLATE),
      fileTemplate: TemplateManager.stringToDocument(TemplateManager.DEFAULT_FILE_TEMPLATE)
    };
  }
} 