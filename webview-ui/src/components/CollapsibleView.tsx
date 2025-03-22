import React, { useState } from 'react';
import './CollapsibleView.css';

interface CollapsibleViewProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  badge?: number;
}

const CollapsibleView: React.FC<CollapsibleViewProps> = ({
  title,
  defaultExpanded = true,
  children,
  badge
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
            {isExpanded ? '▼' : '►'}
          </span>
          <span className="collapsible-title">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="badge">{badge}</span>
          )}
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