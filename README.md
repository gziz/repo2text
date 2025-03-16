# Repo2Prompt (IDE Extension)

This extension helps you generate prompts for AI models by including code context from your workspace. It allows you to select files and folders from your workspace, customize formatting templates, and generate prompts that include the file structure and contents.

![A screenshot of the sample extension.](./assets/hello-world.png)

## Features

- Select files and folders to include in your prompt
- Automatic file tree generation showing the structure of selected files
- Customizable templates for prompt and file content formatting

## Settings

The extension provides several customization options:

### General Settings

- **Exclude Hidden Directories**: When enabled, directories starting with "." will be excluded (highly recommended for performance reasons).
- **Max File Size (KB)**: Files larger than this size will be excluded from the prompt to prevent token limit issues.

### Template Customization

- **Prompt Template**: Customize how prompts are formatted. Available variables include:
  - `fileMap`: A visual representation of the file structure
  - `fileContents`: The contents of selected files
  - `userText`: Text entered by the user in the prompt editor

- **File Content Template**: Customize how each file is displayed within the prompt. Available variables include:
  - `filePath`: The path of the file relative to the workspace
  - `fileContent`: The content of the file

The templates use a rich text editor that allows for formatted text, helping you create well-structured prompts that work best with your preferred AI model.

