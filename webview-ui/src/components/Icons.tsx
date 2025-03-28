import React from "react";

// Common icon interface
export interface IconProps {
  width?: string;
  height?: string;
  className?: string;
}

// Folder icon component
export const FolderIcon: React.FC<IconProps> = ({
  width = "16",
  height = "16",
  className = "",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

// Reset icon component
export const ResetIcon: React.FC<IconProps> = ({ width = "16", height = "16", className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M4.681 3H2V2h3.5l.5.5V6H5V4a5 5 0 1 0 4.53-.761l.302-.954A6 6 0 1 1 4.681 3z"
    />
  </svg>
);

// Copy icon component
export const CopyIcon: React.FC<IconProps> = ({ width = "16", height = "16", className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

// Editor icon component
export const EditorIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" {...props}>
    <path fill="currentColor" d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 0v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h5v2H7v-2z"/>
  </svg>
);

// Tree icon component
export const TreeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" {...props}>
    <path fill="currentColor" d="M19.5 2A1.5 1.5 0 0121 3.5V9a1.5 1.5 0 01-1.5 1.5H14v2h3.5a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5h-5a1.5 1.5 0 01-1.5-1.5v-5a1.5 1.5 0 011.5-1.5H16v-2H8v2h2.5a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5h-5a1.5 1.5 0 01-1.5-1.5v-5a1.5 1.5 0 011.5-1.5H8v-2H4.5A1.5 1.5 0 013 9V3.5A1.5 1.5 0 014.5 2h15zm-10 12H6v5h3.5v-5zm10 0H16v5h3.5v-5zm-10-10H6v5h3.5V4zm10 0H16v5h3.5V4z"/>
  </svg>
);

// Export a mapping object for easy access
export const Icons = {
  folder: FolderIcon,
  reset: ResetIcon,
  copy: CopyIcon,
  editor: EditorIcon,
  tree: TreeIcon,
};

export default Icons;
