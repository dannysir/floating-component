import React from "react";
import type { LayoutNode } from "../types";

export const LayoutNodeRenderer = ({
  node,
}: {
  node: LayoutNode;
}) => {
  if (node.type === "panel") {
    return (
      <div
        style={{ flex: node.size, minWidth: 0, minHeight: 0, overflow: "hidden" }}
      >
        {node.component}
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
      {node.children.map((child, i) => (
        <LayoutNodeRenderer
          key={child.type === "panel" ? child.id : `split-${i}`}
          node={child}
        />
      ))}
    </div>
  );
};
