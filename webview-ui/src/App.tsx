import { useEffect, useState } from "react";
import "./App.css";
import SettingsView from "./components/SettingsView";
import TipTapEditor from "./components/TipTapEditor";
import TreeView from "./components/TreeView";
import CollapsibleView from "./components/CollapsibleView";
import { Settings, View, WorkspaceFile, WorkspaceFolder } from "./types/types";
import { vscode } from "./utilities/vscode";

function App() {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [editorContent, setEditorContent] = useState<string>("");
  const [currentView, setCurrentView] = useState<View>("editor");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedItems, setSelectedItems] = useState<(WorkspaceFile | WorkspaceFolder)[]>([]);

  useEffect(() => {
    // Make a single initialization request instead of multiple requestsd
    vscode.postMessage({ command: "initialize" });
    vscode.postMessage({ command: "getSettings" });

    // Set up a listener for messages from the extension
    const messageListener = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "workspaceFiles":
          setFiles(message.files);
          break;
        case "workspaceFolders":
          setFolders(message.folders);
          break;
        case "showSettingsView":
          // Request settings when navigating to settings view
          setCurrentView("settings");
          break;
        case "showEditorView":
          setCurrentView("editor");
          break;
        case "settings":
          // Update settings with the ones from extension
          setSettings(message.settings);
          break;
        case "defaultSettings":
          // Update settings with the default ones from extension
          setSettings(message.settings);
          break;
      }
    };

    window.addEventListener("message", messageListener);

    return () => {
      window.removeEventListener("message", messageListener);
    };
  }, []);

  // Handle editor content updates
  const handleEditorUpdate = (html: string) => {
    setEditorContent(html);
  };

  // Handle selection change in tree view
  const handleSelectionChange = (items: (WorkspaceFile | WorkspaceFolder)[]) => {
    setSelectedItems(items);
  };

  // Handle back to editor navigation
  const handleBackToEditor = () => {
    setCurrentView("editor");
  };

  // Handle settings save
  const handleSaveSettings = (updatedSettings: Settings) => {
    setSettings(updatedSettings);
    vscode.postMessage({
      command: "saveSettings",
      settings: updatedSettings,
    });
  };

  // Handle reset to defaults
  const handleResetToDefaults = () => {
    // Request default templates from VS Code side
    vscode.postMessage({ command: "getDefaultSettings" });
  };

  // Handle settings update
  const handleUpdateSettings = (updatedSettings: Settings) => {
    setSettings(updatedSettings);
  };

  // Render the editor or settings view based on the current view state
  const renderCurrentView = () => {
    switch (currentView) {
      case "settings":
        return (
          <div style={{ padding: "8px" }}>
            <SettingsView
              settings={settings}
              onSave={handleSaveSettings}
              onBack={handleBackToEditor}
              onResetToDefaults={handleResetToDefaults}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        );
      case "editor":
        return (
          <div className="prompt-main-section">
            <CollapsibleView title="EDITOR" defaultExpanded={true}>
              <div className="editor-container-wrapper">
                <TipTapEditor
                  workspaceFiles={files}
                  workspaceFolders={folders}
                  onUpdate={handleEditorUpdate}
                  initialContent={editorContent}
                />
              </div>
            </CollapsibleView>
            
            <CollapsibleView title="FILE TREE" defaultExpanded={true} badge={selectedItems.length}>
              <div className="tree-view-container-wrapper">
                <TreeView
                  workspaceFiles={files}
                  workspaceFolders={folders}
                  selectedItems={selectedItems}
                  onSelectionChange={handleSelectionChange}
                />
              </div>
            </CollapsibleView>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="app-container">{renderCurrentView()}</div>;
}

export default App;
