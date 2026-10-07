// R18 탐색(터치, 약 10회, touch 프로젝트). 제스처마다 의도 기록 → 실행 → settle → 불변식 → diff 요약. 실패하면 capture 후 새로 연다.
import { test } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { handleDrag, openTouch, readGhosts } from '../helpers/touch';
import { begin } from '../helpers/mouseDrag';
import { domTree, dropPoint, handlePoint } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { seedAll } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { snapshot, diff } from '../helpers/snapshot';
import type { Snapshot } from '../helpers/snapshot';
import { capture } from '../helpers/evidence';
import { writeR18 } from '../helpers/r18log';
import type { R18Entry } from '../helpers/r18log';

test.beforeEach(({}, testInfo) => {
  if (testInfo.project.name !== 'touch') test.skip(true, 'touch project only');
});

const SLOTS = ['nav', 'orders', 'board', 'billing', 'telemetry', 'telemetry-x'];
const summarize = (a: Snapshot, b: Snapshot) => Object.values(diff(a, b).slots).filter((s) => s.class !== 'untouched')
  .map((s) => `${s.slot}:${s.class}(f+${s.frameMounts} c+${s.contentMounts} m+${s.domMoves}${s.loads ? ` l+${s.loads}` : ''})`).join(' ') || 'all untouched';
// 표의 깊이에 도달할 수 없으면 같은 위치의 다른 depth를 0..4 순서로 시도한다(도달성은 트리 모양에 따라 다르다)
const reach = async (page: Page, anchor: string, pos: 'top' | 'bottom' | 'left' | 'right') => {
  for (const d of [0, 1, 2, 3, 4]) { const p = await dropPoint(page, anchor, pos, d).catch(() => null); if (p) return p; }
  throw new Error(`unreachable ${anchor}/${pos}`);
};
const fmt = (r: Awaited<ReturnType<typeof handleDrag>>) => `started=${r.started} ghosts=${r.ghostsDuring.map((g) => g.count).join('/')} after=${r.ghostsAfter} under=${r.underCursorAtDrop} moves=${r.onMovePanelCalls} dragstart=${r.sawDragstart} touchcancel=${r.sawTouchcancel}`;

