import React, { useCallback, useRef } from "react";
import type { LayoutNode, DropPosition, SplitDirection } from "../tree/types";
import type { RegisterElement } from "../hooks/usePanelPlacement";
import { Resizer } from "./Resizer";
import { PanelSlot } from "./PanelSlot";
import { HORIZONTAL } from "../tree/constants";
import { panelSizeStyle } from "./panelSizeStyle";
import { canResizeBetween } from "../tree/lock";

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
  path?: number[];
  onResizeBorder?: (path: number[], borderIndex: number, delta: number, totalPixels?: number) => void;
  resizerTheme?: ResizerTheme;
  registerSlot: RegisterElement;
  parentDirection?: SplitDirection;
}

// 레이아웃 골격: 트리 모양대로 split(flex)과 Resizer를 그리고, 패널 자리에는 빈 slot만 둔다.
// 패널 자체는 TreeLayout이 slot 위치로 배치한다.
export const LayoutNodeRenderer = ({
  node,
  path = [],
  onResizeBorder,
  resizerTheme,
  registerSlot,
  parentDirection,
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
    return <PanelSlot node={node} parentDirection={parentDirection} registerSlot={registerSlot} />;
  }

  const elements: React.ReactNode[] = [];
  node.children.forEach((child, i) => {
    elements.push(
      <LayoutNodeRenderer
        key={child.type === "panel" ? child.id : `split-${i}`}
        node={child}
        path={[...path, i]}
        onResizeBorder={onResizeBorder}
        resizerTheme={resizerTheme}
        registerSlot={registerSlot}
        parentDirection={node.direction}
      />
    );
    if (i < node.children.length - 1 && canResizeBetween(child, node.children[i + 1])) {
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
        ...panelSizeStyle(parentDirection, node.minWidth, node.minHeight, node.maxWidth, node.maxHeight),
      }}
    >
      {elements}
    </div>
  );
};
