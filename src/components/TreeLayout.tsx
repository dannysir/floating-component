import React, { useRef, useCallback, useMemo, useEffect, useId } from "react";
import type { LayoutNode, PanelNode, DropPosition, LayoutDirection } from "../tree/types";
import type { ComponentStore } from "../tree/componentStore";
import { COMPLEX } from "../tree/constants";
import { computeMoveResult } from "../tree/move";
import { LayoutNodeRenderer } from "./LayoutNodeRenderer";
import type { ResizerTheme } from "./LayoutNodeRenderer";
import { PanelNodeRenderer } from "./PanelNodeRenderer";
import { useDropPreview } from "../hooks/useDropPreview";
import { usePanelPlacement } from "../hooks/usePanelPlacement";
import { devWarn } from "../utils/devWarn";
import { normalizeTreeDirection } from "../tree/normalize";

const collectPanels = (node: LayoutNode, panels: PanelNode[] = []): PanelNode[] => {
  if (node.type === "panel") {
    panels.push(node);
  } else {
    node.children.forEach((child) => collectPanels(child, panels));
  }
  return panels;
};

// 패널의 DOM 순서를 고정한다: 남은 패널은 기존 순서를 유지하고 새 패널만 뒤에 붙인다.
// 순서가 바뀌면 React가 DOM 노드를 떼었다 붙이고, 그러면 스크롤이 초기화되고 iframe이 다시 로드된다.
// 화면 위치는 DOM 순서가 아니라 slot 좌표로 정해진다.
const useStablePanelOrder = (tree: LayoutNode): PanelNode[] => {
  const orderRef = useRef<string[]>([]);
  return useMemo(() => {
    const byId = new Map<string, PanelNode>();
    collectPanels(tree).forEach((panel) => {
      if (!byId.has(panel.id)) byId.set(panel.id, panel);
    });
    const kept = orderRef.current.filter((id) => byId.has(id));
    const keptSet = new Set(kept);
    const added = [...byId.keys()].filter((id) => !keptSet.has(id));
    orderRef.current = [...kept, ...added];
    return orderRef.current.map((id) => byId.get(id)!);
  }, [tree]);
};

interface TreeLayoutProps {
  tree: LayoutNode;
  components: ComponentStore;
  onResizeBorder?: (path: number[], borderIndex: number, delta: number, totalPixels?: number) => void;
  onMovePanel?: (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number) => void;
  dragHandleSelector?: string;
  direction?: LayoutDirection;

  width?: number | string;
  height?: number | string;
  backgroundColor?: string;
  margin?: number | string;
  padding?: number | string;

  resizerThickness?: number | string;
  resizerLength?: number | string;
  resizerColor?: string;
  resizerHoverColor?: string;
  resizerHoverOnly?: boolean;
}

export const TreeLayout = ({
  tree,
  components,
  onResizeBorder,
  onMovePanel,
  dragHandleSelector,
  direction = COMPLEX,
  width,
  height,
  backgroundColor,
  margin,
  padding,
  resizerThickness,
  resizerLength,
  resizerColor,
  resizerHoverColor,
  resizerHoverOnly,
}: TreeLayoutProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();

  useEffect(() => {
    const ids = collectPanels(tree).map((panel) => panel.id);
    const seen = new Set<string>();
    ids.forEach((id) => {
      if (seen.has(id)) {
        devWarn(`Duplicate panel id detected: "${id}". Panel ids must be unique.`);
      }
      seen.add(id);
    });
  }, [tree]);

  const { preview, setPreview, clear, latestRef } = useDropPreview();
  const { registerSlot, registerPanel, getSlot } = usePanelPlacement(rootRef);

  const clearPreview = useCallback(() => {
    clear();
  }, [clear]);

  const finishDrag = useCallback(() => {
    clear();
    if (rootRef.current) delete rootRef.current.dataset.draggingPanelId;
  }, [clear]);

  const { tree: normalizedTree, changed: directionChanged } = useMemo(
    () => normalizeTreeDirection(tree, direction),
    [tree, direction],
  );

  useEffect(() => {
    if (directionChanged) {
      devWarn(
        `Tree contains splits that don't match direction="${direction}". ` +
        `These splits were normalized to match. Update your initial tree to avoid this warning.`,
      );
    }
  }, [directionChanged, direction]);

  const previewTree = useMemo(() => {
    if (!preview) return null;
    return computeMoveResult(
      normalizedTree,
      preview.sourcePanelId,
      preview.anchorPanelId,
      preview.position,
      preview.depth,
    );
  }, [normalizedTree, preview]);

  const displayedTree = previewTree ?? normalizedTree;
  const panels = useStablePanelOrder(displayedTree);

  const resizerTheme = useMemo<ResizerTheme>(
    () => ({
      thickness: resizerThickness,
      length: resizerLength,
      color: resizerColor,
      hoverColor: resizerHoverColor,
      hoverOnly: resizerHoverOnly,
    }),
    [resizerThickness, resizerLength, resizerColor, resizerHoverColor, resizerHoverOnly],
  );

  return (
    <div
      ref={rootRef}
      data-tree-root={instanceId}
      style={{
        position: "relative",
        display: "flex",
        width: width ?? "100%",
        height: height ?? "100%",
        minWidth: 0,
        minHeight: 0,
        boxSizing: "border-box",
        backgroundColor,
        margin,
        padding,
      }}
      onDrop={(e) => {
        e.preventDefault();
        const latest = latestRef.current;
        if (latest && onMovePanel) {
          onMovePanel(latest.sourcePanelId, latest.anchorPanelId, latest.position, latest.depth);
        }
        finishDrag();
      }}
      onDragStart={(e) => {
        // 패널 handleDragStart가 먼저 실행돼 draggingPanelId를 설정한 경우(=패널 드래그)만 처리.
        if (!rootRef.current?.dataset.draggingPanelId) return;
        // dragend는 드래그를 시작한 원본 노드로 온다. 드래그 중 원본이 문서에서 분리되면
        // (패널 내용이 다시 그려지거나 소스 패널이 제거되는 경우) 루트까지 버블링되지 않으므로, 원본 노드에 직접 건다.
        e.target.addEventListener("dragend", finishDrag, { once: true });
      }}
      onDragLeave={(e) => {
        const root = rootRef.current;
        if (!root) return;
        const related = e.relatedTarget as Node | null;
        if (!related || !root.contains(related)) {
          clearPreview();
        }
      }}
    >
      <LayoutNodeRenderer
        node={displayedTree}
        onResizeBorder={onResizeBorder}
        resizerTheme={resizerTheme}
        registerSlot={registerSlot}
      />
      {panels.map((panel) => (
        <PanelNodeRenderer
          key={panel.id}
          node={panel}
          components={components}
          onMovePanel={onMovePanel}
          onDropPreviewChange={setPreview}
          shadowPanelId={preview?.sourcePanelId}
          isPreviewActive={!!previewTree}
          dragHandleSelector={dragHandleSelector}
          direction={direction}
          registerPanel={registerPanel}
          getSlot={getSlot}
        />
      ))}
    </div>
  );
};
