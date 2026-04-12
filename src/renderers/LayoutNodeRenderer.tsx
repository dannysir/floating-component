import React, { useCallback, useRef } from "react";
import type { LayoutNode, DropPosition } from "../types";
import { Resizer } from "./Resizer";

const ROOT_EDGE_RATIO = 0.05;
const SPLIT_EDGE_RATIO = 0.15;

export interface DropPreview {
  sourcePanelId: string;
  anchorPanelId: string;
  position: DropPosition;
  depth: number;
}

const getNearestEdge = (
  clientX: number,
  clientY: number,
  el: HTMLElement,
): { position: DropPosition; dist: number } => {
  const rect = el.getBoundingClientRect();
  const dists: Record<DropPosition, number> = {
    left: (clientX - rect.left) / rect.width,
    right: (rect.right - clientX) / rect.width,
    top: (clientY - rect.top) / rect.height,
    bottom: (rect.bottom - clientY) / rect.height,
  };
  const position = (Object.keys(dists) as DropPosition[]).reduce((a, b) =>
    dists[a] < dists[b] ? a : b,
  );
  return { position, dist: dists[position] };
};

const getDropTarget = (
  clientX: number,
  clientY: number,
  panelEl: HTMLElement,
): { position: DropPosition; depth: number } => {
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

  if (rootEl) {
    const { position, dist } = getNearestEdge(clientX, clientY, rootEl);
    if (dist < ROOT_EDGE_RATIO) {
      return { position, depth: splitEls.length + 1 };
    }
  }

  for (let i = splitEls.length - 1; i >= 0; i--) {
    const { position, dist } = getNearestEdge(clientX, clientY, splitEls[i]);
    if (dist < SPLIT_EDGE_RATIO) {
      return { position, depth: i + 1 };
    }
  }

  const { position } = getNearestEdge(clientX, clientY, panelEl);
  return { position, depth: 0 };
};

export const LayoutNodeRenderer = ({
  node,
  path = [],
  onResizeBorder,
  onMovePanel,
  onDropPreviewChange,
  shadowPanelId,
  isPreviewActive,
}: {
  node: LayoutNode;
  path?: number[];
  onResizeBorder?: (path: number[], borderIndex: number, delta: number) => void;
  onMovePanel?: (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number) => void;
  onDropPreviewChange?: (preview: DropPreview | null) => void;
  shadowPanelId?: string;
  isPreviewActive?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

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
    const isShadow = node.id === shadowPanelId;

    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/panel-id", node.id);
          e.dataTransfer.effectAllowed = "move";
          const root = e.currentTarget.closest("[data-tree-root]") as HTMLElement | null;
          if (root) root.dataset.draggingPanelId = node.id;
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";

          const clientX = e.clientX;
          const clientY = e.clientY;
          const panelEl = e.currentTarget as HTMLElement;

          const root = panelEl.closest("[data-tree-root]") as HTMLElement | null;
          const sourcePanelId = root?.dataset.draggingPanelId;
          if (!sourcePanelId || sourcePanelId === node.id) return;

          if (rafRef.current) return;
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            const { position, depth } = getDropTarget(clientX, clientY, panelEl);
            onDropPreviewChange?.({ sourcePanelId, anchorPanelId: node.id, position, depth });
          });
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (isPreviewActive) return;
          e.stopPropagation();
          onDropPreviewChange?.(null);
          const sourcePanelId = e.dataTransfer.getData("text/panel-id");
          if (!sourcePanelId || sourcePanelId === node.id || !onMovePanel) return;
          const { position, depth } = getDropTarget(e.clientX, e.clientY, e.currentTarget as HTMLElement);
          onMovePanel(sourcePanelId, node.id, position, depth);
        }}
        style={{
          flex: node.size,
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          ...(isShadow ? {
            opacity: 0.5,
            outline: "2px dashed rgba(59, 130, 246, 0.6)",
            outlineOffset: -2,
          } : undefined),
        }}
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
        onDropPreviewChange={onDropPreviewChange}
        shadowPanelId={shadowPanelId}
        isPreviewActive={isPreviewActive}
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
