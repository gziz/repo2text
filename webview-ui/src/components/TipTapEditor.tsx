import Document from "@tiptap/extension-document";
import Mention from "@tiptap/extension-mention";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { MentionItem, WorkspaceFile, WorkspaceFolder } from "../types/types";
import { vscode } from "../utilities/vscode";
import CopyPromptButton from "./CopyPromptButton";
import MentionExtension from "./MentionExtension";
import "./TipTapEditor.css";

// A div for tippy to use
export const TIPPY_DIV_ID = "tippy-js-div";

interface TipTapEditorProps {
  workspaceFiles: WorkspaceFile[];
  workspaceFolders: WorkspaceFolder[];
  initialContent?: string;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onUpdate?: (html: string) => void;
}

// Interface to track mentions with their positions
interface TrackedMention extends MentionItem {
  position?: number; // Position in the document, used for tracking
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  workspaceFiles,
  workspaceFolders,
  initialContent = "",
  placeholder = "Type @ to mention files or folders...",
  onKeyDown,
  onUpdate,
}) => {
  const [mentionExtension, setMentionExtension] = useState<MentionExtension | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const inDropdownRef = useRef(false);
  const mentionExtensionRef = useRef<MentionExtension | null>(null);
  const isFirstRender = useRef(true);

  // Initialize the mention extension only once
  useEffect(() => {
    const extension = new MentionExtension(workspaceFiles, workspaceFolders);
    setMentionExtension(extension);
    mentionExtensionRef.current = extension;
  }, []);

  // Update the mention extension when files/folders change without recreating it
  useEffect(() => {
    if (mentionExtensionRef.current) {
      mentionExtensionRef.current.updateSources(workspaceFiles, workspaceFolders);
    }
  }, [workspaceFiles, workspaceFolders]);

  // Initialize the editor
  const editor = useEditor(
    {
      extensions: [
        Document,
        Paragraph,
        Text,
        Placeholder.configure({
          placeholder,
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: mentionExtension?.getSuggestion(inDropdownRef),
          renderLabel: ({ node }) => {
            return `@${node.attrs.label ?? node.attrs.id}`;
          },
        }),
      ],
      content: initialContent,
      autofocus: true,
      editorProps: {
        attributes: {
          class: "editor-content",
        },
      },
      onUpdate: ({ editor }) => {
        if (onUpdate) {
          onUpdate(editor.getHTML());
        }
      },
    },
    [mentionExtension]
  );

  // Handle initialContent changes without re-creating the editor
  useEffect(() => {
    // Skip on first render since the editor is already initialized with initialContent
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // If the editor exists and initialContent is different from current content
    // and the initialContent is not empty (to avoid clearing user input)
    if (
      editor &&
      initialContent &&
      initialContent !== editor.getHTML() &&
      initialContent !== "<p></p>"
    ) {
      // Only update if the editor is empty or if we're restoring content
      if (editor.isEmpty || initialContent.length > editor.getHTML().length) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  // Extract mentions from the document
  const extractMentionsFromDocument = useCallback(() => {
    if (!editor) return [];

    const mentionsInDocument: TrackedMention[] = [];
    let position = 0;

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "mention") {
        // Extract type from the id which is now in format "type:path"
        const colonIndex = node.attrs.id.indexOf(":");
        const type = colonIndex > 0 ? node.attrs.id.substring(0, colonIndex) : "file"; // Default to file if no type
        const actualId = colonIndex > 0 ? node.attrs.id.substring(colonIndex + 1) : node.attrs.id; // Rest is the actual path

        mentionsInDocument.push({
          id: actualId, // Use the actual id without the type prefix
          label: node.attrs.label,
          type: type,
          position: pos,
        });
      }
      position += node.nodeSize;
      return true;
    });

    return mentionsInDocument;
  }, [editor]);

  // Handle copying the prompt
  const handleCopyPrompt = useCallback(() => {
    if (!editor) return;

    // Get the editor's content as plain text
    const content = editor.getText();
    const mentionsInDocument = extractMentionsFromDocument();

    // Always copy with context if mentions exist, otherwise copy plain text
    if (mentionsInDocument.length > 0) {
      // Send message to extension to copy with context
      // Only send necessary fields to the extension (id, label, type)
      const mentionsForExtension = mentionsInDocument.map(({ id, label, type }) => ({
        id,
        label,
        type,
      }));

      vscode.postMessage({
        command: "copyWithContext",
        text: content,
        mentions: mentionsForExtension,
        source: "editor" // Explicitly set the source
      });
    } else {
      // No mentions, just copy the text
      vscode.postMessage({
        command: "copyText",
        text: content,
      });
    }
  }, [editor, extractMentionsFromDocument]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't process keyboard shortcuts when dropdown is active
      if (inDropdownRef.current) return;

      if (e.key === "Enter") {
        if (e.shiftKey) {
          // Make Shift+Enter behave like a normal Enter (create a new paragraph)
          e.preventDefault();
          editor?.commands.splitBlock();
        } else if (e.metaKey || e.ctrlKey) {
          // If cmd/ctrl + Enter, copy the prompt
          e.preventDefault();
          handleCopyPrompt();
        }
      }

      // Call the parent's onKeyDown if provided
      if (onKeyDown) {
        onKeyDown(e);
      }
    },
    [onKeyDown, handleCopyPrompt, editor]
  );

  const handleKeyUp = () => {
    setActiveKey(null);
  };

  return (
      <div
        className="input-box"
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} onClick={(event) => event.stopPropagation()} />

        {/* Tippy div for dropdown positioning */}
        <div id={TIPPY_DIV_ID} style={{ position: "fixed", zIndex: 50 }} />

        {/* Position the copy button inside the editor at bottom right */}
        <div className="copy-button-container">
          <CopyPromptButton onClick={handleCopyPrompt} />
        </div>
      </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(TipTapEditor);
