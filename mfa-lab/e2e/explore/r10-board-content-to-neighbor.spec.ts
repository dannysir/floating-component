// R10 remote 내용(카드·img)을 옆 패널로. page.mouse를 직접 쓴다(BRIEF-2 R10). 대조: &lock=p-a:draggable
import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { domTree, dropPoint, handlePoint, underCursor, treeNotation } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary, eventsSince } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { promote } from '../helpers/evidence';
import { fmtEvents, dragEvents } from '../helpers/events';

const EXP = '옆 패널은 카드를 무시한다. 미리보기 없음, 패널 이동 없음';
const PRED: Record<string, string> = {
  card: 'hover에서 미리보기 `H[p-b,p-a,p-c]`와 `p-a` shadow. 드롭에서 `onMovePanel(\'p-a\',\'p-b\',\'right\',0)` 1건, board 패널 전체가 이동. `cardMoves` +0',
  img: '`<img>`도 같다',
  local: '같다',
  lock: '(대조) 미리보기 없음, 이동 없음',
};

type Dnd = { cardMoves: number; lastDragend: { dropEffect: string; effectAllowed: string } | null; lastTypes: string[] };
const readDnd = (page: Page, slot: string) => page.evaluate((s) =>
  ((window as unknown as { __mfe?: Record<string, { dnd?: unknown }> }).__mfe?.[s]?.dnd ?? null), slot) as Promise<Dnd | null>;

const CASES = [
  { caseName: 'R10-card', slot: 'board', src: 'card-c1', pred: 'card', exp: EXP },
  { caseName: 'R10-img', slot: 'board', src: 'img', pred: 'img', exp: '같다' },
  { caseName: 'R10-board-local-card', slot: 'board-local', src: 'card-c1', pred: 'local', exp: '같다' },
  { caseName: 'R10-board-local-img', slot: 'board-local', src: 'img', pred: 'local', exp: '같다' },
  { caseName: 'R10-ladder-lock-card', slot: 'board', src: 'card-c1', pred: 'lock', exp: `(대조 사다리 lock=p-a:draggable) ${EXP}`, lock: 'p-a:draggable' },
];

CASES.forEach((c) => {
  [1, 2].forEach((runNo) => {
    test(`${c.caseName}-run${runNo}`, async ({ lab, page }, info) => {
      await lab.open({ layout: 'row3', slots: { a: c.slot, b: 'control-b' }, ...(c.lock ? { lock: c.lock } : {}) });
      expect(await domTree(page)).toBe('H[p-a,p-b,p-c]');                               // 전제
      await seedAll(page, ['control-b', 'control-c']);
      const { snap: before } = await shot(page, info, '01-before');
      const dndBefore = await readDnd(page, c.slot);
      const t0 = Date.now();

      const b = (await page.getByTestId(`${c.slot}-${c.src}`).boundingBox())!;
      const p0 = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      await page.mouse.move(p0.x, p0.y);
      await page.mouse.down();
      await page.mouse.move(p0.x + 6, p0.y, { steps: 2 });
      await settle(page);
      const starts = dragEvents(await eventsSince(page, t0)).filter((e) => e.type === 'dragstart');
      expect(starts.some((e) => e.isTrusted && e.target.testid === `${c.slot}-${c.src}`)).toBe(true);   // 전제
      const p1 = await dropPoint(page, 'p-b', 'right', 0);
      await page.mouse.move(p1.x, p1.y, { steps: 2 });
      await page.mouse.move(p1.x, p1.y);                                                       // Blink의 대상 변경 지연(HARNESS)
      await settle(page);
      const { snap: mid } = await shot(page, info, '02-mid');
      const hoverTree = mid.dom.domTree;
      const shadowA = mid.dom.panels['p-a']?.shadow ?? null;

      const p2 = await handlePoint(page, c.slot);
      await page.mouse.move(p2.x, p2.y, { steps: 2 });
      await page.mouse.move(p2.x, p2.y);
      await settle(page);
      const under = await underCursor(page, p2.x, p2.y);
      await page.mouse.up();
      await settle(page);
      const { snap: after } = await shot(page, info, '03-after');
      const inv = await checkInvariants(page);
      const dndAfter = await readDnd(page, c.slot);
      const drags = dragEvents(await eventsSince(page, t0));
      const ds = drags.find((e) => e.type === 'dragstart' && e.phase === 'bubble');
      const dragendRecs = drags.filter((e) => e.type === 'dragend').map((e) => `${e.phase}/${e.target.testid}/dropEffect=${e.dropEffect}/connected=${e.isConnected}`);
      const moveCalls = after.calls.filter((x) => x.fn === 'onMovePanel');
      const committed = treeNotation(after.tree as Parameters<typeof treeNotation>[0]);
      const dmoves = (dndAfter?.cardMoves ?? 0) - (dndBefore?.cardMoves ?? 0);
      const dd = deltas(before, after);
      const treeSame = JSON.stringify(after.tree) === JSON.stringify(before.tree);

      const ideal = hoverTree === 'H[p-a,p-b,p-c]' && moveCalls.length === 0 && treeSame && dmoves === 0 && inv.every((r) => r.pass);
      const pred = c.lock
        ? ideal
        : hoverTree === 'H[p-b,p-a,p-c]' && shadowA === true && moveCalls.length === 1
          && JSON.stringify(moveCalls[0].args) === JSON.stringify(['p-a', 'p-b', 'right', 0]) && dmoves === 0;
      await observe(page, info, {
        scenario: 'R10', caseName: c.caseName, runNo, expected: c.exp, predicted: PRED[c.pred],
        observed: `dragstart 버블 types [${(ds?.types ?? []).join(',')}]/${ds?.effectAllowed}; hover domTree ${hoverTree}, p-a shadow=${shadowA}; `
          + `릴리스 지점 underCursor ${under.panelId}; onMovePanel ${moveCalls.length}건 ${moveCalls.map((m) => JSON.stringify(m.args)).join(' ')}; 커밋된 트리 ${committed}; `
          + `cardMoves +${dmoves}, lastDragend ${JSON.stringify(dndAfter?.lastDragend)}; dragend [${dragendRecs.join(', ')}]; ${invSummary(inv)}. 누적: ${fmtDeltas(dd)}`,
        verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates',
        invariants: inv, since: t0,
        extra: { events: fmtEvents(drags), dndBefore, dndAfter, deltas: dd, under },
      });
      if (runNo === 1 && c.caseName === 'R10-card') {
        const caseDir = new URL(`../.artifacts/r10-board-content-to-neighbor/${info.title}/`, import.meta.url).pathname;
        await promote({ run: 'run01-tier1', findingId: 'FC-QA-003', caseDir, images: ['02-mid.png', '03-after.png'], prefix: 'R10-' });
      }
    });
  });
});
