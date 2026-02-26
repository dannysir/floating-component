import { useState, useCallback } from "react";
import type { LayoutTree, LayoutNode, PanelNode, SplitDirection } from "../types";

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
      setTree((prev) => {
        const newPanel: PanelNode = {
          id: `panel-${Date.now()}`,
          type: "panel",
          size: 0.5,
        };

        function split(node: LayoutNode): LayoutNode {
          // 루트가 바로 대상인 경우 — 새 SplitNode로 감쌈
          if (node.id === panelId) {
            return {
              id: `split-${Date.now()}`,
              type: "split",
              direction,
              children: [node, newPanel],
            };
          }

          if (node.type === "split") {
            const targetIndex = node.children.findIndex((c) => c.id === panelId);

            if (targetIndex !== -1) {
              if (node.direction === direction) {
                // 같은 방향: 대상 뒤에 형제로 삽입 (트리 깊이 증가 없음)
                const newChildren = [...node.children];
                newChildren.splice(targetIndex + 1, 0, newPanel);
                return { ...node, children: newChildren };
              } else {
                // 다른 방향: 대상만 새 SplitNode로 감쌈
                return {
                  ...node,
                  children: node.children.map((child, i) =>
                    i === targetIndex
                      ? {
                          id: `split-${Date.now()}`,
                          type: "split" as const,
                          direction,
                          children: [child, newPanel],
                        }
                      : child
                  ),
                };
              }
            }

            return { ...node, children: node.children.map(split) };
          }

          return node;
        }

        return { root: split(prev.root) };
      });
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
