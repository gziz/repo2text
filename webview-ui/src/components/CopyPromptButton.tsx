import React from "react";
import { CopyIcon } from "./Icons";
import "./TipTapEditor.css";

interface CopyPromptButtonProps {
  onClick: () => void;
}

const CopyPromptButton: React.FC<CopyPromptButtonProps> = ({ onClick }) => {
  return (
    <button className="copy-prompt-button" onClick={onClick}>
      <CopyIcon />
    </button>
  );
};

export default CopyPromptButton;
