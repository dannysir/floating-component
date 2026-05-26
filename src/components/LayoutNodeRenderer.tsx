import React, { useCallback, useRef } from "react";
import type { LayoutNode, DropPosition, LayoutDirection } from "../tree/types";
import type { ComponentStore } from "../tree/componentStore";
import { Resizer } from "./Resizer";
import { PanelNodeRenderer } from "./PanelNodeRenderer";
import { HORIZONTAL } from "../tree/constants";

export interface DropPreview {
  sourcePanelId: string;
  anchorPanelId: string;
  position: DropPosition;
  depth: number;
}

export interface ResizerTheme {
  thickness?: number | string;
  length?: number | string;
  color?: string;
  hoverColor?: string;
  hoverOnly?: boolean;
}

interface LayoutNodeRendererProps {
  node: LayoutNode;
  components: ComponentStore;
  path?: number[];
  onResizeBorder?: (path: number[], borderIndex: number, delta: number, totalPixels?: number) => void;
  onMovePanel?: (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number) => void;
  onDropPreviewChange?: (preview: DropPreview | null) => void;
  shadowPanelId?: string;
  isPreviewActive?: boolean;
  resizerTheme?: ResizerTheme;
  dragHandleSelector?: string;
  direction: LayoutDirection;
}

export const LayoutNodeRenderer = ({
  node,
  components,
  path = [],
  onResizeBorder,
  onMovePanel,
  onDropPreviewChange,
  shadowPanelId,
  isPreviewActive,
  resizerTheme,
  dragHandleSelector,
  direction,
}: LayoutNodeRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback(
    (borderIndex: number, pixelDelta: number) => {
      if (!onResizeBorder || !containerRef.current) return;
      if (node.type !== "split") return;

      const rect = containerRef.current.getBoundingClientRect();
      const totalSize = node.direction === HORIZONTAL ? rect.width : rect.height;
      if (totalSize === 0) return;

      const totalFlex = node.children.reduce((sum, child) => sum + child.size, 0);
      const ratioDelta = (pixelDelta / totalSize) * totalFlex;
      onResizeBorder(path, borderIndex, ratioDelta, totalSize);
    },
    [onResizeBorder, path, node]
  );

  if (node.type === "panel") {
    return (
      <PanelNodeRenderer
        node={node}
        components={components}
        onMovePanel={onMovePanel}
        onDropPreviewChange={onDropPreviewChange}
        shadowPanelId={shadowPanelId}
        isPreviewActive={isPreviewActive}
        dragHandleSelector={dragHandleSelector}
        direction={direction}
      />
    );
  }

  const elements: React.ReactNode[] = [];
  node.children.forEach((child, i) => {
    elements.push(
      <LayoutNodeRenderer
        key={child.type === "panel" ? child.id : `split-${i}`}
        node={child}
        components={components}
        path={[...path, i]}
        onResizeBorder={onResizeBorder}
        onMovePanel={onMovePanel}
        onDropPreviewChange={onDropPreviewChange}
        shadowPanelId={shadowPanelId}
        isPreviewActive={isPreviewActive}
        resizerTheme={resizerTheme}
        dragHandleSelector={dragHandleSelector}
        direction={direction}
      />
    );
    if (i < node.children.length - 1) {
      elements.push(
        <Resizer
          key={`resizer-${i}`}
          direction={node.direction}
          onResize={(delta) => handleResize(i, delta)}
          thickness={resizerTheme?.thickness}
          length={resizerTheme?.length}
          color={resizerTheme?.color}
          hoverColor={resizerTheme?.hoverColor}
          hoverOnly={resizerTheme?.hoverOnly}
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
        flexDirection: node.direction === HORIZONTAL ? "row" : "column",
        flex: node.size,
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {elements}
    </div>
  );
};
