import * as vscode from 'vscode';
import { ConfigurationManager } from './ConfigurationManager';
import { CONFIG_KEYS, DEFAULT_TEMPLATES } from './constants';

export class TemplateManager {
  // Store the configuration manager instance
  private configManager: ConfigurationManager;
  
  // Constructor doesn't need to take an extension context
  constructor() {
    // Get the configuration manager instance once
    this.configManager = ConfigurationManager.getInstance();
  }

  // Convert TipTap document to string template
  public static documentToString(document: any): string {
    if (!document || !document.content) {
      return '';
    }
    
    let result = '';
    const paragraphs = document.content.length;
    
    for (let i = 0; i < paragraphs; i++) {
      const node = document.content[i];
      if (node.type === 'paragraph') {
        if (!node.content) {
          // Only add newline if it's not the last paragraph
          if (i < paragraphs - 1) {
            result += '\n';
          }
          continue;
        }
        
        for (const inline of node.content) {
          if (inline.type === 'text') {
            result += inline.text || '';
          } else if (inline.type === 'mention' && inline.attrs) {
            result += `{{${inline.attrs.id}}}`;
          }
        }
        
        // Only add newline if it's not the last paragraph
        if (i < paragraphs - 1) {
          result += '\n';
        }
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
    
    // Normalize line endings and split
    const normalizedTemplate = template.replace(/\r\n/g, '\n');
    const lines = normalizedTemplate.split('\n');
    
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
      
      // Always add the paragraph, even if empty (to preserve line breaks)
      result.content.push(paragraph);
    }
    
    return result;
  }
  
  // Load templates from configuration
  public async loadTemplates(): Promise<{
    editorTemplate: string,
    treeViewTemplate: string,
    fileTemplate: string
  }> {
    try {
      // Use the stored configuration manager instance
      // Get template strings from configuration manager
      return {
        editorTemplate: this.configManager.editorTemplateString,
        treeViewTemplate: this.configManager.treeViewTemplateString,
        fileTemplate: this.configManager.fileTemplateString
      };
    } catch (error) {
      // On any error, return default templates
      console.error('Error loading templates, using defaults:', error);
      return {
        editorTemplate: DEFAULT_TEMPLATES.EDITOR_TEMPLATE,
        treeViewTemplate: DEFAULT_TEMPLATES.TREE_VIEW_TEMPLATE,
        fileTemplate: DEFAULT_TEMPLATES.FILE_TEMPLATE
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
  
  // Get default templates
  public static getDefaultTemplates(): {
    editorTemplate: any,
    treeViewTemplate: any,
    fileTemplate: any
  } {
    return {
      editorTemplate: TemplateManager.stringToDocument(DEFAULT_TEMPLATES.EDITOR_TEMPLATE),
      treeViewTemplate: TemplateManager.stringToDocument(DEFAULT_TEMPLATES.TREE_VIEW_TEMPLATE),
      fileTemplate: TemplateManager.stringToDocument(DEFAULT_TEMPLATES.FILE_TEMPLATE)
    };
  }
}