import DOMPurify from "dompurify";
import { useMemo } from "react";
import { themeIcons } from "seti-file-icons";

export interface FileIconProps {
  filename: string;
  height?: string;
  width?: string;
}

export default function FileIcon({ filename, height = "20", width = "20" }: FileIconProps) {
  // Get the file extension or use the full filename for special cases
  const fileInfo = useMemo(() => {
    // Remove any path-like structure, focus only on filename
    let cleanName = filename;
    if (cleanName.includes("/")) {
      cleanName = cleanName.split("/").pop() || cleanName;
    }
    if (cleanName.includes("\\")) {
      cleanName = cleanName.split("\\").pop() || cleanName;
    }

    // Handle parentheses in filenames
    if (cleanName.includes(" (")) {
      const parts = cleanName.split(" ");
      parts.pop();
      cleanName = parts.join(" ");
    }

    // Extract extension - important for the icon library
    const dotIndex = cleanName.lastIndexOf(".");
    const extension = dotIndex > 0 ? cleanName.substring(dotIndex + 1) : "";

    return {
      name: cleanName,
      extension,
    };
  }, [filename]);

  // Set default icon colors using VS Code-like theme
  const getIcon = themeIcons({
    "blue": "#268bd2",
    "grey": "#657b83",
    "grey-light": "#839496",
    "green": "#859900",
    "orange": "#cb4b16",
    "pink": "#d33682",
    "purple": "#6c71c4",
    "red": "#dc322f",
    "white": "#fdf6e3",
    "yellow": "#b58900",
    "ignore": "#586e75",
  });

  try {
    // Get the icon data - pass the file with its extension for better icon matching
    const { svg, color } = getIcon(fileInfo.name);

    // Add inline SVG styling to ensure it's visible
    // Important: Some SVGs might not start with <svg but could have whitespace
    const svgStart = svg.indexOf("<svg");
    if (svgStart >= 0) {
      const svgWithStyle =
        svg.substring(0, svgStart) +
        `<svg style="width:${width}; height:${height}; display:block;" fill="${color}"` +
        svg.substring(svgStart + 4);

      const sanitizedSVG = DOMPurify.sanitize(svgWithStyle);

      return (
        <div
          className="file-icon-wrapper"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width,
            height,
          }}
          dangerouslySetInnerHTML={{ __html: sanitizedSVG }}
        />
      );
    }

    // If we can't find the svg tag, fallback to default icon
    throw new Error("Invalid SVG content");
  } catch (error) {
    console.error("Error rendering file icon:", error, "for file:", filename);

    // Return a visible fallback icon with appropriate color based on extension
    return (
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
        style={{
          display: "inline-block",
        }}>
        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        {fileInfo.extension && (
          <text x="12" y="16" fontSize="6" textAnchor="middle" fill="currentColor">
            {fileInfo.extension.toUpperCase().substring(0, 3)}
          </text>
        )}
      </svg>
    );
  }
}
