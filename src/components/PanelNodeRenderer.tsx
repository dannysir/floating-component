import React, { useCallback, useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { PanelNode, DropPosition, LayoutDirection } from "../tree/types";
import type { ComponentStore } from "../tree/componentStore";
import type { RegisterElement, GetSlot } from "../hooks/usePanelPlacement";
import { getDropTarget } from "../dnd/dropTarget";
import { createRafScheduler } from "../utils/rafScheduler";
import { devWarn } from "../utils/devWarn";
import type { DropPreview } from "./LayoutNodeRenderer";
import { useTouchDrag } from "../hooks/useTouchDrag";
import { isPanelDraggable, isPanelDroppable } from "../tree/lock";

// left/top/width/height는 usePanelPlacement가 slot 위치로 직접 쓴다. React가 덮어쓰지 않게 여기에 두지 않는다.
const PANEL_STYLE: CSSProperties = {
  position: "absolute",
  boxSizing: "border-box",
  overflow: "auto",
};

const SHADOW_STYLE: CSSProperties = {
  ...PANEL_STYLE,
  opacity: 0.5,
  outline: "2px dashed rgba(0, 120, 212, 0.6)",
  outlineOffset: -2,
};

interface PanelNodeRendererProps {
  node: PanelNode;
  components: ComponentStore;
  onMovePanel?: (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number) => void;
  onDropPreviewChange?: (preview: DropPreview | null) => void;
  shadowPanelId?: string;
  isPreviewActive?: boolean;
  dragHandleSelector?: string;
  direction: LayoutDirection;
  registerPanel: RegisterElement;
  getSlot: GetSlot;
}

export const PanelNodeRenderer = ({
  node,
  components,
  onMovePanel,
  onDropPreviewChange,
  shadowPanelId,
  isPreviewActive,
  dragHandleSelector,
  direction,
  registerPanel,
  getSlot,
}: PanelNodeRendererProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const schedulerRef = useRef<ReturnType<typeof createRafScheduler> | null>(null);
  if (schedulerRef.current === null) schedulerRef.current = createRafScheduler();

  const canDrag = isPanelDraggable(node);
  const canDrop = isPanelDroppable(node);

  useLayoutEffect(() => {
    if (!panelRef.current) return;
    return registerPanel(node.id, panelRef.current);
  }, [node.id, registerPanel]);

  useTouchDrag({
    panelRef,
    nodeId: node.id,
    direction,
    dragHandleSelector,
    draggable: canDrag,
    onDropPreviewChange,
    onMovePanel,
    getSlot,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!dragHandleSelector) return;
      const target = e.target as HTMLElement;
      const isHandle = !!target.closest(dragHandleSelector);
      if (panelRef.current) {
        panelRef.current.draggable = canDrag && isHandle;
      }
    },
    [dragHandleSelector, canDrag]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      // 내부 img/link 등의 네이티브 드래그가 버블링돼 패널 드래그로 오인되지 않게 한다.
      if (!canDrag) return;
      e.dataTransfer.setData("text/panel-id", node.id);
      e.dataTransfer.effectAllowed = "move";
      const root = e.currentTarget.closest("[data-tree-root]") as HTMLElement | null;
      if (root) root.dataset.draggingPanelId = node.id;
    },
    [node.id, canDrag]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const clientX = e.clientX;
      const clientY = e.clientY;

      const root = (e.currentTarget as HTMLElement).closest("[data-tree-root]") as HTMLElement | null;
      const sourcePanelId = root?.dataset.draggingPanelId;
      if (!sourcePanelId || sourcePanelId === node.id) return;

      // 드롭 불가 패널: 직전 미리보기는 유지하고 not-allowed 커서만 표시.
      // 여기서 놓으면 drop 없이 dragend로 끝나 이동이 취소된다.
      if (!canDrop) {
        e.dataTransfer.dropEffect = "none";
        return;
      }

      schedulerRef.current!.schedule(() => {
        // 드롭 위치는 골격의 slot 기준이다(조상 split을 slot의 DOM 조상에서 찾는다).
        const slotEl = getSlot(node.id);
        if (!slotEl) return;
        const { position, depth } = getDropTarget(clientX, clientY, slotEl, direction);
        onDropPreviewChange?.({ sourcePanelId, anchorPanelId: node.id, position, depth });
      });
    },
    [node.id, canDrop, onDropPreviewChange, direction, getSlot]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      // dropEffect "none"이라 보통 발생하지 않지만, 발생해도 루트의 미리보기 커밋으로 번지지 않게 막는다.
      if (!canDrop) {
        e.stopPropagation();
        return;
      }
      if (isPreviewActive) return;
      e.stopPropagation();
      onDropPreviewChange?.(null);
      const sourcePanelId = e.dataTransfer.getData("text/panel-id");
      const slotEl = getSlot(node.id);
      if (!sourcePanelId || sourcePanelId === node.id || !onMovePanel || !slotEl) return;
      const { position, depth } = getDropTarget(e.clientX, e.clientY, slotEl, direction);
      onMovePanel(sourcePanelId, node.id, position, depth);
    },
    [node.id, canDrop, isPreviewActive, onDropPreviewChange, onMovePanel, direction, getSlot]
  );

  const isShadow = node.id === shadowPanelId;

  let content = components.get(node.componentKey);
  if (!components.has(node.componentKey)) {
    devWarn(`No component registered for componentKey "${node.componentKey}" (panel "${node.id}").`);
    content = null;
  }

  return (
    <div
      ref={panelRef}
      data-panel-id={node.id}
      data-panel-droppable={canDrop ? undefined : "false"}
      draggable={canDrag && !dragHandleSelector}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={isShadow ? SHADOW_STYLE : PANEL_STYLE}
    >
      {content}
    </div>
  );
};
