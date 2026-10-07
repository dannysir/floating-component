// R09 remote 안의 네이티브 드래그(칸반 카드). begin은 패널 핸들 전용이라 page.mouse를 직접 쓴다(BRIEF-2 R09).
import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { domTree } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary, eventsSince } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { capture, promote } from '../helpers/evidence';
import { fmtEvents, dragEvents } from '../helpers/events';

const EXPECTED: Record<string, string> = {
  'R09-board': '카드 순서가 바뀐다. 루트에 `data-dragging-panel-id`가 붙지 않는다. window 버블 단계 `drop` 리스너가 실행된다',
  'R09-board-local': '같다',
  'R09-standalone': '깨끗함',
};
const PREDICTED: Record<string, string> = {
  'R09-board': '루트에 `data-dragging-panel-id="p-a"`. `dragstart` `types`에 `text/panel-id`와 `application/x-harbor-card`, `effectAllowed \'move\'`. `cardMoves` +1(카드 이동은 된다). `drop` 레코드 `stopped: true`(버블 없음). `calls` 비어 있음, 트리 불변. `dragend` 뒤 I1 통과(카드 노드에 건 리스너가 `finishDrag`)',
  'R09-board-local': '같다(라이브러리 코어 동작)',
  'R09-standalone': '`data-dragging-panel-id` 없음, `types`는 카드 타입만, `lastDragend.dropEffect \'move\'`',
};

type Dnd = { cardMoves: number; zoneDrops: number; copyDrops: number; lastDragend: { dropEffect: string; effectAllowed: string } | null; lastTypes: string[] };
const readDnd = (page: Page, slot: string) => page.evaluate((s) =>
  ((window as unknown as { __mfe?: Record<string, { dnd?: unknown }> }).__mfe?.[s]?.dnd ?? null), slot) as Promise<Dnd | null>;
