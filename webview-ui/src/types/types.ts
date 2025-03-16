export interface WorkspaceFile {
  uri: string;
  path: string;
  name: string;
  relativePath: string;
}

export interface WorkspaceFolder {
  uri: string;
  path: string;
  name: string;
  relativePath: string;
}

export interface MentionItem {
  id: string; // Full path to the file/folder
  label: string; // Display name (file/folder name)
  type: "file" | "folder" | "provider";
  description?: string;
  position?: number; // Position in the document for tracking
}

// Define all possible views
export type View = "editor" | "settings";

// Define settings interface
export interface Settings {
  excludeHiddenDirectories: boolean;
  maxFileSizeKB: number;
  promptTemplate: any; // TipTap JSON document
  fileTemplate: any; // TipTap JSON document for file content formatting
}
