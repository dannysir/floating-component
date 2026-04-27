import type { ReactNode } from "react";
import { HORIZONTAL, VERTICAL, COMPLEX, LEFT, RIGHT, TOP, BOTTOM } from "./constants/layout";

export type SplitDirection = typeof HORIZONTAL | typeof VERTICAL;

export type LayoutDirection = typeof HORIZONTAL | typeof VERTICAL | typeof COMPLEX;

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

export type DropPosition = typeof TOP | typeof BOTTOM | typeof LEFT | typeof RIGHT;

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
