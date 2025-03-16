/**
 * Default template for the prompt builder
 * This template is used when a user hasn't customized their prompt template
 */

export const DEFAULT_PROMPT_TEMPLATE = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "<file_map>" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "mention", attrs: { id: "fileMap", label: "fileMap" } }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "</file_map>" }
      ]
    }, 
    {type: 'paragraph'},
    {
      type: "paragraph",
      content: [
        { type: "text", text: "<file_contents>" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "mention", attrs: { id: "fileContents", label: "fileContents" } }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "</file_contents>" }
      ]
    },
    {type: 'paragraph'},
    {
      type: "paragraph",
      content: [
        { type: "text", text: "<user>" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "mention", attrs: { id: "userText", label: "userText" } }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "</user>" }
      ]
    }
  ]
};

/**
 * Default template for file content formatting
 * This template defines how each file is displayed in the prompt
 */
export const DEFAULT_FILE_TEMPLATE = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "-------------------------" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "mention", attrs: { id: "filePath", label: "filePath" } }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "-------------------------" }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "mention", attrs: { id: "fileContent", label: "fileContent" } }
      ]
    }
  ]
}; 