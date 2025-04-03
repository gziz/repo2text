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
  maxFileSizeMB: number;
  respectGitignore: boolean;
  editorPromptTemplate: any; // TipTap JSON document
  treeViewPromptTemplate: any; // TipTap JSON document
  fileTemplate: any; // TipTap JSON document for file content formatting
}

export interface TreeNode {
  id: string;                   // Typically the full path
  name: string;
  path: string;
  type: "file" | "folder";
  children: TreeNode[];
  level: number;
  expanded: boolean;
  selected: boolean;
  indeterminate: boolean;
}