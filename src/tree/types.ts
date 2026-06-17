import { HORIZONTAL, VERTICAL, COMPLEX, LEFT, RIGHT, TOP, BOTTOM } from "./constants";

export type SplitDirection = typeof HORIZONTAL | typeof VERTICAL;

export type LayoutDirection = typeof HORIZONTAL | typeof VERTICAL | typeof COMPLEX;

export interface PanelNode {
  type: "panel";
  id: string;
  size: number;
  componentKey: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface SplitNode {
  type: "split";
  direction: SplitDirection;
  size: number;
  children: LayoutNode[];
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export type LayoutNode = PanelNode | SplitNode;

export type DropPosition = typeof TOP | typeof BOTTOM | typeof LEFT | typeof RIGHT;

export interface InsertPanelInit {
  componentKey: string;
  id?: string;
  size?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface InsertAt {
  anchorId: string;
  position: DropPosition;
}
