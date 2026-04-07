import React from "react";
import type { LayoutNode } from "../types";

export const LayoutNodeRenderer = ({
  node,
  renderPanel,
}: {
  node: LayoutNode;
  renderPanel: (id: string) => React.ReactNode;
}) => {
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
};
