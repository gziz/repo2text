import Document from "@tiptap/extension-document";
import Mention from "@tiptap/extension-mention";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import React, { useEffect, useRef } from "react";
import tippy from "tippy.js";

import "../TipTapEditor.css";
import MentionList from "./MentionList";

// A div for tippy to use
export const TEMPLATE_TIPPY_DIV_ID = "template-tippy-js-div";

// Format template variables as mentions
// Default template variables for the prompt template
export const editorTemplateVariables = [
  { id: "fileMap", label: "fileMap", description: "File structure tree" },
  { id: "fileContents", label: "fileContents", description: "All file contents" },
  { id: "userText", label: "userText", description: "User instructions" },
];

export const treeTemplateVariables = [
  { id: "fileMap", label: "fileMap", description: "File structure tree" },
  { id: "fileContents", label: "fileContents", description: "All file contents" },
];

// Template variables for the file template
export const fileTemplateVariables = [
  { id: "filePath", label: "filePath", description: "Path to the file" },
  { id: "fileContent", label: "fileContent", description: "Content of the file" },
];

interface TemplateEditorProps {
  initialContent: any; // TipTap JSON document
  onChange: (content: any) => void; // Callback with JSON document
  variables?: Array<{ id: string; label: string; description: string }>; // Optional custom variables
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  initialContent,
  onChange,
  variables = editorTemplateVariables, // Default to prompt variables if not specified
}) => {
  const isFirstRender = useRef(true);

  const getSuggestion = () => ({
    items: ({ query }: { query: string }) => {
      return variables
        .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
    },
    render: () => {
      let component: any = null;
      let popup: any = null;

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          const container = document.getElementById(TEMPLATE_TIPPY_DIV_ID);

          if (!container) {
            return;
          }

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect,
            appendTo: () => container,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate(props: any) {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown(props: any) {
          if (props.event.key === "Escape") {
            popup[0].hide();

            return true;
          }

          return component.ref?.onKeyDown(props);
        },

        onExit() {
          popup[0].destroy();
          component.destroy();
        },
      };
    },
  });

  // Initialize the editor
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: getSuggestion(),
        renderLabel: ({ node }) => {
          return `{${node.attrs.label}}`;
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "editor-content",
      },
    },
    onUpdate: ({ editor }) => {
      // Get JSON document and pass to parent
      onChange(editor.getJSON());
    },
  });

  // Handle initialContent changes without re-creating the editor
  useEffect(() => {
    // Skip on first render since the editor is already initialized with initialContent
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // If the editor exists and initialContent changes
    if (editor && initialContent) {
      // Only update if content is different to avoid loops
      const currentJSON = editor.getJSON();
      if (JSON.stringify(currentJSON) !== JSON.stringify(initialContent)) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  return (
    <div>
      <div className="template-editor-wrapper">
        <EditorContent editor={editor} onClick={(event) => event.stopPropagation()} />

        {/* Tippy div for dropdown positioning */}
        <div id={TEMPLATE_TIPPY_DIV_ID} />
      </div>
    </div>
  );
};

export default TemplateEditor;
