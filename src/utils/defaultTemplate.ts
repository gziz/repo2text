/**
 * Default template for the prompt builder
 * This template is used when a user hasn't customized their prompt template
 */

export const DEFAULT_PROMPT_TEMPLATE_STRING = 
`<file_map>
{{fileMap}}
</file_map>

<file_contents>
{{fileContents}}
</file_contents>

<user>
{{userText}}
</user>`;

export const DEFAULT_TREEVIEW_PROMPT_TEMPLATE_STRING = 
`<file_map>
{{fileMap}}
</file_map>

<file_contents>
{{fileContents}}
</file_contents>`;

export const DEFAULT_FILE_TEMPLATE_STRING = 
`-------------------------
{{filePath}}
-------------------------
{{fileContent}}

`;