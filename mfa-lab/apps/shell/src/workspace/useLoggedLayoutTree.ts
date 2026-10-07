import { useCallback, useLayoutEffect, useRef } from 'react';
import { useLayoutTree } from '@dannysir/floating-components';
import type { LayoutNode, DropPosition, InsertPanelInit, InsertAt } from '@dannysir/floating-components';
import { logCall, registerLayout } from '../instrumentation';

// useLayoutTree(src/hooks/useLayoutTree.ts:41-176)를 얇게 감싼다.
// 호출마다 window.__fc.calls에 한 줄(treeVersionBefore 포함)을 남긴 뒤 원래 함수에 넘긴다.
export const useLoggedLayoutTree = (layoutId: string, initialTree: LayoutNode) => {
  const api = useLayoutTree(initialTree);
  const { tree, movePanel, resizeBorder, removePanel, insertPanel } = api;
  const treeRef = useRef(tree);
  const versionRef = useRef(-1);                 // 첫 커밋 뒤 0

  useLayoutEffect(() => {
    treeRef.current = tree;
    versionRef.current += 1;                     // tree 참조가 바뀐 커밋마다 1
  }, [tree]);
  useLayoutEffect(() => registerLayout(layoutId, () => treeRef.current, () => versionRef.current), [layoutId]);

  const onMovePanel = useCallback((s: string, a: string, p: DropPosition, d: number) => {
    logCall(layoutId, 'onMovePanel', [s, a, p, d], versionRef.current);
    movePanel(s, a, p, d);
  }, [layoutId, movePanel]);
  const onResizeBorder = useCallback((path: number[], i: number, delta: number, total?: number) => {
    logCall(layoutId, 'onResizeBorder', [path, i, delta, total], versionRef.current);
    resizeBorder(path, i, delta, total);
  }, [layoutId, resizeBorder]);
  const loggedRemove = useCallback((id: string) => {
    logCall(layoutId, 'removePanel', [id], versionRef.current);
    removePanel(id);
  }, [layoutId, removePanel]);
  const loggedInsert = useCallback((o: { panel: InsertPanelInit; at?: InsertAt }) => {
    logCall(layoutId, 'insertPanel', [o], versionRef.current);
    return insertPanel(o);
  }, [layoutId, insertPanel]);

  return { ...api, onMovePanel, onResizeBorder, removePanel: loggedRemove, insertPanel: loggedInsert };
};
