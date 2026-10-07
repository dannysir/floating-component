// 슬롯 nav — 정적 메뉴. workbench에서만 board 토글 버튼을 그린다. 프로브 없음.
import { useWorkspaceActions } from '../workspace/actions';

const MENU = ['Orders', 'Fulfilment', 'Billing', 'Telemetry', 'Settings'];

export const NavPanel = () => {
  const actions = useWorkspaceActions();
  const hasBoard = actions?.panelIds.includes('board') ?? false;
  const toggleBoard = () => {
    if (!actions) return;
    if (hasBoard) {
      actions.removePanel('board');
      return;
    }
    const at = actions.panelIds.includes('billing') ? { anchorId: 'billing', position: 'left' as const } : undefined;
    actions.insertPanel({ panel: { id: 'board', componentKey: 'board' }, ...(at ? { at } : {}) });
  };
  return (
    <nav style={{ padding: 8, fontSize: 13 }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {MENU.map((m) => <li key={m} style={{ padding: '4px 0' }}>{m}</li>)}
      </ul>
      {actions?.layout === 'workbench' && (
        <button type="button" data-testid="nav-toggle-board" onClick={toggleBoard}>
          {hasBoard ? 'hide board' : 'show board'}
        </button>
      )}
    </nav>
  );
};
