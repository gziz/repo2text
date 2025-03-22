import React, { useState } from 'react';
import './CollapsibleView.css';
import { ChevronRightIcon, ChevronDownIcon } from '../icons';

interface CollapsibleViewProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const CollapsibleView: React.FC<CollapsibleViewProps> = ({
  title,
  defaultExpanded = true,
  children
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="collapsible-view">
      <div className="collapsible-header" onClick={toggleExpand}>
        <div className="collapsible-header-content">
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </span>
          <span className="collapsible-title">{title}</span>
        </div>
      </div>
      {isExpanded && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleView; 