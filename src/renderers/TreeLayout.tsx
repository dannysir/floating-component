import React from "react";
import type { LayoutNode } from "../types";
import { LayoutNodeRenderer } from "./LayoutNodeRenderer";

interface TreeLayoutProps {
  tree: LayoutNode;
  onResizeBorder?: (path: number[], borderIndex: number, delta: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const TreeLayout = ({ tree, onResizeBorder, className, style }: TreeLayoutProps) => (
  <div
    className={className}
    style={{ display: "flex", width: "100%", height: "100%", ...style }}
  >
    <LayoutNodeRenderer node={tree} onResizeBorder={onResizeBorder} />
  </div>
);
