// R18 탐색(마우스, 약 20회). 제스처마다 의도를 먼저 기록 → 실행 → settle → 불변식(허용 목록 없음) → 스냅샷 diff 요약.
// 불변식이 실패하면 그 상태를 capture하고 페이지를 새로 연다. 이상은 explore/r18-x<nn>-*.spec.ts로 재현한 뒤에만 발견.
import { test } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { begin } from '../helpers/mouseDrag';
import { domTree, dropPoint, handlePoint, panelRect } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { resizeBorder } from '../helpers/resize';
import { seedAll } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { snapshot, diff } from '../helpers/snapshot';
import type { Snapshot } from '../helpers/snapshot';
import { capture } from '../helpers/evidence';
import { writeR18 } from '../helpers/r18log';
import type { R18Entry } from '../helpers/r18log';

const SLOTS = ['nav', 'orders', 'board', 'billing', 'telemetry', 'telemetry-x'];
const summarize = (a: Snapshot, b: Snapshot) => Object.values(diff(a, b).slots).filter((s) => s.class !== 'untouched')
  .map((s) => `${s.slot}:${s.class}(f+${s.frameMounts} c+${s.contentMounts} m+${s.domMoves}${s.loads ? ` l+${s.loads}` : ''})`).join(' ') || 'all untouched';
const deepest = async (page: Page, anchor: string, pos: 'top' | 'bottom' | 'left' | 'right') => {
  for (const d of [5, 4, 3, 2, 1]) { const p = await dropPoint(page, anchor, pos, d).catch(() => null); if (p) return { p, d }; }
  throw new Error(`no root band for ${anchor}/${pos}`);
};

