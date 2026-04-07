import React from "react";
import type { LayoutNode } from "../types";
import { LayoutNodeRenderer } from "./LayoutNodeRenderer";

interface TreeLayoutProps {
  node: LayoutNode;
  renderPanel: (id: string) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TreeLayout = ({ node, renderPanel, className, style }: TreeLayoutProps) => (
  <div
    className={className}
    style={{ display: "flex", width: "100%", height: "100%", ...style }}
  >
    <LayoutNodeRenderer node={node} renderPanel={renderPanel} />
  </div>
);
