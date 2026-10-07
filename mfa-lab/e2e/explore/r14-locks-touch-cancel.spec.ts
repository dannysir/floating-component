// R14 locks — 터치 취소(잠긴 nav 위에서 떼기)와 같은 페이지의 두 번째 드래그 (touch 프로젝트).
// R14-blocked는 중간 스냅샷(02-mid)이 필요해 handleDrag와 같은 순서를 openTouch로 스펙 안에서 조합한다(헬퍼는 바꾸지 않는다).
import { test, expect } from '../helpers/fixtures';
import { openTouch, readGhosts, handleDrag } from '../helpers/touch';
import { domTree, dropPoint, handlePoint, underCursor, treeNotation } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary, eventsSince, baseLabels } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { fmtEvents } from '../helpers/events';

test.beforeEach(({}, testInfo) => {
  if (testInfo.project.name !== 'touch') test.skip(true, 'R14 runs only in the touch project');
});

const EXP = {
  blocked: '핸들 터치 드래그가 시작되고, `nav` 위에서 ghost가 차단 표시로 바뀌며, 떼면 취소된다. I1~I7 통과',
  second: '두 번째 드래그가 정상 동작하고 커밋된다',
};
const PRED = {
  blocked: '통과. 핸들 모드는 롱프레스 없이 8px 초과 이동에서 시작(문서 33행과 다름 — 7절 문서 불일치). ghost 1개, `nav` 위에서 `opacity 0.4` + 빨간 outline, `touchend` → `endSession(false)`. `onMovePanel` 0건, 트리 불변, ghost 제거. `touchend`는 분리된 원본 노드에 `isConnected false`. `terminal` frame +2, `output` frame +2(D3), `editor` moves +1',
  second: '통과. 모듈 전역 `session`이 해제돼 새 세션이 열린다. `onMovePanel(\'terminal\',\'editor\',\'left\',0)` 1건, 트리 `H[nav,terminal,editor,output]`',
};
const SLOTS = ['control-a', 'control-b', 'control-c'];

