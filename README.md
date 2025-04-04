# RepoText

A VS Code extension that allows you to export your entire codebase or specific files into a single LLM-friendly text, directly from your IDE, no external tools needed.
See a demo [here](https://repotext.gziz.io)!

## Features

- **Contextual Code Selection**: Select files and folders from your workspace to include as context in your AI prompts
- **Dual Selection Methods**:
  - Tree view with checkboxes for selecting multiple files/folders
  - @mention support in the editor to quickly reference specific files
- **Smart Search**: Find files quickly with built-in search functionality
- **Customizable Templates**: Format your prompts exactly how you need with template editors
- **Easy Copy**: One-click copy of your prompt with all selected file contents
- **Token Counter**: See estimated token usage for your selection
- **Performance Optimizations**: 
  - Respects .gitignore patterns
  - Optional exclusion of hidden directories
  - File size limits to prevent token overflow

## Installation

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=gziz.repotext)
2. Access RepoText from the activity bar in VS Code
3. Select files/folders or use @mentions to include them in your prompt

## Usage

### Tree View Selection
1. Use the tree view panel to browse your project files
2. Check the boxes next to files or folders you want to include
3. Use the search box to quickly find specific files
4. Click "Copy" to copy the formatted code with file structure to your clipboard

### Editor Selection with @Mentions
1. Type your prompt in the editor
2. Use the @ symbol to mention files (e.g., @app.js)
3. Select from the autocomplete dropdown
4. Click "Copy" to copy your prompt with the referenced code

## Settings

### General Settings

- **Exclude Hidden Directories**: When enabled, directories starting with "." will be excluded (recommended for performance)
- **Respect .gitignore**: When enabled, files and directories listed in your .gitignore will be excluded
- **Max File Size (MB)**: Files larger than this size will be excluded to prevent token limit issues

### Template Customization

RepoText offers powerful template customization options:

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
