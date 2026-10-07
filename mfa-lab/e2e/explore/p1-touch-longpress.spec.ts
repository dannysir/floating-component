// B2-P1 (터치, 레인 B): ?drag=panel 롱프레스 드래그. 롱프레스 구간의 신뢰된 dragstart·touchcancel(H-TOUCH-NATIVE-RACE) 기록. 케이스마다 새 페이지.
import { test } from '../helpers/fixtures';
import { longPressDrag } from '../helpers/touch';
import { dropPoint } from '../helpers/geometry';
import { observe, invSummary, baseLabels } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { fmtEvents } from '../helpers/events';

test.beforeEach(({}, testInfo) => {
  if (testInfo.project.name !== 'touch') test.skip(true, 'touch project only');
});

[1, 2].forEach((runNo) => {
  test(`P1-longpress-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'pair', flags: { drag: 'panel' } });
    const t0 = Date.now();
    const res = await longPressDrag(page, 'p-a', [await dropPoint(page, 'p-b', 'right', 0)], 'end');
    const inv = await checkInvariants(page);
    const ds = res.events.filter((e) => e.type === 'dragstart');
    await observe(page, info, {
      scenario: 'B2-P1', caseName: 'P1-longpress', runNo, expected: '롱프레스(450ms) 뒤 터치 드래그가 시작되고 네이티브 드래그와 경합하지 않는다', predicted: '(H-TOUCH-NATIVE-RACE, 레인 B Chromium 153: 롱프레스 중 네이티브 dragstart·touchcancel 가능. S7b에서는 미관찰)',
      observed: `started=${res.started}, ghosts ${JSON.stringify(res.ghostsDuring)}, ghostsAfter ${res.ghostsAfter}, under=${res.underCursorAtDrop}, onMovePanel ${res.onMovePanelCalls}건, 커밋 ${res.snapshot.treeNotation}; 신뢰된 dragstart ${ds.filter((e) => e.isTrusted).length}건, touchcancel ${res.sawTouchcancel}, contextmenu ${res.sawContextmenu}, selectstart ${res.sawSelectstart}, touchTrusted ${res.touchTrusted}, data-dragging-panel-id ${res.snapshot.dom.draggingPanelId}; ${invSummary(inv)}`,
      verdict: res.started && !ds.some((e) => e.isTrusted) && !res.sawTouchcancel && res.onMovePanelCalls === 1 ? 'as-ideal' : 'deviates', invariants: inv, since: t0,
      labels: baseLabels('touch-cdp-longpress'), extra: { events: fmtEvents(res.events.filter((e) => e.type.startsWith('touch') || e.type.startsWith('drag'))) },
    });
  });
});
