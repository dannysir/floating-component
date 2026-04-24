import React, { useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import type { PanelNode, DropPosition } from "../types";
import { getDropTarget } from "../utils/dropTarget";
import { createRafScheduler } from "../utils/rafBatch";
import type { DropPreview } from "./LayoutNodeRenderer";

const SHADOW_STYLE: CSSProperties = {
  opacity: 0.5,
  outline: "2px dashed rgba(0, 120, 212, 0.6)",
  outlineOffset: -2,
};

interface PanelNodeRendererProps {
  node: PanelNode;
  onMovePanel?: (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number) => void;
  onDropPreviewChange?: (preview: DropPreview | null) => void;
  shadowPanelId?: string;
  isPreviewActive?: boolean;
  dragHandleSelector?: string;
}

export const PanelNodeRenderer = ({
  node,
  onMovePanel,
  onDropPreviewChange,
  shadowPanelId,
  isPreviewActive,
  dragHandleSelector,
}: PanelNodeRendererProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const schedulerRef = useRef<ReturnType<typeof createRafScheduler> | null>(null);
  if (schedulerRef.current === null) schedulerRef.current = createRafScheduler();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!dragHandleSelector) return;
      const target = e.target as HTMLElement;
      const isHandle = !!target.closest(dragHandleSelector);
      if (panelRef.current) {
        panelRef.current.draggable = isHandle;
      }
    },
    [dragHandleSelector]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/panel-id", node.id);
      e.dataTransfer.effectAllowed = "move";
      const root = e.currentTarget.closest("[data-tree-root]") as HTMLElement | null;
      if (root) root.dataset.draggingPanelId = node.id;
    },
    [node.id]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const clientX = e.clientX;
      const clientY = e.clientY;
      const panelEl = e.currentTarget as HTMLElement;

      const root = panelEl.closest("[data-tree-root]") as HTMLElement | null;
      const sourcePanelId = root?.dataset.draggingPanelId;
      if (!sourcePanelId || sourcePanelId === node.id) return;

      schedulerRef.current!.schedule(() => {
        const { position, depth } = getDropTarget(clientX, clientY, panelEl);
        onDropPreviewChange?.({ sourcePanelId, anchorPanelId: node.id, position, depth });
      });
    },
    [node.id, onDropPreviewChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (isPreviewActive) return;
      e.stopPropagation();
      onDropPreviewChange?.(null);
      const sourcePanelId = e.dataTransfer.getData("text/panel-id");
      if (!sourcePanelId || sourcePanelId === node.id || !onMovePanel) return;
      const { position, depth } = getDropTarget(e.clientX, e.clientY, e.currentTarget as HTMLElement);
      onMovePanel(sourcePanelId, node.id, position, depth);
    },
    [node.id, isPreviewActive, onDropPreviewChange, onMovePanel]
  );

  const isShadow = node.id === shadowPanelId;

  return (
    <div
      ref={panelRef}
      draggable={!dragHandleSelector}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        flex: node.size,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        ...(isShadow ? SHADOW_STYLE : undefined),
      }}
    >
      {node.component}
    </div>
  );
};
