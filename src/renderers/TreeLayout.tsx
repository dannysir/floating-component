import React from "react";
import type { LayoutNode } from "../types";
import { LayoutNodeRenderer } from "./LayoutNodeRenderer";

interface TreeLayoutProps {
  tree: LayoutNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TreeLayout = ({ tree, className, style }: TreeLayoutProps) => (
  <div
    className={className}
    style={{ display: "flex", width: "100%", height: "100%", ...style }}
  >
    <LayoutNodeRenderer node={tree} />
  </div>
);
