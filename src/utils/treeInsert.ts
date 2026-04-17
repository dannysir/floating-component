import type { LayoutNode, PanelNode, SplitDirection, DropPosition, InsertAt } from "../types";
import { updateAtPath, findPanelWithAncestors } from "./treeHelpers";
import { devWarn } from "./devWarn";

const appendToRoot = (tree: LayoutNode, panel: PanelNode): LayoutNode => {
  const insert: PanelNode = { ...panel, size: 1 };
  if (tree.type === "split") {
    return { ...tree, children: [...tree.children, insert] };
  }
  return {
    type: "split",
    direction: "horizontal",
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

export const insertAtAnchorDepth = (
  tree: LayoutNode,
  panelToInsert: PanelNode,
  anchorPanelId: string,
  position: DropPosition,
  depth: number = 0,
): LayoutNode => {
  const direction: SplitDirection =
    position === "left" || position === "right" ? "horizontal" : "vertical";
  const insertBefore = position === "left" || position === "top";
  const insert: PanelNode = { ...panelToInsert, size: 1 };

  const result = findPanelWithAncestors(tree, anchorPanelId);
  if (!result) return tree;

  const { ancestors } = result;
  const clampedDepth = Math.min(depth, ancestors.length);

  const insertAtRoot = (root: LayoutNode): LayoutNode => {
    if (root.type === "split" && root.direction === direction) {
      const newChildren = insertBefore
        ? [insert, ...root.children]
        : [...root.children, insert];
      return { ...root, children: newChildren };
    }
    const children = insertBefore
      ? [insert, { ...root, size: 1 }]
      : [{ ...root, size: 1 }, insert];
    return { type: "split" as const, direction, size: 1, children };
  };

  if (clampedDepth >= ancestors.length) {
    return insertAtRoot(tree);
  }

  if (clampedDepth === 0) {
    const insertAtTarget = (
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
          children: node.children.map((child) => insertAtTarget(child, node)),
        };
      }
      return node;
    };
    return insertAtTarget(tree);
  }

  const ancestorIdx = ancestors.length - clampedDepth;
  const parentInfo = ancestorIdx > 0 ? ancestors[ancestorIdx - 1] : null;

  if (!parentInfo) {
    return insertAtRoot(tree);
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
