// 워크스페이스: URL 플래그로 고른 프리셋을 useLoggedLayoutTree로 들고 TreeLayout 하나를 그린다.
// TreeLayout 바깥에는 Suspense도 에러 경계도 두지 않는다(remote 하나의 실패가 레이아웃 전체를 내리지 않게).
import { useEffect, useLayoutEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { TreeLayout } from '@dannysir/floating-components';
import { components } from './store';
import { useLoggedLayoutTree } from './useLoggedLayoutTree';
import { ActionsContext } from './actions';
import type { Flags } from './flags';
import { TopBar } from '../topbar/TopBar';
import { markReady } from '../instrumentation';

const ROOT: CSSProperties = { display: 'flex', flexDirection: 'column', height: '100vh' };
const MAIN: CSSProperties = { flex: 1, minHeight: 0, padding: 12, boxSizing: 'border-box', display: 'flex' };
const SHIELD_CSS = '[data-dragging-panel-id] iframe{pointer-events:none}';

export const Workspace = ({ flags }: { flags: Flags }) => {
  const { tree, onMovePanel, onResizeBorder, removePanel, insertPanel, panelIds } = useLoggedLayoutTree('main', flags.initialTree);

  useLayoutEffect(() => { markReady(); }, []);   // 첫 레이아웃 커밋 뒤 (자식의 layout effect가 먼저 돈다)

  useEffect(() => {
    if (!flags.persist) return;
    try { window.localStorage.setItem(flags.persistKey, JSON.stringify(tree)); } catch { /* 저장 불가 환경 */ }
  }, [flags.persist, flags.persistKey, tree]);

  const actions = useMemo(() => ({ layout: flags.layout, panelIds, removePanel, insertPanel }), [flags.layout, panelIds, removePanel, insertPanel]);

  return (
    <div data-testid="shell-root" style={ROOT}>
      {flags.iframeShield && <style data-harbor-style="iframe-shield">{SHIELD_CSS}</style>}
      <TopBar layout={flags.layout} />
      <main data-testid="workspace" data-theme="harbor" style={MAIN}>
        <ActionsContext.Provider value={actions}>
          <TreeLayout
            tree={tree}
            components={components}
            onMovePanel={onMovePanel}
            onResizeBorder={onResizeBorder}
            dragHandleSelector={flags.drag === 'panel' ? undefined : '[data-drag-handle]'}
          />
        </ActionsContext.Provider>
      </main>
    </div>
  );
};

export const ShellError = ({ message }: { message: string }) => (
  <div data-testid="shell-root" style={ROOT}>
    <TopBar layout="(error)" />
    <div data-testid="shell-error" role="alert" style={{ padding: 16 }}>shell error: {message}</div>
  </div>
);
