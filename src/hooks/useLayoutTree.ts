import { useState, useCallback, useMemo } from "react";
import type {
  LayoutNode,
  PanelNode,
  SplitDirection,
  DropPosition,
  InsertPanelInit,
  InsertAt,
} from "../types";
import { devWarn } from "../utils/devWarn";
import {
  getNodeAtPath,
  updateAtPath,
  findPanelWithAncestors,
  findAndUpdate,
} from "../utils/treeHelpers";
import { insertPanelIntoTree, insertAtAnchorDepth } from "../utils/treeInsert";
import { getRootPanelId, getPanelIds } from "../utils/treeQuery";

let _idCounter = 0;
const generatePanelId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `panel-${++_idCounter}-${Math.random().toString(36).slice(2, 9)}`;
};

const GHOST_ID = "__move_ghost__";

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
  const treeWithGhost = insertAtAnchorDepth(tree, ghost, anchorPanelId, position, depth);

  const treeWithoutSource = findAndUpdate(treeWithGhost, sourcePanelId, () => null);
  if (!treeWithoutSource) return null;

  const finalTree = findAndUpdate(treeWithoutSource, GHOST_ID, () => ({ ...sourcePanel!, size: 1 }));
  return finalTree ?? null;
};

export const useLayoutTree = (initialTree: LayoutNode) => {
  const [tree, setTree] = useState<LayoutNode>(initialTree);

  const rootPanelId = useMemo(() => getRootPanelId(tree), [tree]);
  const panelIds = useMemo(() => getPanelIds(tree), [tree]);
  const hasPanel = useCallback(
    (panelId: string) => findPanelWithAncestors(tree, panelId) !== null,
    [tree],
  );

  const resizeBorder = useCallback(
    (path: number[], borderIndex: number, delta: number, totalPixels?: number) => {
      setTree((prev) => {
        const split = getNodeAtPath(prev, path);
        if (!split || split.type !== "split") return prev;
        if (borderIndex < 0 || borderIndex >= split.children.length - 1) return prev;

        const left = split.children[borderIndex];
        const right = split.children[borderIndex + 1];
        const totalSize = left.size + right.size;

        const toFlex = (px: number) =>
          totalPixels && totalPixels > 0
            ? (px / totalPixels) * totalSize
            : 0;

        const leftMin = left.minSize !== undefined ? toFlex(left.minSize) : 0.05;
        const leftMax = left.maxSize !== undefined ? toFlex(left.maxSize) : totalSize - 0.05;
        const rightMin = right.minSize !== undefined ? toFlex(right.minSize) : 0.05;
        const rightMax = right.maxSize !== undefined ? toFlex(right.maxSize) : totalSize - 0.05;

        const clampedLeftMin = Math.max(leftMin, totalSize - rightMax);
        const clampedLeftMax = Math.min(leftMax, totalSize - rightMin);

        const newLeftSize = Math.max(clampedLeftMin, Math.min(clampedLeftMax, left.size + delta));
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
    (panelId: string, direction: SplitDirection, options?: { newPanel?: Partial<Omit<PanelNode, "type">> }): string => {
      const newId = options?.newPanel?.id ?? generatePanelId();

      setTree((prev) => {
        if (!findPanelWithAncestors(prev, panelId)) {
          devWarn(`splitPanel: panel "${panelId}" not found`);
          return prev;
        }
        const newPanel: PanelNode = {
          type: "panel",
          id: newId,
          size: options?.newPanel?.size ?? 0.5,
          component: options?.newPanel?.component ?? null,
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

      return newId;
    },
    []
  );

  const removePanel = useCallback((panelId: string) => {
    setTree((prev) => {
      if (!findPanelWithAncestors(prev, panelId)) {
        devWarn(`removePanel: panel "${panelId}" not found`);
        return prev;
      }
      const result = findAndUpdate(prev, panelId, () => null);
      return result ?? prev;
    });
  }, []);

  const movePanel = useCallback(
    (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number = 0) => {
      setTree((prev) => {
        if (!findPanelWithAncestors(prev, sourcePanelId)) {
          devWarn(`movePanel: source panel "${sourcePanelId}" not found`);
          return prev;
        }
        if (!findPanelWithAncestors(prev, anchorPanelId)) {
          devWarn(`movePanel: anchor panel "${anchorPanelId}" not found`);
          return prev;
        }
        return computeMoveResult(prev, sourcePanelId, anchorPanelId, position, depth) ?? prev;
      });
    },
    [],
  );

  const insertPanel = useCallback(
    (options: { panel: InsertPanelInit; at?: InsertAt }): string => {
      const { panel, at } = options;
      const newId = panel.id ?? generatePanelId();
      const newPanel: PanelNode = {
        type: "panel",
        id: newId,
        size: panel.size ?? 1,
        component: panel.component,
        minSize: panel.minSize,
        maxSize: panel.maxSize,
      };

      setTree((prev) => insertPanelIntoTree(prev, newPanel, at));

      return newId;
    },
    [],
  );

  return {
    tree,
    setTree,
    rootPanelId,
    panelIds,
    hasPanel,
    resizeBorder,
    splitPanel,
    removePanel,
    movePanel,
    insertPanel,
  };
};
