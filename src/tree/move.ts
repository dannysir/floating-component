import type { LayoutNode, PanelNode, DropPosition } from "./types";
import { findAndUpdate } from "./helpers";
import { findPanelWithAncestors } from "./query";
import { insertAtAnchorDepth } from "./insert";
import { MOVE_GHOST_ID } from "./constants";

export const computeMoveResult = (
  tree: LayoutNode,
  sourcePanelId: string,
  anchorPanelId: string,
  position: DropPosition,
  depth: number,
): LayoutNode | null => {
  if (sourcePanelId === anchorPanelId) return null;

  const found = findPanelWithAncestors(tree, sourcePanelId);
  if (!found) return null;
  const sourcePanel = found.panel;

  const ghost: PanelNode = {type: "panel", id: MOVE_GHOST_ID, size: 1, component: null};
  const treeWithGhost = insertAtAnchorDepth(tree, ghost, anchorPanelId, position, depth);

  const treeWithoutSource = findAndUpdate(treeWithGhost, sourcePanelId, () => null);
  if (!treeWithoutSource) return null;

  const finalTree = findAndUpdate(treeWithoutSource, MOVE_GHOST_ID, () => ({...sourcePanel, size: 1}));
  return finalTree ?? null;
};