type Gesture = { description: string; helper: string; run: (page: Page) => Promise<string> };
const G: Gesture[] = [
  { description: 'orders 핸들 터치 드래그로 billing 위쪽에 놓기', helper: 'handleDrag(end)', run: async (page) => `${fmt(await handleDrag(page, 'orders', [await reach(page, 'billing', 'top')], 'end'))} tree ${await domTree(page)}` },
  { description: 'board 핸들 터치 드래그로 orders 왼쪽에 놓기', helper: 'handleDrag(end)', run: async (page) => `${fmt(await handleDrag(page, 'board', [await reach(page, 'orders', 'left')], 'end'))} tree ${await domTree(page)}` },
  { description: 'billing 핸들 터치 드래그 중 touchCancel로 끊기', helper: 'handleDrag(cancel)', run: async (page) => `${fmt(await handleDrag(page, 'billing', [await reach(page, 'board', 'right')], 'cancel'))} tree ${await domTree(page)}` },
  { description: 'orders 터치 드래그를 잠긴 nav 위에서 떼기', helper: 'handleDrag(end, nav handle)', run: async (page) => `${fmt(await handleDrag(page, 'orders', [await reach(page, 'board', 'top'), await handlePoint(page, 'nav')], 'end'))} tree ${await domTree(page)}` },
  { description: 'telemetry(iframe) 핸들 터치 드래그로 telemetry-x 본문 위에 놓기', helper: 'handleDrag(end)', run: async (page) => `${fmt(await handleDrag(page, 'telemetry', [await reach(page, 'telemetry-x', 'right')], 'end'))} tree ${await domTree(page)}` },
  { description: '연속 두 번 터치 드래그(board → billing 오른쪽, 곧바로 billing → board 왼쪽)', helper: 'handleDrag ×2', run: async (page) => {
    const a = await handleDrag(page, 'board', [await reach(page, 'billing', 'right')], 'end'); const b = await handleDrag(page, 'billing', [await reach(page, 'board', 'left')], 'end');
    return `1: ${fmt(a)}; 2: ${fmt(b)}; tree ${await domTree(page)}`; } },
  { description: '터치 드래그 직후 마우스 드래그(orders → board 아래)', helper: 'handleDrag, begin, teleport, release', run: async (page) => {
    const a = await handleDrag(page, 'orders', [await reach(page, 'billing', 'bottom')], 'end');
    const d = await begin(page, 'orders'); await d.teleport(await reach(page, 'board', 'bottom')); const r = await d.release(); return `touch ${fmt(a)}; mouse under=${r.underCursorAtDrop}; tree ${await domTree(page)}`; } },
  { description: '터치 드래그를 여러 waypoint로 패널들을 가로질러 orders 오른쪽에 놓기', helper: 'handleDrag(end, 4 waypoints)', run: async (page) => {
    const wps = [await reach(page, 'board', 'top'), await reach(page, 'billing', 'bottom'), await reach(page, 'orders', 'left'), await reach(page, 'orders', 'right')];
    return `${fmt(await handleDrag(page, 'billing', wps, 'end'))} tree ${await domTree(page)}`; } },
  { description: '핸들에서 터치 시작 후 8px 미만(5px)만 움직이고 떼기', helper: 'openTouch(start, move 5, end)', run: async (page) => {
    const t = await openTouch(page); const h = await handlePoint(page, 'board'); await t.touchStart(h); await t.touchMove({ x: h.x + 5, y: h.y }); const g = await readGhosts(page); await t.touchEnd();
    return `ghost during ${g.count}, after ${(await readGhosts(page)).count}; tree ${await domTree(page)}`; } },
  { description: '패널 본문(핸들 밖)에서 터치로 끌기(스크롤 의도)', helper: 'openTouch(start body, move 40, end)', run: async (page) => {
    const t = await openTouch(page); const b = (await page.locator('[data-tree-root] [data-testid="orders-scroll"]').boundingBox())!; const p = { x: b.x + 40, y: b.y + 80 };
    await t.touchStart(p); await t.touchMove({ x: p.x, y: p.y - 20 }); await t.touchMove({ x: p.x, y: p.y - 40 }); const g = await readGhosts(page); await t.touchEnd();
    return `ghost during ${g.count}; tree ${await domTree(page)}`; } },
];

test('R18-charter-touch', async ({ lab, page }, info) => {
  test.setTimeout(600_000);
  const log: R18Entry[] = [];
  const open = async () => { await lab.open({ layout: 'workbench' }); await seedAll(page, SLOTS); return snapshot(page, 'r18t-open'); };
  let prev = await open();
  for (const [i, g] of G.entries()) {
    const n = 100 + i + 1;                                                               // 터치는 101부터
    const entry: R18Entry = { n, input: 'touch-cdp-handle', description: g.description, helper: g.helper, invariants: [], diff: '', note: '', result: 'ok' };
    log.push(entry);
    try {
      entry.note = await g.run(page);
      await settle(page);
      const inv = await checkInvariants(page);
      const cur = await snapshot(page, `r18t-${n}`);
      entry.invariants = inv.map((r) => `${r.id}=${r.pass ? 'pass' : `FAIL(${r.detail})`}`);
      entry.diff = summarize(prev, cur);
      prev = cur;
      if (!inv.every((r) => r.pass)) { entry.result = 'invariant-fail'; await capture(page, info, `r18t-${n}-invariant-fail`); prev = await open(); }
    } catch (e) {
      entry.result = 'error'; entry.note += ` ERROR ${(e as Error).message.split('\n')[0]}`;
      await capture(page, info, `r18t-${n}-error`).catch(() => undefined); prev = await open();
    }
    console.log(`[r18t ${n}] ${entry.result} :: ${g.description} :: ${entry.note} :: ${entry.diff} :: ${entry.invariants.filter((x) => !x.endsWith('pass')).join(' ')}`);
  }
  writeR18('touch-cdp-handle', log);
});
