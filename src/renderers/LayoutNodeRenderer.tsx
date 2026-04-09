import React, { useCallback, useRef } from "react";
import type { LayoutNode, DropPosition } from "../types";
import { Resizer } from "./Resizer";

const ROOT_EDGE_RATIO = 0.05;
const SPLIT_EDGE_RATIO = 0.15;

const getNearestEdge = (
  e: React.DragEvent,
  el: HTMLElement,
): { position: DropPosition; dist: number } => {
  const rect = el.getBoundingClientRect();
  const dists: Record<DropPosition, number> = {
    left: (e.clientX - rect.left) / rect.width,
    right: (rect.right - e.clientX) / rect.width,
    top: (e.clientY - rect.top) / rect.height,
    bottom: (rect.bottom - e.clientY) / rect.height,
  };
  const position = (Object.keys(dists) as DropPosition[]).reduce((a, b) =>
    dists[a] < dists[b] ? a : b,
  );
  return { position, dist: dists[position] };
};

const getDropTarget = (
  e: React.DragEvent,
  panelEl: HTMLElement,
): { position: DropPosition; depth: number } => {
  // Collect ancestor splits (innermost first) and root
  const splitEls: HTMLElement[] = [];
  let rootEl: HTMLElement | null = null;
  let cur: HTMLElement | null = panelEl.parentElement;
  while (cur) {
    if (cur.hasAttribute("data-tree-root")) {
      rootEl = cur;
      break;
    }
    if (cur.hasAttribute("data-layout-split")) {
      splitEls.push(cur);
    }
    cur = cur.parentElement;
  }

  // Check from outermost to innermost so outer edges take priority
  // 1. Root edge (narrow zone)
  if (rootEl) {
    const { position, dist } = getNearestEdge(e, rootEl);
    if (dist < ROOT_EDGE_RATIO) {
      return { position, depth: splitEls.length + 1 };
    }
  }

  // 2. Split edges (outermost first)
  for (let i = splitEls.length - 1; i >= 0; i--) {
    const { position, dist } = getNearestEdge(e, splitEls[i]);
    if (dist < SPLIT_EDGE_RATIO) {
      return { position, depth: i + 1 };
    }
  }

  // 3. Panel level (center area)
  const { position } = getNearestEdge(e, panelEl);
  return { position, depth: 0 };
};

export const LayoutNodeRenderer = ({
  node,
  path = [],
  onResizeBorder,
  onMovePanel,
}: {
  node: LayoutNode;
  path?: number[];
  onResizeBorder?: (path: number[], borderIndex: number, delta: number) => void;
  onMovePanel?: (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number) => void;
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
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/panel-id", node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const sourcePanelId = e.dataTransfer.getData("text/panel-id");
          if (!sourcePanelId || sourcePanelId === node.id || !onMovePanel) return;
          const { position, depth } = getDropTarget(e, e.currentTarget as HTMLElement);
          onMovePanel(sourcePanelId, node.id, position, depth);
        }}
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
        onMovePanel={onMovePanel}
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
      data-layout-split
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
