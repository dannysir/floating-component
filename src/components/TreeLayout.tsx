import React from "react";
import type { LayoutNode } from "../types";

interface TreeLayoutProps {
  node: LayoutNode;
  renderPanel: (id: string) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function LayoutNodeRenderer({
  node,
  renderPanel,
}: {
  node: LayoutNode;
  renderPanel: (id: string) => React.ReactNode;
}) {
  if (node.type === "panel") {
    return (
      <div
        style={{ flex: node.size, minWidth: 0, minHeight: 0, overflow: "hidden" }}
      >
        {renderPanel(node.id)}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: node.direction === "horizontal" ? "row" : "column",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {node.children.map((child) => (
        <LayoutNodeRenderer key={child.id} node={child} renderPanel={renderPanel} />
      ))}
    </div>
  );
}

export function TreeLayout({ node, renderPanel, className, style }: TreeLayoutProps) {
  return (
    <div
      className={className}
      style={{ display: "flex", width: "100%", height: "100%", ...style }}
    >
      <LayoutNodeRenderer node={node} renderPanel={renderPanel} />
    </div>
  );
}
