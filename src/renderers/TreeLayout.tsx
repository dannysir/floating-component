import React, { useRef, useCallback, useMemo, useEffect, useId } from "react";
import type { LayoutNode, DropPosition, LayoutDirection } from "../tree/types";
import { COMPLEX } from "../tree/constants";
import { computeMoveResult } from "../hooks/useLayoutTree";
import { LayoutNodeRenderer } from "./LayoutNodeRenderer";
import type { ResizerTheme } from "./LayoutNodeRenderer";
import { useDropPreview } from "../hooks/useDropPreview";
import { devWarn } from "../utils/devWarn";
import { normalizeTreeDirection } from "../tree/normalize";

const collectPanelIds = (node: LayoutNode, ids: string[] = []): string[] => {
  if (node.type === "panel") {
    ids.push(node.id);
  } else {
    node.children.forEach((child) => collectPanelIds(child, ids));
  }
  return ids;
};

interface TreeLayoutProps {
  tree: LayoutNode;
  onResizeBorder?: (path: number[], borderIndex: number, delta: number, totalPixels?: number) => void;
  onMovePanel?: (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number) => void;
  dragHandleSelector?: string;
  direction?: LayoutDirection;

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
  onResizeBorder,
  onMovePanel,
  dragHandleSelector,
  direction = COMPLEX,
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
    const ids = collectPanelIds(tree);
    const seen = new Set<string>();
    ids.forEach((id) => {
      if (seen.has(id)) {
        devWarn(`Duplicate panel id detected: "${id}". Panel ids must be unique.`);
      }
      seen.add(id);
    });
  }, [tree]);

  const { preview, setPreview, clear, latestRef } = useDropPreview();

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
      style={{ display: "flex", backgroundColor, margin, padding }}
      onDrop={(e) => {
        e.preventDefault();
        const latest = latestRef.current;
        if (latest && onMovePanel) {
          onMovePanel(latest.sourcePanelId, latest.anchorPanelId, latest.position, latest.depth);
        }
        finishDrag();
      }}
      onDragEnd={() => finishDrag()}
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
        node={previewTree ?? normalizedTree}
        onResizeBorder={onResizeBorder}
        onMovePanel={onMovePanel}
        onDropPreviewChange={setPreview}
        shadowPanelId={preview?.sourcePanelId}
        isPreviewActive={!!previewTree}
        resizerTheme={resizerTheme}
        dragHandleSelector={dragHandleSelector}
        direction={direction}
      />
    </div>
  );
};
