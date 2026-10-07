// S7b (B1-03e, 기록만, touch 프로젝트): ?drag=panel에서 550ms 롱프레스 후 이동·릴리스. 새 컨텍스트(테스트마다 기본).
// 게이트가 아니다. 라이브러리 동작을 단언하지 않고 관찰을 출력한다 (H-TOUCH-NATIVE-RACE).
import { test, expect } from '../helpers/fixtures';
import { longPressDrag } from '../helpers/touch';
import { dropPoint } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { checkInvariants } from '../helpers/invariants';
import { fmtEvents } from '../helpers/events';

test.beforeEach(({}, testInfo) => {
  if (testInfo.project.name !== 'touch') test.skip(true, 'S7b runs only in the touch project');
});

test('S7b long-press drag on ?drag=panel (record only)', async ({ lab, page, browser }) => {
  await lab.open({ layout: 'pair', drag: 'panel' });                       // 전제: 열림
  await settle(page);
  const target = await dropPoint(page, 'p-b', 'right', 0);
  const res = await longPressDrag(page, 'p-a', [{ x: target.x - 40, y: target.y }, target, { x: target.x + 2, y: target.y }], 'end');
  const inv = await checkInvariants(page);
  const rootDragging = await page.evaluate(() => (document.querySelector('[data-tree-root]') as HTMLElement | null)?.dataset.draggingPanelId ?? null);
  const obs = {
    browser: browser.version(),
    ghostAfterHold: res.ghostsDuring[0],
    ghostsDuring: res.ghostsDuring,
    started: res.started,
    sawDragstart: res.sawDragstart,
    sawTouchcancel: res.sawTouchcancel,
    sawContextmenu: res.sawContextmenu,
    sawSelectstart: res.sawSelectstart,
    onMovePanelCalls: res.onMovePanelCalls,
    treeAfter: res.snapshot.treeNotation,
    rootDraggingPanelId: rootDragging,
    invariants: inv.map((r) => `${r.id}=${r.pass}${r.pass ? '' : `(${r.detail})`}`).join(' '),
  };
  console.log(`[S7b] ${JSON.stringify(obs)}`);
  console.log(`[S7b] events: ${fmtEvents(res.events.filter((e) => !e.type.startsWith('pointer') && !e.type.startsWith('mouse')))}`);
  test.info().annotations.push({ type: 'S7b', description: JSON.stringify(obs) });
  expect(res.events.length).toBeGreaterThan(0);                             // 하네스 전제만: 프로브가 기록했다
});
