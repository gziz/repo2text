import { commands, ExtensionContext, window } from "vscode";
import { ViewProvider } from "./panels/ViewProvider";
import { WorkspaceFileManager } from "./utils/WorkspaceFileManager";
import { DEFAULT_PROMPT_TEMPLATE, DEFAULT_FILE_TEMPLATE } from "./utils/defaultTemplate";

// Export the default template for use in other parts of the extension
export { DEFAULT_PROMPT_TEMPLATE, DEFAULT_FILE_TEMPLATE };

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
  const repo2promptViewProvider = new ViewProvider(context.extensionUri, workspaceFileManager);
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      ViewProvider.viewType,
      repo2promptViewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );
  
  // Register the settings command
  context.subscriptions.push(
    commands.registerCommand("repo2prompt.openConfigPage", () => {
      // Send a message to the webview to switch to the settings view
      repo2promptViewProvider.showSettingsView();
    })
  );
  
  // Register the return to main view command
  context.subscriptions.push(
    commands.registerCommand("repo2prompt.openEditorView", () => {
      // Send a message to the webview to switch back to the main view
      repo2promptViewProvider.showEditorView();
    })
  );

  // Register the refresh workspace command
  context.subscriptions.push(
    commands.registerCommand("repo2prompt.refreshWorkspace", async () => {
      try {
        await workspaceFileManager.refreshCache();
        // Inform the user that the workspace has been refreshed
        window.showInformationMessage("Workspace refreshed successfully");
      } catch (error) {
        window.showErrorMessage(`Failed to refresh workspace: ${error}`);
      }
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}