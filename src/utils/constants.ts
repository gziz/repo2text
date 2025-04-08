/**
 * Constants used throughout the Prompt Builder extension
 */

/** Directories commonly excluded from file operations */
export const COMMON_EXCLUDED_DIRS = [
  "node_modules",
  ".git",
  "build",
  "dist",
  "out",
  "bin",
  "obj",
  "target",
  ".idea",
  "vendor",
  "coverage",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".svn",
  ".vs",
  "venv",
  ".venv",
  "Build",
  ".vscode-test",
  "site-packages",
  ".gradle",
  ".mvn",
  ".cache",
  "gems",
];

/** File extensions considered binary (non-text) files */
export const EXCLUDED_FILE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".rar",
  ".exe",
  ".dll",
  ".bin",
  ".mp3",
  ".mp4",
  ".avi",
  ".mov",
  ".webm",
  ".ogg",
  ".wav",
  ".flac",
  ".psd",
  ".ai",
  ".bmp",
  ".tiff",
  ".DS_Store",
  "-lock.json",
  ".lock",
  ".log",
  ".dmg",
  ".tgz",
  ".7z",
  ".obj",
  ".o",
  ".o.d",
  ".a",
  ".lib",
  ".so",
  ".dylib",
  ".ncb",
  ".sdf",
  ".cur",
  ".mpg",
  ".mpeg",
  ".mkv",
  ".jar",
  ".onnx",
  ".parquet",
  ".pqt",
  ".webp",
  ".db",
  ".sqlite",
  ".wasm",
  ".plist",
  ".profraw",
  ".gcda",
  ".gcno",
  ".uasset",
  ".pdb",
  ".pag",
  ".swp",
  ".jsonl",
  ".ico",
];

/** File size constants */
export const DEFAULT_MAX_FILE_SIZE_MB = 5;
export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * 1024;
export const PRECISION_FACTOR = 100; // For rounding to 2 decimal places

/** Cache constants */
export const TOKEN_CACHE_INVALIDATION_MS = 300000; // 5 minutes in milliseconds

/** Configuration keys */
export const CONFIG_KEYS = {
  EXCLUDE_HIDDEN_DIRS: 'excludeHiddenDirectories',
  RESPECT_GITIGNORE: 'respectGitignore',
  MAX_FILE_SIZE_MB: 'maxFileSizeMB',
  EDITOR_TEMPLATE_STRING: 'editorTemplateString',
  TREE_VIEW_TEMPLATE_STRING: 'treeViewTemplateString',
  FILE_TEMPLATE_STRING: 'fileTemplateString'
};

/** Default template values */
export const DEFAULT_TEMPLATES = {
  EDITOR_TEMPLATE: "<file_map>\n{{fileMap}}\n</file_map>\n\n<file_contents>\n{{fileContents}}\n</file_contents>\n\n<user>\n{{userText}}\n</user>",
  TREE_VIEW_TEMPLATE: "<file_map>\n{{fileMap}}\n</file_map>\n\n<file_contents>\n{{fileContents}}\n</file_contents>",
  FILE_TEMPLATE: "-------------------------\n{{filePath}}\n-------------------------\n{{fileContent}}\n"
};
