import { commands, ExtensionContext, window } from "vscode";
import { ViewProvider } from "./panels/ViewProvider";
import { WorkspaceFileManager } from "./utils/WorkspaceFileManager";

// Create a singleton instance of the WorkspaceFileManager
export let workspaceFileManager: WorkspaceFileManager;

export function activate(context: ExtensionContext) {
  // Initialize the WorkspaceFileManager
  workspaceFileManager = new WorkspaceFileManager();
  
  // Register the workspace file manager to be disposed when the extension is deactivated
  context.subscriptions.push({
    dispose: () => {
      workspaceFileManager.dispose();
    }
  });

  // Register the sidebar view provider
  const repo2textViewProvider = new ViewProvider(context.extensionUri, workspaceFileManager);
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      ViewProvider.viewType,
      repo2textViewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );
  
  // Register the refresh workspace command
  context.subscriptions.push(
    commands.registerCommand("repo2text.refreshWorkspace", async () => {
      try {
        await workspaceFileManager.refreshCache();
      } catch (error) {
        window.showErrorMessage(`Failed to refresh workspace: ${error}`);
      }
    })
  );

  // Register the settings command
  context.subscriptions.push(
    commands.registerCommand("repo2text.openConfigPage", () => {
      // Send a message to the webview to switch to the settings view
      repo2textViewProvider.showSettingsView();
    })
  );
  
  // Register the return to main view command
  context.subscriptions.push(
    commands.registerCommand("repo2text.openEditorView", () => {
      // Send a message to the webview to switch back to the main view
      repo2textViewProvider.showEditorView();
    })
  );

}

// This method is called when your extension is deactivated
export function deactivate() {}