import React, { useCallback, useRef } from "react";
import type { LayoutNode } from "../types";
import { Resizer } from "./Resizer";

export const LayoutNodeRenderer = ({
  node,
  path = [],
  onResizeBorder,
}: {
  node: LayoutNode;
  path?: number[];
  onResizeBorder?: (path: number[], borderIndex: number, delta: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback(
    (borderIndex: number, pixelDelta: number) => {
      if (!onResizeBorder || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const totalSize = node.type === "split"
        ? node.direction === "horizontal" ? rect.width : rect.height
        : 0;

      if (totalSize === 0 || node.type !== "split") return;
      const totalFlex = node.children.reduce((sum, child) => sum + child.size, 0);
      const ratioDelta = (pixelDelta / totalSize) * totalFlex;
      onResizeBorder(path, borderIndex, ratioDelta);
    },
    [onResizeBorder, path, node]
  );

  if (node.type === "panel") {
    return (
      <div
        style={{ flex: node.size, minWidth: 0, minHeight: 0, overflow: "hidden" }}
      >
        {node.component}
      </div>
    );
  }

  const elements: React.ReactNode[] = [];
  node.children.forEach((child, i) => {
    elements.push(
      <LayoutNodeRenderer
        key={child.type === "panel" ? child.id : `split-${i}`}
        node={child}
        path={[...path, i]}
        onResizeBorder={onResizeBorder}
      />
    );
    if (i < node.children.length - 1) {
      elements.push(
        <Resizer
          key={`resizer-${i}`}
          direction={node.direction}
          onResize={(delta) => handleResize(i, delta)}
        />
      );
    }
  });

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: node.direction === "horizontal" ? "row" : "column",
        flex: node.size,
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {elements}
    </div>
  );
};
