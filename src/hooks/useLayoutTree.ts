import {useState, useCallback, useMemo} from "react";
import type {
  LayoutNode,
  PanelNode,
  SplitDirection,
  DropPosition,
  InsertPanelInit,
  InsertAt,
} from "../tree/types";
import {devWarn} from "../utils/devWarn";
import {getNodeAtPath, updateAtPath, findAndUpdate} from "../tree/helpers";
import {insertPanelIntoTree} from "../tree/insert";
import {splitPanelAtId} from "../tree/split";
import {clampSplitResize} from "../tree/resize";
import {getFirstPanelId, getPanelIds, findPanelWithAncestors} from "../tree/query";
import {DEFAULT_SPLIT_RATIO} from "../tree/constants";
import {computeMoveResult} from "../tree/move";

let _idCounter = 0;
const generatePanelId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `panel-${++_idCounter}-${Math.random().toString(36).slice(2, 9)}`;
};

const withPanelCheck = (
  prev: LayoutNode,
  panelId: string,
  label: string,
  fn: (prev: LayoutNode) => LayoutNode,
): LayoutNode => {
  if (!findPanelWithAncestors(prev, panelId)) {
    devWarn(`${label}: panel "${panelId}" not found`);
    return prev;
  }
  return fn(prev);
};

export const useLayoutTree = (initialTree: LayoutNode) => {
  const [tree, setTree] = useState<LayoutNode>(initialTree);

  const firstPanelId = useMemo(() => getFirstPanelId(tree), [tree]);
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
        const {leftSize, rightSize} = clampSplitResize(left, right, delta, totalPixels);

        return updateAtPath(prev, path, (node) => {
          if (node.type !== "split") return node;
          return {
            ...node,
            children: node.children.map((child, i) => {
              if (i === borderIndex) return {...child, size: leftSize};
              if (i === borderIndex + 1) return {...child, size: rightSize};
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

      setTree((prev) =>
        withPanelCheck(prev, panelId, "splitPanel", (t) => {
          const newPanel: PanelNode = {
            type: "panel",
            id: newId,
            size: options?.newPanel?.size ?? DEFAULT_SPLIT_RATIO,
            component: options?.newPanel?.component ?? null,
          };
          return splitPanelAtId(t, panelId, direction, newPanel);
        }),
      );

      return newId;
    },
    []
  );

  const removePanel = useCallback((panelId: string) => {
    setTree((prev) =>
      withPanelCheck(prev, panelId, "removePanel", (t) => findAndUpdate(t, panelId, () => null) ?? t),
    );
  }, []);

  const movePanel = useCallback(
    (sourcePanelId: string, anchorPanelId: string, position: DropPosition, depth: number = 0) => {
      setTree((prev) =>
        withPanelCheck(prev, sourcePanelId, "movePanel: source", (t1) =>
          withPanelCheck(t1, anchorPanelId, "movePanel: anchor", (t2) =>
            computeMoveResult(t2, sourcePanelId, anchorPanelId, position, depth) ?? t2,
          ),
        ),
      );
    },
    [],
  );

  const insertPanel = useCallback(
    (options: { panel: InsertPanelInit; at?: InsertAt }): string => {
      const {panel, at} = options;
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
    firstPanelId,
    panelIds,
    hasPanel,
    resizeBorder,
    splitPanel,
    removePanel,
    movePanel,
    insertPanel,
  };
};
