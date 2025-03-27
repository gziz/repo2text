/**
 * Constants used throughout the Prompt Builder extension
 */

/** Directories commonly excluded from file operations */
export const COMMON_EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'build',
  'dist',
  'out',
  'bin',
  'obj',
  'target',
  '.idea',
  'vendor',
  'coverage',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.svn',
  '.vs',
  'venv',
  '.venv',
  'Build',
  '.vscode-test',
  'site-packages',
  '.gradle',
  '.mvn',
  '.cache',
  'gems',
];

/** File extensions considered binary (non-text) files */
export const EXCLUDED_FILE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip',
  '.gz', '.tar', '.rar', '.exe', '.dll', '.bin',
  '.mp3', '.mp4', '.avi', '.mov', '.webm', '.ogg',
  '.wav', '.flac', '.psd', '.ai', '.bmp', '.tiff',
  '.DS_Store', '-lock.json', '.lock', '.log', '.svg',
  '.dmg', '.tgz', '.7z', '.obj', '.o', '.o.d', '.a', '.lib',
  '.so', '.dylib', '.ncb', '.sdf', '.cur', '.mpg', '.mpeg',
  '.mkv', '.jar', '.onnx', '.parquet', '.pqt', '.webp', '.db',
  '.sqlite', '.wasm', '.plist', '.profraw', '.gcda', '.gcno',
  '.uasset', '.pdb', '.pag', '.swp', '.jsonl'
];
