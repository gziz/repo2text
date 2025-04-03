# Repo 2 Text

A VS Code extension that allows you to export your entire codebase or specific files into a single LLM-friendly text, directly from your IDE, no external tools needed.
See a demo in [here](https://repo2text.gziz.io)!

## Features

- **Contextual Code Selection**: Select files and folders from your workspace to include as context in your AI prompts
- **Dual Selection Methods**:
  - Tree view with checkboxes for selecting multiple files/folders
  - @mention support in the editor to quickly reference specific files
- **Smart Search**: Find files quickly with built-in search functionality
- **Customizable Templates**: Format your prompts exactly how you need with template editors
- **Easy Copy**: One-click copy of your prompt with all selected file contents

## Settings

### General Settings

- **Exclude Hidden Directories**: When enabled, directories starting with "." will be excluded (recommended for performance)
- **Max File Size (KB)**: Files larger than this size will be excluded to prevent token limit issues

### Template Customization

repo2text offers powerful template customization options:

#### Editor Prompt Template

Customize how prompts from the editor are formatted with these variables:
- `fileMap`: A visual representation of the file structure
- `fileContents`: The contents of selected files
- `userText`: Text entered by the user in the prompt editor

#### TreeView Prompt Template

Customize how prompts from the tree view are formatted with these variables:
- `fileMap`: A visual representation of the file structure
- `fileContents`: The contents of selected files

#### File Content Template

Customize how each file is displayed within the prompt:
- `filePath`: The path of the file relative to the workspace
- `fileContent`: The content of the file

## License

[MIT](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

