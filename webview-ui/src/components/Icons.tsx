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
      d="M12.75 7.99988C12.75 10.4852 10.7353 12.4999 8.24999 12.4999C6.41795 12.4999 4.84162 11.4051 4.13953 9.83404L2.74882 10.3989C3.67446 12.5185 5.78923 13.9999 8.24999 13.9999C11.5637 13.9999 14.25 11.3136 14.25 7.99988C14.25 4.68617 11.5637 1.99988 8.24999 1.99988C6.3169 1.99988 4.59732 2.91406 3.5 4.33367V2.49988H2V6.49988L2.75 7.24988H6.25V5.74988H4.35201C5.13008 4.40482 6.58436 3.49988 8.24999 3.49988C10.7353 3.49988 12.75 5.5146 12.75 7.99988Z"
      fill="#C5C5C5"
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

// Export a mapping object for easy access
export const Icons = {
  folder: FolderIcon,
  reset: ResetIcon,
  copy: CopyIcon,
};

export default Icons;
