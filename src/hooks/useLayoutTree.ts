import { useState, useCallback } from "react";
import type { LayoutTree, LayoutNode, SplitDirection } from "../types";

function findAndUpdate(
  node: LayoutNode,
  targetId: string,
  updater: (node: LayoutNode) => LayoutNode
): LayoutNode {
  if (node.id === targetId) return updater(node);
  if (node.type === "split") {
    return {
      ...node,
      children: node.children.map((child) =>
        findAndUpdate(child, targetId, updater)
      ),
    };
  }
  return node;
}

export function useLayoutTree(initialTree: LayoutTree) {
  const [tree, setTree] = useState<LayoutTree>(initialTree);

  const resizePanel = useCallback((panelId: string, newSize: number) => {
    setTree((prev) => ({
      root: findAndUpdate(prev.root, panelId, (node) => ({
        ...node,
        size: Math.max(0, Math.min(1, newSize)),
      })),
    }));
  }, []);

  const splitPanel = useCallback(
    (panelId: string, direction: SplitDirection) => {
      setTree((prev) => ({
        root: findAndUpdate(prev.root, panelId, (node) => ({
          id: `split-${Date.now()}`,
          type: "split" as const,
          direction,
          children: [
            node,
            { id: `panel-${Date.now()}`, type: "panel" as const, size: 0.5 },
          ],
        })),
      }));
    },
    []
  );

  const removePanel = useCallback((panelId: string) => {
    setTree((prev) => {
      function remove(node: LayoutNode): LayoutNode | null {
        if (node.id === panelId) return null;
        if (node.type === "split") {
          const newChildren = node.children
            .map(remove)
            .filter((n): n is LayoutNode => n !== null);
          if (newChildren.length === 0) return null;
          if (newChildren.length === 1) return newChildren[0];
          return { ...node, children: newChildren };
        }
        return node;
      }
      const newRoot = remove(prev.root);
      return newRoot ? { root: newRoot } : prev;
    });
  }, []);

  return { tree, resizePanel, splitPanel, removePanel };
}
