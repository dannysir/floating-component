import type { ReactNode } from "react";

export type SplitDirection = "horizontal" | "vertical";

export interface PanelNode {
  type: "panel";
  id: string;
  size: number;
  component: ReactNode;
}

export interface SplitNode {
  type: "split";
  direction: SplitDirection;
  size: number;
  children: LayoutNode[];
}

export type LayoutNode = PanelNode | SplitNode;

export type DropPosition = "top" | "bottom" | "left" | "right";
