import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import "../TipTapEditor.css";

interface MentionListProps {
  items: any[];
  command: (item: any) => void;
}

export default forwardRef<any, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };
  
  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }
  
  const enterHandler = () => {
    selectItem(selectedIndex);
  };
  
  // Update refs when items change
  useEffect(() => setSelectedIndex(0), [props.items])

  
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }
      
      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }
      
      if (event.key === "Enter" || event.key === "Tab") {
        enterHandler();
        event.stopPropagation();
        event.preventDefault();
        return true;
      }      
      return false;
    },
  }));
  
  if (!props.items.length) {
    return <div className="dropdown-menu">No results</div>;
  }
  
  return (
    <div className="dropdown-menu">
      
      {props.items.map((item, index) => {
        const isSelected = index === selectedIndex;
                
        return (
          <div
            className={`dropdown-item ${isSelected ? "is-selected" : ""}`}
            key={index}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="dropdown-item-content">
              <div className="dropdown-item-left">
                <span 
                  title={item.id} 
                  className="dropdown-item-label"
                >
                  {item.label}
                </span>
              </div>
              
            </div>
          </div>
        );
      })}
    </div>
  );
});