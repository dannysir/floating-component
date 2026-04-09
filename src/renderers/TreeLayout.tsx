import React from "react";
import type { LayoutNode, DropPosition } from "../types";
import { LayoutNodeRenderer } from "./LayoutNodeRenderer";

interface TreeLayoutProps {
  tree: LayoutNode;
  onResizeBorder?: (path: number[], borderIndex: number, delta: number) => void;
  onMovePanel?: (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const TreeLayout = ({ tree, onResizeBorder, onMovePanel, className, style }: TreeLayoutProps) => (
  <div
    data-tree-root
    className={className}
    style={{ display: "flex", width: "100%", height: "100%", ...style }}
  >
    <LayoutNodeRenderer node={tree} onResizeBorder={onResizeBorder} onMovePanel={onMovePanel} />
  </div>
);
