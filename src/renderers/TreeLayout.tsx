import React, { useRef, useState, useCallback, useMemo, useEffect, useId } from "react";
import type { LayoutNode, DropPosition } from "../types";
import { computeMoveResult } from "../hooks/useLayoutTree";
import { LayoutNodeRenderer } from "./LayoutNodeRenderer";
import type { DropPreview, ResizerTheme } from "./LayoutNodeRenderer";
import { devWarn } from "../utils/devWarn";

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

  backgroundColor?: string;
  margin?: number | string;
  padding?: number | string;

  resizerThickness?: number | string;
  resizerLength?: number | string;
  resizerColor?: string;
  resizerHoverOnly?: boolean;
}

export const TreeLayout = ({
  tree,
  onResizeBorder,
  onMovePanel,
  dragHandleSelector,
  backgroundColor,
  margin,
  padding,
  resizerThickness,
  resizerLength,
  resizerColor,
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
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const prevPreviewRef = useRef<DropPreview | null>(null);
  const previewRef = useRef<DropPreview | null>(null);

  const handleDropPreviewChange = useCallback((preview: DropPreview | null) => {
    const prev = prevPreviewRef.current;
    if (!preview && !prev) return;
    if (
      preview && prev &&
      prev.sourcePanelId === preview.sourcePanelId &&
      prev.anchorPanelId === preview.anchorPanelId &&
      prev.position === preview.position &&
      prev.depth === preview.depth
    ) return;
    prevPreviewRef.current = preview;
    previewRef.current = preview;
    setDropPreview(preview);
  }, []);

  const clearPreview = useCallback(() => {
    prevPreviewRef.current = null;
    previewRef.current = null;
    setDropPreview(null);
    if (rootRef.current) delete rootRef.current.dataset.draggingPanelId;
  }, [instanceId]);

  const previewTree = useMemo(() => {
    if (!dropPreview) return null;
    return computeMoveResult(
      tree,
      dropPreview.sourcePanelId,
      dropPreview.anchorPanelId,
      dropPreview.position,
      dropPreview.depth,
    );
  }, [tree, dropPreview]);

  const resizerTheme: ResizerTheme = {
    thickness: resizerThickness,
    length: resizerLength,
    color: resizerColor,
    hoverOnly: resizerHoverOnly,
  };

  return (
    <div
      ref={rootRef}
      data-tree-root={instanceId}
      style={{ display: "flex", backgroundColor, margin, padding }}
      onDrop={(e) => {
        e.preventDefault();
        const preview = previewRef.current;
        if (preview && onMovePanel) {
          onMovePanel(preview.sourcePanelId, preview.anchorPanelId, preview.position, preview.depth);
        }
        clearPreview();
      }}
      onDragEnd={() => clearPreview()}
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
        node={previewTree ?? tree}
        onResizeBorder={onResizeBorder}
        onMovePanel={onMovePanel}
        onDropPreviewChange={handleDropPreviewChange}
        shadowPanelId={dropPreview?.sourcePanelId}
        isPreviewActive={!!previewTree}
        resizerTheme={resizerTheme}
        dragHandleSelector={dragHandleSelector}
      />
    </div>
  );
};