type Gesture = { description: string; helper: string; run: (page: Page) => Promise<string> };
const G: Gesture[] = [
  { description: 'billing을 orders 왼쪽 미리보기까지 끈 뒤 Resizer(orders|V) 위에서 놓기', helper: 'begin, teleport, mouse.move(resizer), release(settled)', run: async (page) => {
    const d = await begin(page, 'billing'); await d.teleport(await dropPoint(page, 'orders', 'left', 0));
    const rz = await page.evaluate(() => { const r = document.querySelector('[data-tree-root] .ftl-resizer')!.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await d.teleport(rz); const res = await d.release({ mode: 'settled' }); return `under=${res.underCursorAtDrop} drop=${res.sawDrop} dropEffect=${res.dragendDropEffect} tree ${await domTree(page)}`; } },
  { description: 'orders를 board 위 미리보기 뒤 상단 바(y=20)에서 놓기', helper: 'begin, teleport, teleport(top bar), release(settled)', run: async (page) => {
    const d = await begin(page, 'orders'); await d.teleport(await dropPoint(page, 'board', 'top', 0)); await d.teleport({ x: 640, y: 20 });
    const res = await d.release({ mode: 'settled' }); return `under=${res.underCursorAtDrop} drop=${res.sawDrop} tree ${await domTree(page)}`; } },
  { description: 'board 드래그 시작 직후 이동 없이 Esc', helper: 'begin, cancelEsc', run: async (page) => {
    const d = await begin(page, 'board'); const res = await d.cancelEsc(); return `dropEffect=${res.dragendDropEffect} tree ${await domTree(page)}`; } },
  { description: 'billing을 glide(30단계)로 workbench를 가로질러 orders 왼쪽까지 → overShadow 커밋', helper: 'begin, glide(30), release(overShadow)', run: async (page) => {
    const d = await begin(page, 'billing'); await d.glide(await dropPoint(page, 'orders', 'left', 0), 30); const res = await d.release(); return `under=${res.underCursorAtDrop} tree ${await domTree(page)}`; } },
  ...(['top', 'bottom', 'left', 'right'] as const).map((pos): Gesture => ({ description: `orders를 루트 ${pos} 가장자리(5% 띠)에 놓기`, helper: 'begin, teleport(dropPoint 최대 depth), release(overShadow)', run: async (page) => {
    const anchor = pos === 'left' ? 'nav' : pos === 'right' ? 'telemetry-x' : pos === 'top' ? 'board' : 'telemetry';
    const src = anchor === 'telemetry-x' || anchor === 'telemetry' ? 'board' : 'orders';
    const { p, d: dep } = await deepest(page, anchor, pos); const d = await begin(page, src); await d.teleport(p);
    const hover = await domTree(page); const res = await d.release(); return `${src}→(${anchor},${pos},${dep}) hover ${hover} under=${res.underCursorAtDrop} tree ${await domTree(page)}`; } })),
  { description: 'orders|V 경계선을 +600으로 끝까지 밀었다 -600으로 되돌리기', helper: 'resizeBorder ×2', run: async (page) => {
    const a = await resizeBorder(page, { between: ['orders', 'board'], delta: 600, steps: 20 }); const b = await resizeBorder(page, { between: ['orders', 'board'], delta: -600, steps: 20 });
    return `+600: orders ${a.before.a.toFixed(0)}→${a.after.a.toFixed(0)}, board ${a.before.b.toFixed(0)}→${a.after.b.toFixed(0)}; -600: orders →${b.after.a.toFixed(0)}, board →${b.after.b.toFixed(0)}; us ${JSON.stringify(b.bodyUserSelectAfter)}`; } },
  { description: '리사이즈 직후 board를 billing 위쪽으로 드래그 커밋', helper: 'resizeBorder(board|billing +60), begin, teleport, release', run: async (page) => {
    await resizeBorder(page, { between: ['board', 'billing'], delta: 60, steps: 6 }); const d = await begin(page, 'board'); await d.teleport(await dropPoint(page, 'billing', 'top', 0));
    const res = await d.release(); return `under=${res.underCursorAtDrop} tree ${await domTree(page)}`; } },
  { description: 'orders Esc 취소 직후 바로 새 드래그로 board 아래쪽에 커밋', helper: 'begin, cancelEsc, begin, teleport, release', run: async (page) => {
    const d1 = await begin(page, 'orders'); await d1.teleport(await dropPoint(page, 'board', 'left', 0)); await d1.cancelEsc();
    const d2 = await begin(page, 'orders'); await d2.teleport(await dropPoint(page, 'board', 'bottom', 0)); const res = await d2.release(); return `under=${res.underCursorAtDrop} tree ${await domTree(page)}`; } },
  { description: 'billing을 telemetry iframe 본문에 들어갔다 나와 orders 오른쪽에 놓기', helper: 'begin, teleport(iframe 중앙), teleport(dropPoint), release', run: async (page) => {
    const r = await panelRect(page, 'telemetry'); const d = await begin(page, 'billing'); await d.teleport({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
    const mid = await domTree(page); await d.teleport(await dropPoint(page, 'orders', 'right', 0)); const hover = await domTree(page); const res = await d.release(); return `iframe 위 ${mid} → hover ${hover} under=${res.underCursorAtDrop} tree ${await domTree(page)}`; } },
  { description: 'telemetry-x를 telemetry 헤더 위에 놓기', helper: 'begin, teleport(handlePoint telemetry), release(settled)', run: async (page) => {
    const d = await begin(page, 'telemetry-x'); await d.teleport(await handlePoint(page, 'telemetry')); const hover = await domTree(page); const res = await d.release({ mode: 'settled' });
    return `hover ${hover} under=${res.underCursorAtDrop} drop=${res.sawDrop} tree ${await domTree(page)}`; } },
  { description: 'Nav 토글 닫기·열기 직후(board 로딩 중) orders를 billing 왼쪽으로 드래그', helper: 'click×2, begin, teleport, release', run: async (page) => {
    await page.click('[data-testid="nav-toggle-board"]'); await page.click('[data-testid="nav-toggle-board"]');
    const loading = await page.locator('[data-testid="loading-board"]').count(); const d = await begin(page, 'orders'); await d.teleport(await dropPoint(page, 'billing', 'left', 0)); const res = await d.release();
    return `토글 직후 loading-board ${loading}; under=${res.underCursorAtDrop} tree ${await domTree(page)}`; } },
  { description: 'orders 입력창에 글자를 치고 billing을 다른 곳으로 드래그한 뒤 orders 값 확인', helper: 'fill, begin, teleport, release', run: async (page) => {
    const inp = page.locator('[data-tree-root] [data-testid="orders-input"]'); await inp.fill('typed-r18'); const d = await begin(page, 'billing'); await d.teleport(await dropPoint(page, 'board', 'right', 0)); await d.release();
    return `orders-input ${JSON.stringify(await inp.inputValue().catch(() => '(없음)'))} tree ${await domTree(page)}`; } },
  { description: 'board 목록을 스크롤(300)한 뒤 orders를 드래그하고 board scrollTop 확인', helper: 'scrollTop, begin, teleport, release', run: async (page) => {
    const sc = page.locator('[data-tree-root] [data-testid="board-scroll"]'); await sc.evaluate((el) => { el.scrollTop = 300; }); const d = await begin(page, 'orders'); await d.teleport(await dropPoint(page, 'telemetry', 'top', 0).catch(async () => dropPoint(page, 'billing', 'bottom', 0))); await d.release();
    return `board scrollTop ${await sc.evaluate((el) => el.scrollTop).catch(() => -1)} tree ${await domTree(page)}`; } },
  { description: '뷰포트 800x600에서 billing 드래그와 orders|board 리사이즈', helper: 'setViewportSize, begin, teleport, release, resizeBorder', run: async (page) => {
    await page.setViewportSize({ width: 800, height: 600 }); await settle(page); const d = await begin(page, 'billing'); await d.teleport(await dropPoint(page, 'orders', 'top', 0)); const res = await d.release();
    const sizes = await page.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('[data-tree-root] [data-panel-id]')).map((el) => [el.getAttribute('data-panel-id'), Math.round(el.getBoundingClientRect().width)])));
    return `under=${res.underCursorAtDrop} tree ${await domTree(page)} widths ${JSON.stringify(sizes)}`; } },
  { description: '뷰포트 1280x800 복귀 뒤 board 드래그', helper: 'setViewportSize, begin, teleport, release', run: async (page) => {
    await page.setViewportSize({ width: 1280, height: 800 }); await settle(page); const d = await begin(page, 'board'); await d.teleport(await dropPoint(page, 'orders', 'left', 0)); const res = await d.release();
    const sizes = await page.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('[data-tree-root] [data-panel-id]')).map((el) => [el.getAttribute('data-panel-id'), Math.round(el.getBoundingClientRect().width)])));
    return `under=${res.underCursorAtDrop} tree ${await domTree(page)} widths ${JSON.stringify(sizes)}`; } },
  { description: '드래그 시작 후 이동 없이 소스 위에서 바로 놓기', helper: 'begin, release(settled)', run: async (page) => {
    const d = await begin(page, 'orders'); const res = await d.release({ mode: 'settled' }); return `under=${res.underCursorAtDrop} drop=${res.sawDrop} tree ${await domTree(page)}`; } },
  { description: '연속 두 번 커밋(board → orders 위, 곧바로 board → 원래 근처)', helper: 'begin, teleport, release ×2', run: async (page) => {
    const d1 = await begin(page, 'board'); await d1.teleport(await dropPoint(page, 'orders', 'top', 0)); await d1.release();
    const d2 = await begin(page, 'board'); await d2.teleport(await dropPoint(page, 'billing', 'left', 0)); await d2.release(); return `tree ${await domTree(page)}`; } },
  // #6~#8의 앵커(telemetry·telemetry-x iframe, 잠긴 nav)는 루트 띠가 iframe 본문/잠긴 패널 위라 미리보기가 생기지 않는다 → 유효한 앵커로 다시
  ...([['bottom', 'orders', 'board'], ['right', 'billing', 'orders']] as const).map(([pos, anchor, src]): Gesture => ({ description: `${src}를 루트 ${pos} 가장자리(5% 띠, 앵커 ${anchor})에 놓기`, helper: 'begin, teleport(dropPoint 최대 depth), release(overShadow)', run: async (page) => {
    const { p, d: dep } = await deepest(page, anchor, pos); const d = await begin(page, src); await d.teleport(p);
    const hover = await domTree(page); const res = await d.release(); return `${src}→(${anchor},${pos},${dep}) hover ${hover} under=${res.underCursorAtDrop} tree ${await domTree(page)}`; } })),
];

