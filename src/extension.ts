import { commands, ExtensionContext, window } from "vscode";
import { ViewProvider } from "./panels/ViewProvider";
import { WorkspaceFileManager } from "./utils/WorkspaceFileManager";
import { ConfigurationManager } from "./utils/ConfigurationManager";

// Create a singleton instance of the WorkspaceFileManager
export let workspaceFileManager: WorkspaceFileManager;

export function activate(context: ExtensionContext) {
  // Initialize the ConfigurationManager first (it's a singleton)
  ConfigurationManager.getInstance();
  
  // Initialize the WorkspaceFileManager
  workspaceFileManager = new WorkspaceFileManager();
  
  // Register the workspace file manager to be disposed when the extension is deactivated
  context.subscriptions.push({
    dispose: () => {
      workspaceFileManager.dispose();
    }
  });

  // Register the sidebar view provider
  const repotextViewProvider = new ViewProvider(context.extensionUri, workspaceFileManager);
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      ViewProvider.viewType,
      repotextViewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );
  
  // Register the refresh workspace command
  context.subscriptions.push(
    commands.registerCommand("repotext.refreshWorkspace", async () => {
      try {
        await workspaceFileManager.refreshCache();
      } catch (error) {
        window.showErrorMessage(`Failed to refresh workspace: ${error}`);
      }
    })
  );

  // Register the settings command
  context.subscriptions.push(
    commands.registerCommand("repotext.openConfigPage", () => {
      // Send a message to the webview to switch to the settings view
      repotextViewProvider.showSettingsView();
    })
  );
  
  // Register the return to main view command
  context.subscriptions.push(
    commands.registerCommand("repotext.openEditorView", () => {
      // Send a message to the webview to switch back to the main view
      repotextViewProvider.showEditorView();
    })
  );

}

// This method is called when your extension is deactivated
export function deactivate() {}