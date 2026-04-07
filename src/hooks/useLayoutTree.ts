import { useState, useCallback } from "react";
import type { LayoutNode, PanelNode, SplitNode, SplitDirection } from "../types";

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

export const useLayoutTree = (initialTree: LayoutNode) => {
  const [tree, setTree] = useState<LayoutNode>(initialTree);

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

  return { tree, setTree, resizeBorder, splitPanel, removePanel };
};