test('R18-charter-mouse', async ({ lab, page }, info) => {
  test.setTimeout(600_000);
  const log: R18Entry[] = [];
  const open = async () => { await page.setViewportSize({ width: 1280, height: 800 }); await lab.open({ layout: 'workbench' }); await seedAll(page, SLOTS); return snapshot(page, 'r18-open'); };
  let prev = await open();
  for (const [i, g] of G.entries()) {
    const n = i + 1;
    const entry: R18Entry = { n, input: 'mouse', description: g.description, helper: g.helper, invariants: [], diff: '', note: '', result: 'ok' };
    log.push(entry);                                                                     // 의도를 먼저 기록
    try {
      entry.note = await g.run(page);
      await settle(page);
      const inv = await checkInvariants(page);
      const cur = await snapshot(page, `r18-${n}`);
      entry.invariants = inv.map((r) => `${r.id}=${r.pass ? 'pass' : `FAIL(${r.detail})`}`);
      entry.diff = summarize(prev, cur);
      prev = cur;
      if (!inv.every((r) => r.pass)) {
        entry.result = 'invariant-fail';
        await capture(page, info, `r18-${n}-invariant-fail`);
        prev = await open();
      }
    } catch (e) {
      entry.result = 'error'; entry.note += ` ERROR ${(e as Error).message.split('\n')[0]}`;
      await capture(page, info, `r18-${n}-error`).catch(() => undefined);
      prev = await open();
    }
    console.log(`[r18 ${n}] ${entry.result} :: ${g.description} :: ${entry.note} :: ${entry.diff} :: ${entry.invariants.filter((x) => !x.endsWith('pass')).join(' ')}`);
  }
  writeR18('mouse', log);
});
