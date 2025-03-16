import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { MentionItem, WorkspaceFile, WorkspaceFolder } from '../types/types';
import MentionList from './MentionList';
import { MutableRefObject } from 'react';
import Fuse from 'fuse.js';

export const TIPPY_DIV_ID = "tippy-js-div";

// Store the active component globally so it can be accessed from anywhere
let activeComponent: { updateProps: (props: any) => void } | null = null;

class MentionExtension {
  private workspaceFiles: WorkspaceFile[] = [];
  private workspaceFolders: WorkspaceFolder[] = [];
  private onMentionAddedCallback?: (item: MentionItem) => void;
  // Combined structure for both files and folders
  private combinedItems: Array<WorkspaceFile | WorkspaceFolder & { itemType: 'file' | 'folder' }> = [];
  private combinedFuse: Fuse<any>;

  constructor(
    files: WorkspaceFile[], 
    folders: WorkspaceFolder[],
  ) {
    this.workspaceFiles = files;
    this.workspaceFolders = folders;
    
    // Initialize combined items
    this.combinedItems = [
      ...files.map(file => ({ ...file, itemType: 'file' as const })),
      ...folders.map(folder => ({ ...folder, itemType: 'folder' as const }))
    ];
    
    // Initialize combined Fuse instance
    this.combinedFuse = new Fuse(this.combinedItems, {
      keys: ['name', 'relativePath'],
      threshold: 0.4,
      includeScore: true,
      shouldSort: true
    });
  }

  // Method to update the files and folders without recreating the extension
  updateSources(files: WorkspaceFile[], folders: WorkspaceFolder[]) {
    this.workspaceFiles = files;
    this.workspaceFolders = folders;
    
    // Update combined items
    this.combinedItems = [
      ...files.map(file => ({ ...file, itemType: 'file' as const })),
      ...folders.map(folder => ({ ...folder, itemType: 'folder' as const }))
    ];
    
    // Update combined Fuse instance
    this.combinedFuse = new Fuse(this.combinedItems, {
      keys: ['name', 'relativePath'],
      threshold: 0.4,
      includeScore: true,
      shouldSort: true
    });
  }

  getSuggestion(inDropdownRef?: MutableRefObject<boolean>) {
    return {
      items: ({ query }: { query: string }) => {
        // Process query - strip @ and trim
        let processedQuery = (query || '').startsWith('@') 
          ? query.substring(1).trim() 
          : query.trim();
          
        // If empty query or just '@', show all files and folders (limited to 10)
        if (!processedQuery || processedQuery === '') {
          // Show a mix of files and folders
          return [
            ...this.workspaceFiles.slice(0, 5).map(file => ({
              id: file.path,
              label: file.name,
              type: 'file' as const,
              description: file.relativePath
            })),
            ...this.workspaceFolders.slice(0, 5).map(folder => ({
              id: folder.path,
              label: folder.name,
              type: 'folder' as const,
              description: folder.relativePath
            }))
          ];
        }
        
        // For non-empty queries, use Fuse.js for fuzzy searching combined items
        return this.combinedFuse.search(processedQuery, { limit: 10 })
          .map(result => {
            const item = result.item;
            return {
              id: item.path,
              label: item.name,
              type: item.itemType as 'file' | 'folder',
              description: item.relativePath
            };
          });
      },
      
      render: () => {
        let component: { ref: any; updateProps: (props: any) => void; destroy: () => void; element: HTMLElement };
        let popup: any[];
        
        return {
          onStart: (props: any) => {
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            }) as any;
            
            // Store the component for access in the command function
            activeComponent = component;

            // Set dropdown state
            if (inDropdownRef) {
              inDropdownRef.current = true;
            }
            
            if (!props.clientRect) {
              return;
            }

            const tippyContainer = document.getElementById(TIPPY_DIV_ID);

            if (!tippyContainer) {
              return;
            }

            popup = tippy('body', {
              getReferenceClientRect: props.clientRect,
              appendTo: () => tippyContainer,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
              popperOptions: {
                modifiers: [{ name: 'flip', enabled: false }]
              },
              maxWidth: `${window.innerWidth -24}px`,
            });
          },
          
          onUpdate: (props: any) => {
            // Process query - strip @ and trim
            let processedQuery = (props.query || '').startsWith('@') 
              ? props.query.substring(1).trim() 
              : props.query.trim();
            
            // Update component props
            component.updateProps({
              ...props,
              query: processedQuery,
            });
            
            if (popup?.[0] && props.clientRect) {
              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              });
            }
          },
          
          onKeyDown: (props: any) => {
            if (props.event.key === 'Escape') {
              // Close the dropdown
              popup[0].hide();
              return true;
            }
            
            return component.ref?.onKeyDown(props);
          },
          
          onExit: () => {
            popup?.[0]?.destroy();
            component.destroy();
            
            // Reset dropdown state
            if (inDropdownRef) {
              inDropdownRef.current = false;
            }
            
            activeComponent = null;
          }
        };
      },
      
      command: (props: { editor: any; range: any; props: any }) => {
        // Cast the props to our MentionItem type for use in our code
        const mentionProps = props.props as MentionItem;
        
        // Store the type and path in data attributes, but display only the name
        const attrs = {
          id: `${mentionProps.type}:${mentionProps.id}`,  // Encode type in the id with a prefix
          label: mentionProps.label      // Display name (the file/folder name)
        };
        
        // Notify about the new mention
        if (this.onMentionAddedCallback) {
          this.onMentionAddedCallback(mentionProps);
        }
        
        const nodeAfter = props.editor.view.state.selection.$to.nodeAfter;
        const overrideSpace = nodeAfter?.text?.startsWith(" ");
        if (overrideSpace) {
          props.range.to += 1;
        }

        // Insert the mention
        props.editor
          .chain()
          .focus()
          .insertContentAt(props.range, [
            {
              type: 'mention',
              attrs
            },
            {
              type: 'text',
              text: " " //Add an extra friendly space after the mention tag :)
            }, 
          ])
          .run();
          
        window.getSelection()?.collapseToEnd();
      }
    };
  }
}

export default MentionExtension; 