import React, { useRef, useState, useCallback, useMemo } from "react";
import type { LayoutNode, DropPosition } from "../types";
import { computeMoveResult } from "../hooks/useLayoutTree";
import { LayoutNodeRenderer } from "./LayoutNodeRenderer";
import type { DropPreview } from "./LayoutNodeRenderer";

interface TreeLayoutProps {
  tree: LayoutNode;
  onResizeBorder?: (path: number[], borderIndex: number, delta: number) => void;
  onMovePanel?: (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const TreeLayout = ({ tree, onResizeBorder, onMovePanel, className, style }: TreeLayoutProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
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
  }, []);

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

  return (
    <div
      ref={rootRef}
      data-tree-root
      className={className}
      style={{ display: "flex", width: "100%", height: "100%", ...style }}
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
      />
    </div>
  );
};
