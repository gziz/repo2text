import * as vscode from 'vscode';
import { DEFAULT_MAX_FILE_SIZE_MB, CONFIG_KEYS, DEFAULT_TEMPLATES } from './constants';

/**
 * Centralized manager for all extension configuration settings
 * Provides a single point of access for configuration values and handles change events
 */
export class ConfigurationManager {
  // Configuration values
  private _excludeHiddenDirectories: boolean = false;
  private _respectGitignore: boolean = true;
  private _maxFileSizeMB: number = DEFAULT_MAX_FILE_SIZE_MB;
  
  // Template strings
  private _editorTemplateString: string = DEFAULT_TEMPLATES.EDITOR_TEMPLATE;
  private _treeViewTemplateString: string = DEFAULT_TEMPLATES.TREE_VIEW_TEMPLATE;
  private _fileTemplateString: string = DEFAULT_TEMPLATES.FILE_TEMPLATE;
  
  // Event emitters for configuration changes
  private _onConfigurationChanged = new vscode.EventEmitter<void>();
  public readonly onConfigurationChanged = this._onConfigurationChanged.event;
  
  // Singleton instance
  private static _instance: ConfigurationManager;
  
  /**
   * Get the singleton instance of ConfigurationManager
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager._instance) {
      ConfigurationManager._instance = new ConfigurationManager();
    }
    return ConfigurationManager._instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Load initial configuration
    this.loadConfiguration();
    
    // Watch for configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('repotext')) {
        this.loadConfiguration();
        this._onConfigurationChanged.fire();
      }
    });
  }
  
  /**
   * Load all configuration values
   */
  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('repotext');
    
    // Load basic settings
    this._excludeHiddenDirectories = config.get<boolean>(CONFIG_KEYS.EXCLUDE_HIDDEN_DIRS, false);
    this._respectGitignore = config.get<boolean>(CONFIG_KEYS.RESPECT_GITIGNORE, true);
    this._maxFileSizeMB = config.get<number>(CONFIG_KEYS.MAX_FILE_SIZE_MB, DEFAULT_MAX_FILE_SIZE_MB);
    
    // Load template strings
    const editorTemplate = config.get<string>(CONFIG_KEYS.EDITOR_TEMPLATE_STRING);
    const treeViewTemplate = config.get<string>(CONFIG_KEYS.TREE_VIEW_TEMPLATE_STRING);
    const fileTemplate = config.get<string>(CONFIG_KEYS.FILE_TEMPLATE_STRING);
    
    // Use defaults if values are not set
    this._editorTemplateString = editorTemplate || DEFAULT_TEMPLATES.EDITOR_TEMPLATE;
    this._treeViewTemplateString = treeViewTemplate || DEFAULT_TEMPLATES.TREE_VIEW_TEMPLATE;
    this._fileTemplateString = fileTemplate || DEFAULT_TEMPLATES.FILE_TEMPLATE;
  }
  
  /**
   * Get whether to exclude hidden directories
   */
  public get excludeHiddenDirectories(): boolean {
    return this._excludeHiddenDirectories;
  }
  
  /**
   * Get whether to respect gitignore patterns
   */
  public get respectGitignore(): boolean {
    return this._respectGitignore;
  }
  
  /**
   * Get maximum file size in MB
   */
  public get maxFileSizeMB(): number {
    return this._maxFileSizeMB;
  }
  
  /**
   * Get editor template string
   */
  public get editorTemplateString(): string {
    return this._editorTemplateString;
  }
  
  /**
   * Get tree view template string
   */
  public get treeViewTemplateString(): string {
    return this._treeViewTemplateString;
  }
  
  /**
   * Get file template string
   */
  public get fileTemplateString(): string {
    return this._fileTemplateString;
  }
  
  /**
   * Update a configuration value
   * @param key Configuration key
   * @param value New value
   */
  public async updateConfiguration<T>(key: string, value: T): Promise<void> {
    const config = vscode.workspace.getConfiguration('repotext');
    await config.update(key, value, vscode.ConfigurationTarget.Global);
    // Configuration will be reloaded via the change event
  }
}
