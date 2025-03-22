import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export const ChevronRightIcon: React.FC<IconProps> = ({ className, size = 16, color = 'currentColor' }) => {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 16 16" 
      xmlns="http://www.w3.org/2000/svg" 
      fill={color}
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M10.072 8.024L5.715 3.667l.618-.62L11 7.716v.618L6.333 13l-.618-.619 4.357-4.357z"
      />
    </svg>
  );
};

export const ChevronDownIcon: React.FC<IconProps> = ({ className, size = 16, color = 'currentColor' }) => {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 16 16" 
      xmlns="http://www.w3.org/2000/svg" 
      fill={color}
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"
      />
    </svg>
  );
};

export const CollapseAllIcon: React.FC<IconProps> = ({ className, size = 16, color = 'currentColor' }) => {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 16 16" 
      xmlns="http://www.w3.org/2000/svg" 
      fill={color}
    >
      <path d="M9 9H4v1h5V9z" />
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M5 3l1-1h7l1 1v7l-1 1h-2v2l-1 1H3l-1-1V6l1-1h2V3zm1 2h4l1 1v4h2V3H6v2zm4 1H3v7h7V6z"
      />
    </svg>
  );
};

// Add additional icons here as needed
export const FileIcon: React.FC<IconProps> = ({ className, size = 16, color = 'currentColor' }) => {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 16 16" 
      xmlns="http://www.w3.org/2000/svg" 
      fill={color}
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"
      />
    </svg>
  );
};

export const FolderIcon: React.FC<IconProps> = ({ className, size = 16, color = 'currentColor' }) => {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 16 16" 
      xmlns="http://www.w3.org/2000/svg" 
      fill={color}
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M14.5 3H7.71l-2-2H1.5L1 1.5v11l.5.5h13l.5-.5v-9L14.5 3zM14 5h-7.5L6 4 2 4V2h3.29l2 2H14v1zm0 1v6H2V5h4.43l.72.4.85.6H14z"
      />
    </svg>
  );
};

export const CloseIcon: React.FC<IconProps> = ({ className, size = 16, color = 'currentColor' }) => {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 16 16" 
      xmlns="http://www.w3.org/2000/svg" 
      fill={color}
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"
      />
    </svg>
  );
}; 