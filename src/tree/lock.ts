import type { LayoutNode, PanelNode } from "./types";

export const isPanelDraggable = (panel: PanelNode): boolean => panel.draggable !== false;

export const isPanelDroppable = (panel: PanelNode): boolean => panel.droppable !== false;

// SplitNode에는 잠금 개념이 없으므로 항상 resize에 참여한다.
const isNodeResizable = (node: LayoutNode): boolean =>
  node.type !== "panel" || node.resizable !== false;

export const canResizeBetween = (a: LayoutNode, b: LayoutNode): boolean =>
  isNodeResizable(a) && isNodeResizable(b);
