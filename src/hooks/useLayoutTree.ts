import { useState, useCallback } from "react";
import type { LayoutNode, PanelNode, SplitNode, SplitDirection, DropPosition } from "../types";

const getNodeAtPath = (root: LayoutNode, path: number[]): LayoutNode | null => {
  let node = root;
  for (const idx of path) {
    if (node.type !== "split" || idx >= node.children.length) return null;
    node = node.children[idx];
  }
  return node;
};

const updateAtPath = (
  root: LayoutNode,
  path: number[],
  updater: (node: LayoutNode) => LayoutNode
): LayoutNode => {
  if (path.length === 0) return updater(root);
  if (root.type !== "split") return root;

  const [idx, ...rest] = path;
  return {
    ...root,
    children: root.children.map((child, i) =>
      i === idx ? updateAtPath(child, rest, updater) : child
    ),
  };
};

const findPanelWithAncestors = (
  root: LayoutNode,
  panelId: string,
): { panel: PanelNode; ancestors: { split: SplitNode; childIndex: number }[] } | null => {
  const ancestors: { split: SplitNode; childIndex: number }[] = [];

  const search = (node: LayoutNode): PanelNode | null => {
    if (node.type === "panel") return node.id === panelId ? node : null;
    for (let i = 0; i < node.children.length; i++) {
      ancestors.push({ split: node, childIndex: i });
      const found = search(node.children[i]);
      if (found) return found;
      ancestors.pop();
    }
    return null;
  };

  const panel = search(root);
  return panel ? { panel, ancestors: [...ancestors] } : null;
};

const findAndUpdate = (
  node: LayoutNode,
  panelId: string,
  updater: (node: LayoutNode, parent: SplitNode | null, index: number) => LayoutNode | null,
  parent: SplitNode | null = null,
  index: number = 0
): LayoutNode | null => {
  if (node.type === "panel" && node.id === panelId) {
    return updater(node, parent, index);
  }
  if (node.type === "split") {
    const newChildren = node.children
      .map((child, i) => findAndUpdate(child, panelId, updater, node, i))
      .filter((child): child is LayoutNode => child !== null);

    if (newChildren.length === 0) return null;
    if (newChildren.length === 1) return newChildren[0];
    return { ...node, children: newChildren };
  }
  return node;
};

const GHOST_ID = "__move_ghost__";

const insertPanelAtPosition = (
  tree: LayoutNode,
  panelToInsert: PanelNode,
  anchorPanelId: string,
  position: DropPosition,
  depth: number,
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
      parent: SplitNode | null = null,
    ): LayoutNode => {
      if (node.type === "panel" && node.id === anchorPanelId) {
        if (parent && parent.direction === direction) return node;
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

export const computeMoveResult = (
  tree: LayoutNode,
  sourcePanelId: string,
  anchorPanelId: string,
  position: DropPosition,
  depth: number,
): LayoutNode | null => {
  if (sourcePanelId === anchorPanelId) return null;

  let sourcePanel: PanelNode | null = null;
  const findPanel = (node: LayoutNode): void => {
    if (node.type === "panel" && node.id === sourcePanelId) {
      sourcePanel = node;
    } else if (node.type === "split") {
      node.children.forEach(findPanel);
    }
  };
  findPanel(tree);
  if (!sourcePanel) return null;

  const ghost: PanelNode = { type: "panel", id: GHOST_ID, size: 1, component: null };
  const treeWithGhost = insertPanelAtPosition(tree, ghost, anchorPanelId, position, depth);

  const treeWithoutSource = findAndUpdate(treeWithGhost, sourcePanelId, () => null);
  if (!treeWithoutSource) return null;

  const finalTree = findAndUpdate(treeWithoutSource, GHOST_ID, () => ({ ...sourcePanel!, size: 1 }));
  return finalTree ?? null;
};

export const useLayoutTree = (initialTree: LayoutNode) => {
  const [tree, setTree] = useState<LayoutNode>(initialTree);

  const resizeBorder = useCallback(
    (path: number[], borderIndex: number, delta: number) => {
      setTree((prev) => {
        const split = getNodeAtPath(prev, path);
        if (!split || split.type !== "split") return prev;
        if (borderIndex < 0 || borderIndex >= split.children.length - 1) return prev;

        const left = split.children[borderIndex];
        const right = split.children[borderIndex + 1];
        const totalSize = left.size + right.size;

        const newLeftSize = Math.max(0.05, Math.min(totalSize - 0.05, left.size + delta));
        const newRightSize = totalSize - newLeftSize;

        return updateAtPath(prev, path, (node) => {
          if (node.type !== "split") return node;
          return {
            ...node,
            children: node.children.map((child, i) => {
              if (i === borderIndex) return { ...child, size: newLeftSize };
              if (i === borderIndex + 1) return { ...child, size: newRightSize };
              return child;
            }),
          };
        });
      });
    },
    []
  );

  const splitPanel = useCallback(
    (panelId: string, direction: SplitDirection) => {
      setTree((prev) => {
        const newPanel: PanelNode = {
          type: "panel",
          id: `panel-${Date.now()}`,
          size: 0.5,
          component: null,
        };

        const result = findAndUpdate(prev, panelId, (node, parent) => {
          if (parent && parent.direction === direction) {
            return node;
          }
          return {
            type: "split",
            direction,
            size: node.size,
            children: [{ ...node, size: 1 }, { ...newPanel, size: 1 }],
          };
        });

        const insertSibling = (root: LayoutNode): LayoutNode => {
          if (root.type === "split") {
            const targetIndex = root.children.findIndex(
              (c) => c.type === "panel" && c.id === panelId
            );
            if (targetIndex !== -1 && root.direction === direction) {
              const newChildren = [...root.children];
              newChildren.splice(targetIndex + 1, 0, newPanel);
              return { ...root, children: newChildren };
            }
            return { ...root, children: root.children.map(insertSibling) };
          }
          return root;
        };

        if (result === prev) return prev;
        return result ? insertSibling(result) : prev;
      });
    },
    []
  );

  const removePanel = useCallback((panelId: string) => {
    setTree((prev) => {
      const result = findAndUpdate(prev, panelId, () => null);
      return result ?? prev;
    });
  }, []);

  const movePanel = useCallback(
    (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number = 0) => {
      setTree((prev) => computeMoveResult(prev, sourcePanelId, anchorPanelId, position, depth) ?? prev);
    },
    [],
  );

  return { tree, setTree, resizeBorder, splitPanel, removePanel, movePanel };
};