const center = async (page: Page, testid: string) => {
  const b = await page.getByTestId(testid).boundingBox();
  if (!b) throw new Error(`no box ${testid}`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const cardOrder = (page: Page, slot: string) => page.evaluate((s) =>
  [0, 1, 2].map((i) => Array.from(document.querySelectorAll(`[data-testid="${s}-col-${i}"] [data-testid^="${s}-card-"]`)).map((el) => el.getAttribute('data-testid')!.replace(`${s}-card-`, ''))), slot);
const draggingAny = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-dragging-panel-id]')).map((el) => (el as HTMLElement).dataset.draggingPanelId));

const CASES = [
  { caseName: 'R09-board', slot: 'board', open: 'layout' as const },
  { caseName: 'R09-board-local', slot: 'board-local', open: 'layout' as const },
  { caseName: 'R09-standalone', slot: 'board', open: 'standalone' as const },
];

CASES.forEach((c) => {
  [1, 2].forEach((runNo) => {
    test(`${c.caseName}-run${runNo}`, async ({ lab, page }, info) => {
      const layout = c.open === 'layout';
      if (layout) {
        await lab.open({ layout: 'row3', slots: { a: c.slot } });
        expect(await domTree(page)).toBe('H[p-a,p-b,p-c]');                           // 전제
        await seedAll(page, ['control-b', 'control-c']);
      } else {
        await lab.openStandalone('board');
        await page.getByTestId('board-card-c1').waitFor();
      }
      const before = layout ? (await shot(page, info, '01-before')).snap : null;
      if (!layout) await capture(page, info, '01-before');
      const dndBefore = await readDnd(page, c.slot);
      const orderBefore = await cardOrder(page, c.slot);
      const t0 = Date.now();

      const p0 = await center(page, `${c.slot}-card-c1`);
      await page.mouse.move(p0.x, p0.y);
      await page.mouse.down();
      await page.mouse.move(p0.x + 6, p0.y, { steps: 2 });
      if (layout) await settle(page); else await page.waitForTimeout(200);
      const startEvents = dragEvents(await eventsSince(page, t0)).filter((e) => e.type === 'dragstart');
      expect(startEvents.some((e) => e.isTrusted && e.target.testid === `${c.slot}-card-c1`)).toBe(true);   // 전제
      const mid = layout ? (await shot(page, info, '02-mid')).snap : null;
      if (!layout) await capture(page, info, '02-mid');
      const draggingMid = await draggingAny(page);
      const midTree = layout ? await domTree(page) : null;

      const p1 = await center(page, `${c.slot}-col-1`);
      await page.mouse.move(p1.x, p1.y, { steps: 2 });
      await page.mouse.move(p1.x, p1.y);                                                       // Blink의 대상 변경 지연(HARNESS)
      if (layout) await settle(page); else await page.waitForTimeout(200);
      await page.mouse.up();
      if (layout) await settle(page); else await page.waitForTimeout(200);
      const after = layout ? (await shot(page, info, '03-after')).snap : null;
      if (!layout) await capture(page, info, '03-after');
      const draggingAfter = await draggingAny(page);
      const dndAfter = await readDnd(page, c.slot);
      const orderAfter = await cardOrder(page, c.slot);
      const drags = dragEvents(await eventsSince(page, t0));
      const ds = drags.find((e) => e.type === 'dragstart' && e.phase === 'bubble') ?? drags.find((e) => e.type === 'dragstart');
      const dropRecs = drags.filter((e) => e.type === 'drop');
      const dropCap = dropRecs.find((e) => e.phase === 'capture');
      const dropBubble = dropRecs.some((e) => e.phase === 'bubble');
      const dragendRecs = drags.filter((e) => e.type === 'dragend').map((e) => `${e.phase}/${e.target.testid}/dropEffect=${e.dropEffect}/connected=${e.isConnected}`);
      const inv = layout ? await checkInvariants(page) : [];
      const calls = after ? after.calls.filter((x) => x.fn === 'onMovePanel').length : 0;
      const treeSame = before && after ? JSON.stringify(after.tree) === JSON.stringify(before.tree) : null;
      const dmoves = (dndAfter?.cardMoves ?? 0) - (dndBefore?.cardMoves ?? 0);
      const types = ds?.types ?? [];
      const dsAll = drags.filter((e) => e.type === 'dragstart').map((e) => `${e.phase}:[${(e.types ?? []).join(',')}]/${e.effectAllowed}`);
      const dd = before && after ? deltas(before, after) : null;

      const ideal = layout
        ? dmoves === 1 && draggingMid.length === 0 && dropBubble && calls === 0 && treeSame === true && inv.every((r) => r.pass)
        : dmoves === 1 && draggingMid.length === 0 && dndAfter?.lastDragend?.dropEffect === 'move';
      const pred = layout
        ? draggingMid.join(',') === 'p-a' && types.includes('text/panel-id') && types.includes('application/x-harbor-card') && ds?.effectAllowed === 'move'
          && dmoves === 1 && dropCap?.stopped === true && !dropBubble && calls === 0 && treeSame === true && inv.find((r) => r.id === 'I1')?.pass === true
        : draggingMid.length === 0 && JSON.stringify(dndAfter?.lastTypes) === JSON.stringify(['application/x-harbor-card']) && dndAfter?.lastDragend?.dropEffect === 'move';
      await observe(page, info, {
        scenario: 'R09', caseName: c.caseName, runNo, expected: EXPECTED[c.caseName], predicted: PREDICTED[c.caseName],
        observed: `드래그 중 data-dragging-panel-id=[${draggingMid.join(',')}]${midTree ? `, domTree ${midTree}` : ''}; dragstart ${dsAll.join(' ')}; `
          + `카드 ${JSON.stringify(orderBefore)} → ${JSON.stringify(orderAfter)}, cardMoves +${dmoves}, lastTypes ${JSON.stringify(dndAfter?.lastTypes)}, lastDragend ${JSON.stringify(dndAfter?.lastDragend)}; `
          + `drop 레코드 [${dropRecs.map((e) => `${e.phase}${e.stopped ? '(stopped)' : ''}`).join(', ')}]; dragend [${dragendRecs.join(', ')}]; 드래그 뒤 data-dragging-panel-id=[${draggingAfter.join(',')}]`
          + (layout ? `; 트리 불변=${treeSame}, onMovePanel ${calls}건; ${invSummary(inv)}. 누적: ${dd ? fmtDeltas(dd) : ''}` : ''),
        verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates',
        invariants: inv, since: t0,
        extra: { events: fmtEvents(drags), dndBefore, dndAfter, midDragging: mid?.dom.draggingPanelId ?? null, deltas: dd },
      });
      if (runNo === 1 && c.caseName !== 'R09-board-local') {
        const caseDir = new URL(`../.artifacts/r09-board-native-drag/${info.title}/`, import.meta.url).pathname;
        if (c.caseName === 'R09-board') {
          await promote({ run: 'run01-tier1', findingId: 'FC-QA-003', caseDir, images: ['02-mid.png', '03-after.png'] });
          await promote({ run: 'run01-tier1', findingId: 'FC-QA-004', caseDir, images: ['03-after.png'] });
        } else {
          await promote({ run: 'run01-tier1', findingId: 'FC-QA-004', caseDir, images: ['03-after.png'], prefix: 'R09s-' });   // 단독 페이지 대조
        }
      }
    });
  });
});
