import { useState, useCallback } from "react";
import type { LayoutNode, PanelNode, SplitNode, SplitDirection } from "../types";

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

  const resizePanel = useCallback((panelId: string, newSize: number) => {
    setTree((prev) => {
      const result = findAndUpdate(prev, panelId, (node) => ({
        ...node,
        size: Math.max(0, Math.min(1, newSize)),
      }));
      return result ?? prev;
    });
  }, []);

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
            // 같은 방향이면 부모에 형제로 추가 (호출 측에서 처리 불가 → 별도 로직)
            return node;
          }
          // 다른 방향이거나 부모가 없으면 새 split으로 감쌈
          return {
            type: "split",
            direction,
            children: [node, newPanel],
          };
        });

        // 같은 방향인 경우: 부모 split의 children에 직접 삽입
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
        // result가 이미 감싸진 경우 그대로 반환
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

  return { tree, setTree, resizePanel, splitPanel, removePanel };
};
