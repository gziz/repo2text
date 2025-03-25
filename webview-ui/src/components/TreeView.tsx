import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { vscode } from "../utilities/vscode";
import "./TreeView.css";
import {
  VSCodeButton,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import { 
  ChevronRightIcon, 
  ChevronDownIcon, 
  FolderIcon, 
  FolderOpenedIcon, 
  CollapseAllIcon, 
  CloseIcon 
} from '../icons';
import FileIconComponent from './FileIcon';
import Fuse from "fuse.js";

// -------------------------------------------------------
// Types
// -------------------------------------------------------
export interface WorkspaceFile {
  uri: string;
  path: string;       // Full path ("/Users/.../myFolder/myFile.ts")
  name: string;       // Just the file name ("myFile.ts")
  relativePath: string;
}

export interface WorkspaceFolder {
  uri: string;
  path: string;       // Full path ("/Users/.../myFolder")
  name: string;       // Just the folder name ("myFolder")
  relativePath: string;
}

export interface MentionItem {
  id: string;         // Could be relativePath
  label: string;      // Display name
  type: "file" | "folder" | "provider";
  description?: string;
  position?: number;
}

// TreeNode for our internal hierarchy representation
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

// Props for TreeView
interface TreeViewProps {
  workspaceFiles: WorkspaceFile[];
  workspaceFolders: WorkspaceFolder[];
  /** A set of paths (fullPath or id) that are currently selected */
  selectedPaths: Set<string>;
  /**
   * Called whenever the user changes selection (clicking a checkbox, node text, etc.).
   * You receive a new Set<string> of paths that should be considered selected.
   */
  onSelectionChange: (newPaths: Set<string>) => void;
}

// -------------------------------------------------------
// Utility functions
// -------------------------------------------------------

function getParentPath(fullPath: string): string {
  if (!fullPath.includes("/")) return "";
  const idx = fullPath.lastIndexOf("/");
  if (idx <= 0) return ""; // top-level or single slash
  return fullPath.substring(0, idx);
}

/**
 * Build the entire tree structure (folders+files), linking children to parents.
 * Returns top-level nodes as an array of TreeNode.
 */
function buildTreeData(
  folders: WorkspaceFolder[],
  files: WorkspaceFile[]
): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();

  // Create nodes for folders
  for (const folder of folders) {
    nodeMap.set(folder.path, {
      id: folder.path,
      name: folder.name,
      path: folder.path,
      type: "folder",
      children: [],
      level: 0,
      expanded: false,
      selected: false,
      indeterminate: false,
    });
  }

  // Create nodes for files
  for (const file of files) {
    nodeMap.set(file.path, {
      id: file.path,
      name: file.name,
      path: file.path,
      type: "file",
      children: [],
      level: 0,
      expanded: false,
      selected: false,
      indeterminate: false,
    });
  }

  // Link children to parents
  const roots: TreeNode[] = [];
  for (const [path, node] of nodeMap) {
    const parentPath = getParentPath(path);
    if (parentPath && nodeMap.has(parentPath)) {
      nodeMap.get(parentPath)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Assign levels and sort children by name
  function assignLevelsAndSort(node: TreeNode, level: number) {
    node.level = level;
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of node.children) {
      assignLevelsAndSort(child, level + 1);
    }
  }
  for (const root of roots) {
    assignLevelsAndSort(root, 0);
  }

  return roots;
}

/** Flatten a tree into a single array for indexing/searching with Fuse. */
function flattenTreeData(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function dfs(node: TreeNode) {
    result.push(node);
    for (const child of node.children) {
      dfs(child);
    }
  }
  for (const root of nodes) {
    dfs(root);
  }
  return result;
}

/** 
 * Build a map of path => array of direct children IDs, 
 * and a map of path => parent ID (or "").
 */
function buildChildrenMapAndParentMap(
  baseTree: TreeNode[]
): { childrenMap: Map<string, string[]>; parentMap: Map<string, string> } {
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  function dfs(node: TreeNode, parentId: string) {
    // Ensure childrenMap has an entry for node.id
    if (!childrenMap.has(node.id)) {
      childrenMap.set(node.id, []);
    }
    parentMap.set(node.id, parentId);

    for (const child of node.children) {
      childrenMap.get(node.id)!.push(child.id);
      dfs(child, node.id);
    }
  }

  for (const root of baseTree) {
    dfs(root, "");
  }

  return { childrenMap, parentMap };
}

/**
 * Builds the "display" version of the tree for rendering:
 *  - If matchingIds is null => no search filter, otherwise filter out unmatched nodes.
 *  - **No forced expansion**. We rely on `expandedNodeIds` if the user wants to see children.
 *  - For selection, set node.selected / node.indeterminate from `selectedPaths` + children.
 */
function buildDisplayTree(
  baseTree: TreeNode[],
  expandedNodeIds: Set<string>,
  selectedPaths: Set<string>,
  matchingIds: Set<string> | null // null => no search filter
): TreeNode[] {
  function cloneAndFilter(node: TreeNode): TreeNode | null {
    // If searching, keep node only if it's in matchingIds or has a matched descendant
    let keepThisNode = (matchingIds === null) || matchingIds.has(node.id);

    const filteredChildren: TreeNode[] = [];
    for (const child of node.children) {
      const clonedChild = cloneAndFilter(child);
      if (clonedChild) {
        filteredChildren.push(clonedChild);
        if (!keepThisNode) {
          keepThisNode = true;
        }
      }
    }
    if (!keepThisNode) return null;

    // Clone
    const cloned: TreeNode = {
      ...node,
      children: filteredChildren,
      // We respect the user's expanded state regardless of search
      expanded: expandedNodeIds.has(node.id),
      selected: false,
      indeterminate: false,
    };

    // Compute selection from parent's membership in selectedPaths + child states
    if (selectedPaths.has(cloned.id)) {
      cloned.selected = true;
    }

    if (filteredChildren.length > 0) {
      let allChildrenSelected = true;
      let anyChildSelected = false;
      for (const c of filteredChildren) {
        if (c.selected || c.indeterminate) {
          anyChildSelected = true;
        }
        if (!c.selected) {
          allChildrenSelected = false;
        }
      }
      if (allChildrenSelected) {
        cloned.selected = true;
      } else if (anyChildSelected) {
        cloned.selected = false;
        cloned.indeterminate = true;
      }
    }

    return cloned;
  }

  const results: TreeNode[] = [];
  for (const root of baseTree) {
    const r = cloneAndFilter(root);
    if (r) {
      results.push(r);
    }
  }
  return results;
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------
const TreeView: React.FC<TreeViewProps> = ({
  workspaceFiles,
  workspaceFolders,
  selectedPaths,
  onSelectionChange,
}) => {
  // Build the base tree structure once
  const baseTreeData = useMemo(() => {
    return buildTreeData(workspaceFolders, workspaceFiles);
  }, [workspaceFolders, workspaceFiles]);

  // Flatten the tree for Fuse-based searching
  const allNodes = useMemo(() => flattenTreeData(baseTreeData), [baseTreeData]);

  // Build a quick path->(WorkspaceFile|WorkspaceFolder) map for copy logic
  const pathToItem = useMemo(() => {
    const map = new Map<string, WorkspaceFile | WorkspaceFolder>();
    for (const folder of workspaceFolders) {
      map.set(folder.path, folder);
    }
    for (const file of workspaceFiles) {
      map.set(file.path, file);
    }
    return map;
  }, [workspaceFolders, workspaceFiles]);

  // Build parent/children maps for quick up/down traversal
  const { parentMap, childrenMap } = useMemo(
    () => buildChildrenMapAndParentMap(baseTreeData),
    [baseTreeData]
  );

  // Create Fuse index once
  const fuseSearch = useMemo(() => {
    if (!allNodes.length) return null;
    const options = {
      keys: ["name"],
      threshold: 0.0,
      ignoreLocation: true,
    };
    return new Fuse(allNodes, options);
  }, [allNodes]);

  // Track which folders are expanded by the user
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  // Debounced search states
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Auto-expand matching nodes when search query changes
  useEffect(() => {
    if (searchQuery && fuseSearch) {
      const fuseResults = fuseSearch.search(searchQuery);
      const matchedIds = new Set<string>(fuseResults.map(r => r.item.id));
      
      // Get parents of all matched nodes
      const parentsToExpand = new Set<string>();
      matchedIds.forEach(id => {
        let currentId = id;
        let parentId = parentMap.get(currentId);
        while (parentId) {
          parentsToExpand.add(parentId);
          currentId = parentId;
          parentId = parentMap.get(currentId);
        }
      });
      
      // Add parents to expanded nodes
      setExpandedNodeIds(prev => {
        const newSet = new Set(prev);
        parentsToExpand.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }, [searchQuery, fuseSearch, parentMap]);

  // Construct the displayed tree
  const displayedTreeData = useMemo(() => {
    if (!baseTreeData.length) return [];

    if (!searchQuery || !fuseSearch) {
      return buildDisplayTree(baseTreeData, expandedNodeIds, selectedPaths, null);
    }

    const fuseResults = fuseSearch.search(searchQuery);
    const matchedIds = new Set<string>(fuseResults.map(r => r.item.id));
    return buildDisplayTree(baseTreeData, expandedNodeIds, selectedPaths, matchedIds);
  }, [baseTreeData, expandedNodeIds, selectedPaths, searchQuery, fuseSearch]);

  // -----------------------------------------------
  // Handlers
  // -----------------------------------------------
  const handleCloseAll = useCallback(() => {
    setExpandedNodeIds(new Set());
  }, []);

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  /**
   * BFS to gather all descendants of a given node (including itself).
   * We rely on `childrenMap` to find direct children, then keep going.
   */
  const gatherDescendants = useCallback((id: string): string[] => {
    const queue = [id];
    const all: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      all.push(current);
      const kids = childrenMap.get(current);
      if (kids) {
        for (const k of kids) {
          queue.push(k);
        }
      }
    }
    return all;
  }, [childrenMap]);

  /**
   * If you unselect a node, check if its parent is still selected. 
   * If none of the parent's children remain selected, remove the parent from selection.
   * Continue up until you reach the root.
   */
  const cascadeUpUnselect = useCallback((childId: string, selectedSet: Set<string>) => {
    const parentId = parentMap.get(childId);
    if (!parentId) return; // if "", no parent
    if (!selectedSet.has(parentId)) {
      // parent isn't selected anyway
      return;
    }

    // Check parent's children
    const siblings = childrenMap.get(parentId) || [];
    const anyChildSelected = siblings.some(sid => selectedSet.has(sid));

    if (!anyChildSelected) {
      // remove the parent from selection
      selectedSet.delete(parentId);
      // then check parent's parent
      cascadeUpUnselect(parentId, selectedSet);
    }
  }, [parentMap, childrenMap]);

  // Toggling selection
  const handleSelectNode = useCallback((node: TreeNode) => {
    const isCurrentlySelected = node.selected;
    const newSet = new Set(selectedPaths);

    if (isCurrentlySelected) {
      // Unselect node + all descendants
      const toUnselect = (node.type === "folder")
        ? gatherDescendants(node.id)
        : [node.id];

      toUnselect.forEach(id => newSet.delete(id));

      // For each unselected child, cascade upward
      toUnselect.forEach(id => {
        cascadeUpUnselect(id, newSet);
      });

    } else {
      // Select node + all descendants
      const toSelect = (node.type === "folder")
        ? gatherDescendants(node.id)
        : [node.id];

      toSelect.forEach(id => {
        newSet.add(id);
      });
    }

    onSelectionChange(newSet);
  }, [
    selectedPaths,
    onSelectionChange,
    gatherDescendants,
    cascadeUpUnselect,
  ]);

  // Handle copying the selected items
  const handleCopySelected = useCallback(() => {
    if (!selectedPaths.size) return;

    // Convert selectedPaths to an array of items
    const selectedItems = Array.from(selectedPaths)
      .map(path => pathToItem.get(path))
      .filter(Boolean) as (WorkspaceFile | WorkspaceFolder)[];

    const mentions: MentionItem[] = selectedItems.map(item => ({
      id: "relativePath" in item ? item.relativePath : "",
      label: item.name,
      type: item.name.includes(".") ? "file" : "folder",
    }));

    vscode.postMessage({
      command: "copyWithContext",
      text: "",
      mentions: mentions,
    });
  }, [selectedPaths, pathToItem]);

  // -----------------------------------------------
  // Custom Checkbox (supports indeterminate)
  // -----------------------------------------------
  const IndeterminateCheckbox = React.memo(({
    checked,
    indeterminate,
    onChange,
    onClick,
  }: {
    checked: boolean;
    indeterminate?: boolean;
    onChange: () => void;
    onClick: (e: React.MouseEvent) => void;
  }) => {
    const checkboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = indeterminate || false;
      }
    }, [indeterminate]);

    return (
      <input
        type="checkbox"
        className="node-checkbox"
        ref={checkboxRef}
        checked={checked}
        onChange={onChange}
        onClick={onClick}
      />
    );
  });

  // -----------------------------------------------
  // Rendering
  // -----------------------------------------------
  const renderTree = (nodes: TreeNode[]): JSX.Element[] => {
    return nodes.map((node) => (
      <div key={node.id} className="tree-node-container">
        <div
          className={`tree-node ${node.selected ? "selected" : ""}`}
          style={{ paddingLeft: `${node.level * 16}px` }}
        >
          {/* Folder toggler (if folder) */}
          {node.type === "folder" ? (
            <span
              className={`folder-icon ${node.expanded ? "expanded" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(node.id);
              }}
            >
              {node.expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </span>
          ) : (
            <span className="folder-icon-placeholder"></span>
          )}

          {/* Indeterminate Checkbox */}
          <IndeterminateCheckbox
            checked={node.selected}
            indeterminate={node.indeterminate}
            onChange={() => handleSelectNode(node)}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Icon for file/folder */}
          <span className={`node-icon ${node.type}-icon`}>
            {node.type === "folder"
              ? (node.expanded ? <FolderOpenedIcon /> : <FolderIcon />)
              : <FileIconComponent filename={node.name} />
            }
          </span>

          {/* Name (clickable to toggle selection) */}
          <span
            className="node-name"
            onClick={() => handleSelectNode(node)}
            title={node.path}
          >
            {node.name}
          </span>
        </div>

        {/* Children (if expanded) */}
        {node.expanded && node.children.length > 0 && (
          <div className="tree-children">
            {renderTree(node.children)}
          </div>
        )}
      </div>
    ));
  };

  // -----------------------------------------------
  // Final JSX
  // -----------------------------------------------
  return (
    <div className="tree-view-container">
      <div className="tree-search-container">
        <VSCodeTextField
          className="tree-search-input"
          placeholder="Search..."
          value={searchInput}
          onInput={(e) => {
            const target = e.target as HTMLInputElement;
            setSearchInput(target.value);
          }}
        >
          {searchInput && (
            <span
              slot="end"
              onClick={() => setSearchInput("")}
              title="Clear search"
            >
              <CloseIcon />
            </span>
          )}
        </VSCodeTextField>
        <div
          className="collapse-all-icon"
          onClick={handleCloseAll}
          title="Close all folders"
        >
          <CollapseAllIcon />
        </div>
      </div>

      <div className="tree-content">
        {displayedTreeData.length > 0 ? (
          renderTree(displayedTreeData)
        ) : (
          <div className="no-results">
            {searchQuery
              ? "No matching files or folders found"
              : "No files or folders available"}
          </div>
        )}
      </div>

      <div className="tree-footer">
        <VSCodeButton
          onClick={handleCopySelected}
          disabled={selectedPaths.size === 0}
        >
          Copy ({selectedPaths.size})
        </VSCodeButton>
      </div>
    </div>
  );
};

export default TreeView;
