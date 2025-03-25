import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { MentionItem } from "../types/types";
import FileIcon from "./FileIcon";
import { FolderIcon } from "./Icons";
import "./TipTapEditor.css";

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
  query?: string;
  onClose?: () => void;
}

export default forwardRef<any, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((prevIndex) => {
      const newIndex = (prevIndex + props.items.length - 1) % props.items.length;
      itemRefs.current[newIndex]?.scrollIntoView({
        behavior: "instant" as ScrollBehavior,
        block: "nearest",
      });
      return newIndex;
    });
  };

  const downHandler = () => {
    setSelectedIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % props.items.length;
      itemRefs.current[newIndex]?.scrollIntoView({
        behavior: "instant" as ScrollBehavior,
        block: "nearest",
      });
      return newIndex;
    });
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  // Update refs when items change
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, props.items.length);
    setSelectedIndex(0);
  }, [props.items]);

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

      if (event.key === "Escape") {
        if (props.onClose) {
          props.onClose();
        }
        event.preventDefault();
        event.stopPropagation();
        return true;
      }

      // Handle space to select single item
      if (event.key === " ") {
        if (props.items.length === 1) {
          enterHandler();
          return true;
        }
      }

      return false;
    },
  }));

  if (!props.items.length) {
    return (
      <div className="dropdown-menu">
        <div className="dropdown-header">No results</div>
      </div>
    );
  }

  return (
    <div className="dropdown-menu">
      <div className="dropdown-header">Type to search...</div>

      {props.items.map((item, index) => {
        const isSelected = index === selectedIndex;

        return (
          <div
            ref={(el) => (itemRefs.current[index] = el)}
            className={`dropdown-item ${isSelected ? "is-selected" : ""}`}
            key={index}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            data-testid="dropdown-item">
            <div className="dropdown-item-content">
              <div className="dropdown-item-left">
                <span className="dropdown-item-icon">
                  {item.type === "file" ? (
                    <FileIcon filename={item.label}/>
                  ) : (
                    <FolderIcon width="16" height="16" />
                  )}
                </span>
                <span title={item.id} className="dropdown-item-label">
                  {item.label}
                </span>
              </div>

              <div className="dropdown-item-right">
                {item.description && (
                  <span className="dropdown-item-description">{item.description}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
