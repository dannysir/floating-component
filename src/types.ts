export type SplitDirection = "horizontal" | "vertical";

export interface PanelNode {
  id: string;
  type: "panel";
  size: number; // 0~1 비율
}

export interface SplitNode {
  id: string;
  type: "split";
  direction: SplitDirection;
  children: LayoutNode[];
}

export type LayoutNode = PanelNode | SplitNode;

export interface LayoutTree {
  root: LayoutNode;
}
