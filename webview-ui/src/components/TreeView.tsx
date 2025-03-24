import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { WorkspaceFile, WorkspaceFolder, MentionItem } from "../types/types";
import { vscode } from "../utilities/vscode";
import "./TreeView.css";
import {
  VSCodeButton,
  VSCodeTextField,
  VSCodeCheckbox
} from "@vscode/webview-ui-toolkit/react";
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, FolderOpenedIcon, CollapseAllIcon, CloseIcon } from '../icons';
import FileIconComponent from './FileIcon';

interface TreeViewProps {
  workspaceFiles: WorkspaceFile[];
  workspaceFolders: WorkspaceFolder[];
  selectedItems: (WorkspaceFile | WorkspaceFolder)[];
  onSelectionChange: (items: (WorkspaceFile | WorkspaceFolder)[]) => void;
}

interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  level: number;
  expanded?: boolean;
  children?: TreeNode[];
  parent?: string;
  selected?: boolean;
  indeterminate?: boolean; // For partially selected folders
}

const TreeView: React.FC<TreeViewProps> = ({
  workspaceFiles,
  workspaceFolders,
  selectedItems,
  onSelectionChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const prevSearchQueryRef = useRef("");

  // Track parent map and node references for efficient operations
  const folderMapRef = useRef<Record<string, TreeNode>>({});
  const nodeMapRef = useRef<Record<string, TreeNode>>({});

  // Build tree structure from files and folders
  useEffect(() => {
    const buildTree = () => {
      const rootNodes: TreeNode[] = [];
      const folderMap: Record<string, TreeNode> = {};
      const nodeMap: Record<string, TreeNode> = {};

      // Process folders first to build the structure
      workspaceFolders.forEach((folder) => {
        const folderNode: TreeNode = {
          id: folder.uri,
          name: folder.name,
          path: folder.relativePath,
          type: "folder",
          level: folder.relativePath.split("/").filter(Boolean).length,
          children: [],
          expanded: expandedFolders.has(folder.uri),
          selected: selectedItems.some((item) => 'uri' in item && item.uri === folder.uri),
          indeterminate: false,
        };

        // Add to the maps for quick reference
        folderMap[folder.relativePath] = folderNode;
        nodeMap[folder.uri] = folderNode;

        // Find parent folder
        const pathParts = folder.relativePath.split("/").filter(Boolean);
        pathParts.pop(); // Remove the current folder name
        const parentPath = pathParts.join("/");

        if (parentPath && folderMap[parentPath]) {
          // Add as child to parent folder
          if (!folderMap[parentPath].children) {
            folderMap[parentPath].children = [];
          }
          folderMap[parentPath].children!.push(folderNode);
          folderNode.parent = parentPath;
        } else {
          // This is a root folder
          rootNodes.push(folderNode);
        }
      });

      // Process files and add them to their parent folders
      workspaceFiles.forEach((file) => {
        const fileNode: TreeNode = {
          id: file.uri,
          name: file.name,
          path: file.relativePath,
          type: "file",
          level: file.relativePath.split("/").filter(Boolean).length,
          selected: selectedItems.some((item) => 'uri' in item && item.uri === file.uri),
        };

        // Add to node map
        nodeMap[file.uri] = fileNode;

        // Find parent folder
        const pathParts = file.relativePath.split("/").filter(Boolean);
        pathParts.pop(); // Remove the file name
        const parentPath = pathParts.join("/");

        if (parentPath && folderMap[parentPath]) {
          // Add as child to parent folder
          if (!folderMap[parentPath].children) {
            folderMap[parentPath].children = [];
          }
          folderMap[parentPath].children!.push(fileNode);
          fileNode.parent = parentPath;
        } else {
          // This is a root file
          rootNodes.push(fileNode);
        }
      });

      // Update indeterminate states
      updateIndeterminateStates(folderMap, nodeMap);

      // Save references
      folderMapRef.current = folderMap;
      nodeMapRef.current = nodeMap;

      // Sort the tree
      const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
          // Folders first, then files, then alphabetically
          if (a.type === "folder" && b.type === "file") return -1;
          if (a.type === "file" && b.type === "folder") return 1;
          return a.name.localeCompare(b.name);
        });

        // Sort children recursively
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            sortNodes(node.children);
          }
        });

        return nodes;
      };

      return sortNodes(rootNodes);
    };

    setTreeData(buildTree());
  }, [workspaceFiles, workspaceFolders, selectedItems, expandedFolders]);

  // Update indeterminate states for all folders
  const updateIndeterminateStates = (folderMap: Record<string, TreeNode>, nodeMap: Record<string, TreeNode>) => {
    // Reset all folders to not selected and not indeterminate
    Object.values(folderMap).forEach(folder => {
      folder.indeterminate = false;
      folder.selected = false;
    });

    // First mark all explicitly selected items
    selectedItems.forEach(item => {
      if (!('uri' in item)) return;
      const uri = item.uri;
      const node = nodeMap[uri];
      if (!node) return;

      // Mark the item itself as selected
      node.selected = true;
    });
    
    // Update parent folders based on child selection states
    const updateParentFolderState = (folder: TreeNode) => {
      if (!folder.children || folder.children.length === 0) return;
      
      const selectedChildren = folder.children.filter(child => child.selected);
      const indeterminateChildren = folder.children.filter(child => child.indeterminate);
      
      // If ALL children are selected, the folder is selected (not indeterminate)
      if (selectedChildren.length === folder.children.length) {
        folder.selected = true;
        folder.indeterminate = false;
      } 
      // If SOME children are selected or indeterminate, the folder is indeterminate
      else if (selectedChildren.length > 0 || indeterminateChildren.length > 0) {
        folder.selected = false;
        folder.indeterminate = true;
      } 
      // Otherwise (no children selected), folder is not selected and not indeterminate
      else {
        folder.selected = false;
        folder.indeterminate = false;
      }
    };
    
    // Process folders bottom-up to ensure correct propagation
    // First, find the maximum folder level
    let maxLevel = 0;
    Object.values(folderMap).forEach(folder => {
      maxLevel = Math.max(maxLevel, folder.level);
    });
    
    // Process folders from deepest to highest level
    for (let level = maxLevel; level >= 0; level--) {
      Object.values(folderMap)
        .filter(folder => folder.level === level)
        .forEach(updateParentFolderState);
    }
  };

  // Auto-expand folders with matching results when search query changes
  useEffect(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const isNewQuery = prevSearchQueryRef.current !== normalizedQuery;
    prevSearchQueryRef.current = normalizedQuery;
    
    if (isNewQuery && normalizedQuery) {
      // Find folders with matches and expand them
      const foldersToExpand: string[] = [];
      
      const findMatchingFolders = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.type === 'folder') {
            // Check if folder name matches
            if (node.name.toLowerCase().includes(normalizedQuery) || 
                node.path.toLowerCase().includes(normalizedQuery)) {
              foldersToExpand.push(node.id);
            }
            
            // Check if any children match
            if (node.children && node.children.length > 0) {
              // Check if any direct child matches
              const hasMatchingChild = node.children.some(child => 
                child.name.toLowerCase().includes(normalizedQuery) ||
                child.path.toLowerCase().includes(normalizedQuery)
              );
              
              if (hasMatchingChild) {
                foldersToExpand.push(node.id);
              }
              
              // Recursively check nested folders
              findMatchingFolders(node.children);
            }
          }
        }
      };
      
      findMatchingFolders(treeData);
      
      // Update expanded folders state
      if (foldersToExpand.length > 0) {
        setExpandedFolders(prev => {
          const newSet = new Set(prev);
          foldersToExpand.forEach(id => newSet.add(id));
          return newSet;
        });
      }
    }
  }, [searchQuery, treeData]);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) {
      return treeData;
    }

    const normalizedQuery = searchQuery.toLowerCase().trim();

    // Helper function to check if a node or any of its children match the query
    const nodeMatches = (node: TreeNode): boolean => {
      const nameMatches = node.name.toLowerCase().includes(normalizedQuery);
      const pathMatches = node.path.toLowerCase().includes(normalizedQuery);
      
      if (nameMatches || pathMatches) {
        return true;
      }

      // Check if any children match
      if (node.children && node.children.length > 0) {
        return node.children.some(nodeMatches);
      }

      return false;
    };

    // Create a new filtered tree with only matching nodes and their parents
    const filterTreeNodes = (nodes: TreeNode[]): TreeNode[] => {
      const filteredNodes: TreeNode[] = [];

      for (const node of nodes) {
        if (nodeMatches(node)) {
          // Clone the node to avoid modifying the original
          const clonedNode: TreeNode = { ...node };
          
          // If it's a folder, recursively filter children
          if (node.children && node.children.length > 0) {
            clonedNode.children = filterTreeNodes(node.children);
            // Respect the current expandedFolders state
            clonedNode.expanded = expandedFolders.has(node.id);
          }
          
          filteredNodes.push(clonedNode);
        }
      }

      return filteredNodes;
    };

    return filterTreeNodes(treeData);
  }, [treeData, searchQuery, expandedFolders]);

  // Handle node expansion toggle
  const handleToggleExpand = (nodeId: string) => {
    setExpandedFolders((prevExpanded) => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  };

  // Helper to get all child nodes recursively (including nested children)
  const getAllChildNodes = (node: TreeNode): TreeNode[] => {
    let result: TreeNode[] = [];
    
    if (node.children && node.children.length > 0) {
      // Add direct children
      result = [...node.children];
      
      // Add nested children recursively
      for (const child of node.children) {
        if (child.type === 'folder') {
          result = [...result, ...getAllChildNodes(child)];
        }
      }
    }
    
    return result;
  };

  // Get all child workspace items (files and folders) from the original data source
  const getAllChildWorkspaceItems = (nodeId: string): (WorkspaceFile | WorkspaceFolder)[] => {
    const result: (WorkspaceFile | WorkspaceFolder)[] = [];
    
    // Find the folder in the original data
    const folder = workspaceFolders.find(f => f.uri === nodeId);
    if (!folder) return result;
    
    // Get all nested files and folders that are children of this folder
    const folderPath = folder.relativePath;
    
    // Add all files that are children of this folder
    const childFiles = workspaceFiles.filter(file => {
      const filePath = file.relativePath;
      return filePath.startsWith(folderPath + '/') && filePath !== folderPath;
    });
    result.push(...childFiles);
    
    // Add all folders that are children of this folder
    const childFolders = workspaceFolders.filter(subFolder => {
      const subFolderPath = subFolder.relativePath;
      return subFolderPath.startsWith(folderPath + '/') && subFolderPath !== folderPath;
    });
    result.push(...childFolders);
    
    return result;
  };

  // Handle node selection toggle with proper parent/child relationship
  const handleSelectNode = (node: TreeNode) => {
    // Get the current selection state
    const isSelected = node.selected;
    const newSelectionState = !isSelected;
    
    // Check if we're in filtered mode (search is active)
    const isFiltered = searchQuery.trim() !== '';
    
    let affectedItems: string[] = [node.id];
    
    // Handle folder selection differently based on whether filtering is active
    if (node.type === 'folder') {
      if (isFiltered) {
        // When in filtered mode, get all actual children from original data
        const allChildItems = getAllChildWorkspaceItems(node.id);
        if (newSelectionState) {
          // Add all children when selecting
          affectedItems.push(...allChildItems.map(item => 'uri' in item ? item.uri : ''));
        } else {
          // Remove all children when deselecting
          affectedItems.push(...allChildItems.map(item => 'uri' in item ? item.uri : ''));
        }
      } else {
        // In normal mode, use the visible node children
        const allChildren = getAllChildNodes(node);
        if (newSelectionState) {
          // When selecting a folder, add all its children
          affectedItems.push(...allChildren.map(child => child.id));
        } else {
          // When deselecting a folder, also remove all its children
          affectedItems.push(...allChildren.map(child => child.id));
        }
      }
    }
    
    // Filter out any empty or invalid URIs
    affectedItems = affectedItems.filter(id => id);
    
    // Create a new selection by filtering out deselected items or adding selected items
    let newSelection: (WorkspaceFile | WorkspaceFolder)[] = [];
    
    if (newSelectionState) {
      // Add all newly selected items (that aren't already selected)
      const currentSelectedIds = new Set(selectedItems.map(item => 'uri' in item ? item.uri : ''));
      const itemsToAdd: (WorkspaceFile | WorkspaceFolder)[] = [];
      
      // Find the actual workspace items for each affected item
      affectedItems.forEach(id => {
        if (!currentSelectedIds.has(id)) {
          // Find the corresponding workspace item
          const workspaceItem = 
            workspaceFiles.find(file => file.uri === id) || 
            workspaceFolders.find(folder => folder.uri === id);
          
          if (workspaceItem) {
            itemsToAdd.push(workspaceItem);
          }
        }
      });
      
      // Combine existing selection with new items
      newSelection = [...selectedItems, ...itemsToAdd];
    } else {
      // If we're deselecting...
      const idsToRemove = new Set(affectedItems);
      newSelection = selectedItems.filter(item => 
        !('uri' in item) || !idsToRemove.has(item.uri)
      );
    }
    
    // Update the selection
    onSelectionChange(newSelection);
  };

  // Handle copying the selected items
  const handleCopySelected = useCallback(() => {
    if (selectedItems.length === 0) return;

    // Convert selected items to mentions format expected by the extension
    const mentions: MentionItem[] = selectedItems.map(item => ({
      id: 'relativePath' in item ? item.relativePath : '',
      label: 'name' in item ? item.name : '',
      type: 'name' in item && item.name.includes('.') ? 'file' : 'folder'
    }));

    // Send message to extension to copy with context (similar to TipTapEditor)
    vscode.postMessage({
      command: "copyWithContext",
      text: "", // No text content in this case, just selected items
      mentions: mentions,
    });
  }, [selectedItems]);

  // Handler to close all expanded folders
  const handleCloseAll = useCallback(() => {
    // Set expandedFolders to an empty set to collapse all
    setExpandedFolders(new Set());
  }, []);

  // Custom checkbox component that supports indeterminate state
  const IndeterminateCheckbox = React.memo(({ 
    checked, 
    indeterminate, 
    onChange, 
    onClick 
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

  // Render tree nodes recursively
  const renderTree = (nodes: TreeNode[]) => {
    return nodes.map((node) => (
      <div key={node.id} className="tree-node-container">
        <div
          className={`tree-node ${
            node.selected ? "selected" : ""
          }`}
          style={{ paddingLeft: `${node.level * 16}px` }}
        >
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
          <IndeterminateCheckbox
            checked={node.selected || false}
            indeterminate={node.indeterminate}
            onChange={() => handleSelectNode(node)}
            onClick={(e) => e.stopPropagation()}
          />
          <span className={`node-icon ${node.type}-icon`}>
            {node.type === "folder" ? 
              (node.expanded ? <FolderOpenedIcon /> : <FolderIcon />) : 
              <FileIconComponent 
                filename={node.name} 
              />
            }
          </span>
          <span
            className="node-name"
            onClick={() => handleSelectNode(node)}
            title={node.path}
          >
            {node.name}
          </span>
        </div>
        {node.expanded && node.children && (
          <div className="tree-children">{renderTree(node.children)}</div>
        )}
      </div>
    ));
  };
  console.log("R2P:", filteredTree);
  return (
    <div className="tree-view-container">
      <div className="tree-search-container">
        {/* <div className="search-input-wrapper" style={{ position: 'relative', flex: 1 }}> */}
          <VSCodeTextField
            className="tree-search-input"
            placeholder="Search files and folders..."
            value={searchQuery}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              setSearchQuery(target.value);
            }}
            style={{ width: '100%' }}
          >
            {searchQuery && (
              <span
                slot="end"
                className="clear-search-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <CloseIcon />
              </span>
            )}
          </VSCodeTextField>
        {/* </div> */}
        <div
          className="collapse-all-icon"
          onClick={handleCloseAll}
          title="Close all folders"
        >
          <CollapseAllIcon />
        </div>
      </div>
      <div className="tree-content">
        {filteredTree.length > 0 ? (
          renderTree(filteredTree)
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
          // className="copy-tree-btn" 
          onClick={handleCopySelected}
          disabled={selectedItems.length === 0}
        >
          Copy ({selectedItems.length})
        </VSCodeButton>
      </div>
    </div>
  );
};

export default TreeView;
