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
  '.vs',
  'vendor',
  'coverage',
  '__pycache__'
  // '.*' pattern is now controlled by the excludeHiddenDirectories setting
];

/** File extensions considered binary (non-text) files */
export const BINARY_FILE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip',
  '.gz', '.tar', '.rar', '.exe', '.dll', '.bin',
  '.mp3', '.mp4', '.avi', '.mov', '.webm', '.ogg',
  '.wav', '.flac', '.psd', '.ai', '.bmp', '.tiff'
];