[1, 2].forEach((runNo) => {
  test(`R14-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'locks' });
    expect(await domTree(page)).toBe('H[nav,editor,V[terminal,output]]');   // 전제
    await seedAll(page, SLOTS);
    const { snap: before } = await shot(page, info, '01-before');
    const t0 = Date.now();
    const wp1 = await dropPoint(page, 'editor', 'left', 0);
    const start = await handlePoint(page, 'control-b');

    // R14-blocked (handleDrag와 같은 순서: 12px → (ghost 없으면) 24px → waypoint들 → touchEnd)
    const t = await openTouch(page);
    await t.touchStart(start);
    await t.touchMove({ x: start.x + 12, y: start.y });
    const g1 = await readGhosts(page);
    if (g1.count === 0) await t.touchMove({ x: start.x + 24, y: start.y });
    const gStart = await readGhosts(page);
    expect(gStart.count).toBe(1);                                                             // 전제: 드래그 시작
    await t.touchMove(wp1);
    const tree1 = await domTree(page);
    expect(tree1).toBe('H[nav,terminal,editor,output]');                                      // 전제
    const gEditor = await readGhosts(page);
    const wp2 = await handlePoint(page, 'nav');
    await t.touchMove(wp2);
    const gNav = await readGhosts(page);
    const underNav = await underCursor(page, wp2.x, wp2.y);
    const { snap: mid } = await shot(page, info, '02-mid');
    await t.touchEnd();
    await settle(page);
    const { snap: after } = await shot(page, info, '03-after');
    const inv = await checkInvariants(page);
    const ghostsAfter = (await readGhosts(page)).count;
    const ev = await eventsSince(page, t0);
    const touchEnds = ev.filter((e) => e.type === 'touchend').map((e) => `${e.phase}/${e.target.panelId ?? e.target.tag}/connected=${e.isConnected}`);
    const calls = after.calls.filter((c) => c.fn === 'onMovePanel').length;
    const treeSame = JSON.stringify(after.tree) === JSON.stringify(before.tree);
    const ds = deltas(before, after);
    const isRed = (o: string | null) => !!o && /red|rgba?\(\s*2\d\d,\s*\d{1,2},\s*\d{1,2}[,)]/.test(o);
    const idealB = gNav.opacity === '0.4' && isRed(gNav.outline) && calls === 0 && treeSame && ghostsAfter === 0 && inv.every((r) => r.pass)
      && SLOTS.filter((s) => s !== 'control-b').every((s) => ds[s].cls === 'untouched');
    const predB = gStart.count === 1 && gNav.opacity === '0.4' && isRed(gNav.outline) && calls === 0 && treeSame && ghostsAfter === 0 && inv.every((r) => r.pass)
      && touchEnds.some((r) => r.startsWith('target') && r.endsWith('connected=false'))
      && ds['control-b'].frame === 2 && ds['control-c'].frame === 2 && ds['control-a'].moves === 1;
    await observe(page, info, {
      scenario: 'R14', caseName: 'R14-blocked', runNo, expected: EXP.blocked, predicted: PRED.blocked,
      observed: `ghost 시작 ${JSON.stringify(gStart)}(12px 뒤 ${g1.count}개), editor 위 ${JSON.stringify(gEditor)} domTree ${tree1}, nav 위 ${JSON.stringify(gNav)} under ${underNav.panelId}(droppable=${underNav.droppable}), 02-mid domTree ${mid.dom.domTree}; `
        + `touchend [${touchEnds.join(', ')}]; onMovePanel ${calls}건, 트리 불변=${treeSame}, ghost 잔존 ${ghostsAfter}; ${invSummary(inv)}. 누적: ${fmtDeltas(ds)}`,
      verdict: idealB ? 'as-ideal' : predB ? 'as-predicted' : 'deviates',
      invariants: inv, since: t0, labels: baseLabels('touch-cdp-handle'),
      extra: { events: fmtEvents(ev.filter((e) => e.type.startsWith('touch'))), deltas: ds, ghosts: { g1, gStart, gEditor, gNav } },
    });

    // R14-second: 같은 페이지에서 이어서
    const t1 = Date.now();
    const res = await handleDrag(page, 'control-b', [await dropPoint(page, 'editor', 'left', 0)], 'end');
    await settle(page);
    const { snap: after2 } = await shot(page, info, '04-second');
    const inv2 = await checkInvariants(page);
    const calls2 = after2.calls.filter((c) => c.fn === 'onMovePanel');
    const newCalls = calls2.slice(calls);
    const committed = treeNotation(after2.tree as Parameters<typeof treeNotation>[0]);
    const okSecond = res.started && newCalls.length === 1 && JSON.stringify(newCalls[0].args) === JSON.stringify(['terminal', 'editor', 'left', 0]) && committed === 'H[nav,terminal,editor,output]' && inv2.every((r) => r.pass);
    await observe(page, info, {
      scenario: 'R14', caseName: 'R14-second', runNo, expected: EXP.second, predicted: PRED.second,
      observed: `started=${res.started}, ghosts ${JSON.stringify(res.ghostsDuring)}, ghostsAfter ${res.ghostsAfter}, under=${res.underCursorAtDrop}; onMovePanel ${newCalls.length}건 ${newCalls.map((m) => JSON.stringify(m.args)).join(' ')}; 커밋된 트리 ${committed}; ${invSummary(inv2)}. 누적(01-before 대비): ${fmtDeltas(deltas(before, after2))}`,
      verdict: okSecond ? 'as-ideal' : 'deviates',
      invariants: inv2, since: t1, labels: baseLabels('touch-cdp-handle'),
      extra: { events: fmtEvents(res.events.filter((e) => e.type.startsWith('touch'))) },
    });
  });
});
