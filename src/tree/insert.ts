import type { LayoutNode, PanelNode, SplitNode, SplitDirection, DropPosition, InsertAt } from "./types";
import { updateAtPath } from "./helpers";
import { findPanelWithAncestors } from "./query";
import { devWarn } from "../utils/devWarn";
import { HORIZONTAL, VERTICAL, LEFT, RIGHT, TOP } from "./constants";

type Ancestor = { split: SplitNode; childIndex: number };

const appendToRoot = (tree: LayoutNode, panel: PanelNode): LayoutNode => {
  const insert: PanelNode = { ...panel, size: 1 };
  if (tree.type === "split") {
    return { ...tree, children: [...tree.children, insert] };
  }
  return {
    type: "split",
    direction: HORIZONTAL,
    size: tree.size,
    children: [{ ...tree, size: 1 }, insert],
  };
};

export const insertPanelIntoTree = (
  tree: LayoutNode,
  panel: PanelNode,
  at?: InsertAt,
): LayoutNode => {
  if (!at) {
    return appendToRoot(tree, panel);
  }
  if (!findPanelWithAncestors(tree, at.anchorId)) {
    devWarn(`insertPanelIntoTree: anchor panel "${at.anchorId}" not found`);
    return tree;
  }
  return insertAtAnchorDepth(tree, panel, at.anchorId, at.position, 0);
};

const insertAtRootLevel = (
  root: LayoutNode,
  insert: PanelNode,
  direction: SplitDirection,
  insertBefore: boolean,
): LayoutNode => {
  if (root.type === "split" && root.direction === direction) {
    const newChildren = insertBefore
      ? [insert, ...root.children]
      : [...root.children, insert];
    return { ...root, children: newChildren };
  }
  const children = insertBefore
    ? [insert, { ...root, size: 1 }]
    : [{ ...root, size: 1 }, insert];
  return { type: "split", direction, size: 1, children };
};

const insertAtTargetLevel = (
  tree: LayoutNode,
  anchorPanelId: string,
  insert: PanelNode,
  direction: SplitDirection,
  insertBefore: boolean,
): LayoutNode => {
  const recurse = (
    node: LayoutNode,
    parent: LayoutNode | null = null,
  ): LayoutNode => {
    if (node.type === "panel" && node.id === anchorPanelId) {
      if (parent && parent.type === "split" && parent.direction === direction) return node;
      const children = insertBefore
        ? [insert, { ...node, size: 1 }]
        : [{ ...node, size: 1 }, insert];
      return { type: "split", direction, size: node.size, children };
    }
    if (node.type === "split") {
      const targetIndex = node.children.findIndex(
        (c) => c.type === "panel" && c.id === anchorPanelId,
      );
      if (targetIndex !== -1 && node.direction === direction) {
        const newChildren = [...node.children];
        const insertIdx = insertBefore ? targetIndex : targetIndex + 1;
        newChildren.splice(insertIdx, 0, insert);
        return { ...node, children: newChildren };
      }
      return {
        ...node,
        children: node.children.map((child) => recurse(child, node)),
      };
    }
    return node;
  };
  return recurse(tree);
};

const insertAtAncestorLevel = (
  tree: LayoutNode,
  ancestors: Ancestor[],
  clampedDepth: number,
  insert: PanelNode,
  direction: SplitDirection,
  insertBefore: boolean,
): LayoutNode => {
  const ancestorIdx = ancestors.length - clampedDepth;
  const parentInfo = ancestorIdx > 0 ? ancestors[ancestorIdx - 1] : null;

  if (!parentInfo) {
    return insertAtRootLevel(tree, insert, direction, insertBefore);
  }

  const targetChildIdx = parentInfo.childIndex;
  const pathToParent = ancestors.slice(0, ancestorIdx - 1).map((a) => a.childIndex);

  return updateAtPath(tree, pathToParent, (node) => {
    if (node.type !== "split") return node;

    if (node.direction === direction) {
      const newChildren = [...node.children];
      const insertIdx = insertBefore ? targetChildIdx : targetChildIdx + 1;
      newChildren.splice(insertIdx, 0, insert);
      return { ...node, children: newChildren };
    }

    const target = node.children[targetChildIdx];
    const wrappedChildren = insertBefore
      ? [insert, { ...target, size: 1 }]
      : [{ ...target, size: 1 }, insert];

    return {
      ...node,
      children: node.children.map((child, i) =>
        i === targetChildIdx
          ? { type: "split" as const, direction, size: target.size, children: wrappedChildren }
          : child,
      ),
    };
  });
};

export const insertAtAnchorDepth = (
  tree: LayoutNode,
  panelToInsert: PanelNode,
  anchorPanelId: string,
  position: DropPosition,
  depth: number = 0,
): LayoutNode => {
  const direction: SplitDirection =
    position === LEFT || position === RIGHT ? HORIZONTAL : VERTICAL;
  const insertBefore = position === LEFT || position === TOP;
  const insert: PanelNode = { ...panelToInsert, size: 1 };

  const result = findPanelWithAncestors(tree, anchorPanelId);
  if (!result) return tree;

  const { ancestors } = result;
  const clampedDepth = Math.min(depth, ancestors.length);

  if (clampedDepth >= ancestors.length) {
    return insertAtRootLevel(tree, insert, direction, insertBefore);
  }
  if (clampedDepth === 0) {
    return insertAtTargetLevel(tree, anchorPanelId, insert, direction, insertBefore);
  }
  return insertAtAncestorLevel(tree, ancestors, clampedDepth, insert, direction, insertBefore);
};
