import React from "react";
import { ResetIcon } from "./Icons";
import "./SettingsView.css";
import TemplateEditor, { fileTemplateVariables, promptTemplateVariables } from "./TemplateEditor/TemplateEditor";

// Define settings interface
interface Settings {
  excludeHiddenDirectories: boolean;
  maxFileSizeKB: number;
  promptTemplate: any; // TipTap JSON document
  fileTemplate: any; // TipTap JSON document for file content formatting
}

interface SettingsViewProps {
  onBack: () => void;
  onSave: (settings: Settings) => void;
  settings: Settings | null;
  onResetToDefaults: () => void;
  onUpdateSettings: (settings: Settings) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  onSave,
  settings,
  onResetToDefaults,
  onUpdateSettings,
}) => {
  // Determine if settings are still loading
  const isLoading = settings === null;

  const handleSave = () => {
    if (settings) {
      onSave(settings);
    }
  };

  const handleResetToDefaults = () => {
    // Use the onResetToDefaults handler from props
    onResetToDefaults();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;

    const { name, type, checked, value } = e.target;

    // Create updated settings object
    const updatedSettings = {
      ...settings,
      [name]: type === "checkbox" ? checked : type === "number" ? parseInt(value, 10) : value,
    };

    // Update settings through props
    onUpdateSettings(updatedSettings);
  };

  const handleTemplateChange = (template: any) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      promptTemplate: template,
    };

    onUpdateSettings(updatedSettings);
  };

  const handleFileTemplateChange = (template: any) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      fileTemplate: template,
    };

    onUpdateSettings(updatedSettings);
  };

  // Show loading state while waiting for settings
  if (isLoading) {
    return (
      <div className="settings-container">
        <div className="settings-content loading-container">
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-content">
        <div className="settings-group">
          <h3>Settings</h3>
          <div className="tooltip-container">
            <button
              className="reset-icon-button"
              onClick={handleResetToDefaults}
              title="Reset to default">
              <ResetIcon width="20" height="20" />
              <span className="tooltip-text">Reset settings to default</span>
            </button>
          </div>

          <div className="settings-item-row">
            <div className="settings-item-label-container">
              <label htmlFor="excludeHiddenDirectories" className="settings-item-label">
                Exclude Hidden Directories
              </label>
              <div className="settings-item-description">
                When enabled, directories starting with "." will be excluded (highly recommended).
              </div>
            </div>
            <div className="settings-item-input">
              <input
                type="checkbox"
                id="excludeHiddenDirectories"
                name="excludeHiddenDirectories"
                checked={settings.excludeHiddenDirectories}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="settings-item-row">
            <div className="settings-item-label-container">
              <label htmlFor="maxFileSizeKB" className="settings-item-label">
                Max File Size (KB)
              </label>
              <div className="settings-item-description">
                Files larger than this size will be excluded.
              </div>
            </div>
            <div className="settings-item-input">
              <input
                type="number"
                id="maxFileSizeKB"
                name="maxFileSizeKB"
                value={settings.maxFileSizeKB}
                min="1"
                max="1000"
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        <div className="settings-item-column">
          <div className="settings-item-label-container">
            <label className="settings-item-label">Prompt Template</label>
            <div className="settings-item-description">
              Customize how prompts are formatted. Available: <code>fileMap</code>,{" "}
              <code>fileContents</code>, <code>userText</code>.
            </div>
          </div>
          <div className="template-editor-container">
            <TemplateEditor
              initialContent={settings.promptTemplate}
              onChange={handleTemplateChange}
              variables={promptTemplateVariables}
            />
          </div>
        </div>

        <div className="settings-item-column">
          <div className="settings-item-label-container">
            <label className="settings-item-label">File Content Template</label>
            <div className="settings-item-description">
              Customize how each file is displayed within the prompt. Available:{" "}
              <code>filePath</code>, <code>fileContent</code>.
            </div>
          </div>
          <div className="template-editor-container">
            <TemplateEditor
              initialContent={settings.fileTemplate}
              onChange={handleFileTemplateChange}
              variables={fileTemplateVariables}
            />
          </div>
        </div>
      </div>

      <div className="settings-footer">
        <button className="save-button" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
