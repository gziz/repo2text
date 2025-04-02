import * as vscode from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { WorkspaceFileManager } from "../utils/WorkspaceFileManager";
import { WebviewMessageHandler } from "../utils/WebviewMessageHandler";
import { PromptGenerator } from "../utils/PromptGenerator";

/**
 * Provider for the Repo2Prompt sidebar view
 */
export class ViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "repo2promptView";

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _fileManager: WorkspaceFileManager;
  private _messageHandler?: WebviewMessageHandler;
  private _promptGenerator: PromptGenerator;  

  constructor(
    private readonly extensionUri: vscode.Uri,
    fileManager: WorkspaceFileManager
  ) {
    this._extensionUri = extensionUri;
    this._fileManager = fileManager;
    this._promptGenerator = new PromptGenerator(fileManager);
    
    // Subscribe to file manager's workspace changed event
    this._fileManager.onCacheChanged(() => {
      // Only refresh the webview if it's visible
      if (this._view?.visible) {
        this._refreshWebviewWorkspaceData();
      }
    });
  }

  /**
   * Clean up resources when extension is deactivated
   */
  public dispose(): void {    
    if (this._messageHandler) {
      this._messageHandler.dispose();
      this._messageHandler = undefined;
    }
    
    this._view = undefined;
  }

  /**
   * Resolve the webview view
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "out"),
        vscode.Uri.joinPath(this._extensionUri, "webview-ui/build")
      ]
    };

    webviewView.webview.html = this._getWebviewContent(webviewView.webview);

    // Initialize message handler with the webview
    this._messageHandler = new WebviewMessageHandler(
      webviewView,
      this._fileManager,
      this._promptGenerator,
      () => this._refreshWebviewWorkspaceData()
    );
    
    // Handle visibility changes
    webviewView.onDidChangeVisibility(() => this._handleVisibilityChange(webviewView));
    
    // Initialize resources when first created, but only if the webview is visible
    if (webviewView.visible) {
      this._initializeResources();
    }
  }

  /**
   * Method to show the settings view in the webview
   */
  public showSettingsView(): void {
    if (this._view) {
      this._view.webview.postMessage({
        command: "showSettingsView"
      });
    }
  }

  /**
   * Method to show the main editor view in the webview
   */
  public showEditorView(): void {
    if (this._view) {
      this._view.webview.postMessage({
        command: "showEditorView"
      });
    }
  }

  /**
   * Handle webview visibility changes
   */
  private _handleVisibilityChange(webviewView: vscode.WebviewView): void {
    if (webviewView.visible) {
      this._initializeResources();
    }
  }

  /**
   * Initialize resources when webview becomes visible
   */
  private _initializeResources(): void {
    // Initialize if not done already
    this._fileManager.initialize()
      .then(() => this._refreshWebviewWorkspaceData())
      .catch(this._handleCacheError);
  }

  /**
   * Handle cache refresh errors
   */
  private _handleCacheError(err: Error): void {
    // Still try to refresh the webview data even if cache refresh failed
    this._refreshWebviewWorkspaceData();
  }

  /**
   * Refresh both files and folders data in the webview
   */
  private async _refreshWebviewWorkspaceData(): Promise<void> {
    if (!this._view) return;

    try {
      await this._sendWorkspaceFilesToWebview();
      await this._sendWorkspaceFoldersToWebview();
    } catch (error) {
      console.error("Failed to refresh webview data:", error);
    }
  }

  /**
   * Send workspace files to the webview
   */
  private async _sendWorkspaceFilesToWebview(): Promise<void> {
    if (!this._view) return;
    
    try {
      const files = await this._fileManager.getWorkspaceFiles();
      this._view.webview.postMessage({
        command: "workspaceFiles",
        files
      });
    } catch (error) {
      console.error("Error sending workspace files to webview:", error);
    }
  }

  /**
   * Send workspace folders to the webview
   */
  private async _sendWorkspaceFoldersToWebview(): Promise<void> {
    if (!this._view) return;
    
    try {
      const folders = await this._fileManager.getWorkspaceFolders();
      this._view.webview.postMessage({
        command: "workspaceFolders",
        folders
      });
    } catch (error) {
      console.error("Error sending workspace folders to webview:", error);
    }
  }

  /**
   * Get the HTML content for the webview
   */
  private _getWebviewContent(webview: vscode.Webview): string {
    const scriptUri = getUri(webview, this._extensionUri, ["webview-ui", "build", "assets", "index.js"]);
    const styleUri = getUri(webview, this._extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}' ; connect-src ${webview.cspSource};">
          <link rel="stylesheet" type="text/css" href="${styleUri}">
          <title></title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }
}