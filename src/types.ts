import type { ReactNode } from "react";

export type SplitDirection = "horizontal" | "vertical";

export interface PanelNode {
  type: "panel";
  id: string;
  size: number;
  component: ReactNode;
  minSize?: number;
  maxSize?: number;
}

export interface SplitNode {
  type: "split";
  direction: SplitDirection;
  size: number;
  children: LayoutNode[];
  minSize?: number;
  maxSize?: number;
}

export type LayoutNode = PanelNode | SplitNode;

export type DropPosition = "top" | "bottom" | "left" | "right";

export interface InsertPanelInit {
  component: ReactNode;
  id?: string;
  size?: number;
  minSize?: number;
  maxSize?: number;
}

export interface InsertAt {
  anchorId: string;
  position: DropPosition;
}
