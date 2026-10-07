// R11 board 안의 copy 드래그 — dropEffect 덮어쓰기. page.mouse 직접(BRIEF-2 R11). 단독 페이지가 귀속 사다리 5단계.
import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { domTree } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { observe, shot, invSummary, eventsSince } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { capture, promote } from '../helpers/evidence';
import { dragEvents, fmtEvents } from '../helpers/events';

const TXT: Record<string, [string, string]> = {
  'R11-board': ['copy 드롭이 성공하고 `dragend`의 `dropEffect`는 `\'copy\'`(단독 페이지와 같다)', '드롭은 성공(`copyDrops` +1)하지만 `lastDragend.dropEffect \'move\'`. 소스 `effectAllowed`가 패널 `handleDragStart`에서 `\'move\'`로 덮이고, 존이 준 `dropEffect \'copy\'`가 패널 `handleDragOver`에서 `\'move\'`로 덮인다'],
  'R11-locked': ['같다', '드롭 **거부**(`copyDrops` +0, `dragend dropEffect \'none\'`). `effectAllowed`는 `\'copy\'`로 남는데(잠긴 패널은 `handleDragStart`가 74행에서 끝난다) 패널이 `dropEffect`를 `\'move\'`로 강제한다. HTML 명세에서 허용되지 않는 `dropEffect`는 작업 없음(https://html.spec.whatwg.org/multipage/dnd.html)'],
  'R11-standalone': ['—', '`copyDrops` +1, `dropEffect \'copy\'`'],
};
type Dnd = { copyDrops: number; lastDragend: { dropEffect: string; effectAllowed: string } | null; lastTypes: string[] };
const readDnd = (page: Page) => page.evaluate(() => ((window as unknown as { __mfe?: Record<string, { dnd?: unknown }> }).__mfe?.board?.dnd ?? null)) as Promise<Dnd | null>;
const center = async (page: Page, id: string) => { const b = (await page.getByTestId(id).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const dragging = (page: Page) => page.evaluate(() => document.querySelector('[data-tree-root]')?.getAttribute('data-dragging-panel-id') ?? null);

const CASES = [
  { name: 'R11-board', layout: true, lock: undefined },
  { name: 'R11-locked', layout: true, lock: 'p-a:draggable' },
  { name: 'R11-standalone', layout: false, lock: undefined },
] as const;

CASES.forEach((c) => {
  [1, 2].forEach((runNo) => {
    test(`${c.name}-run${runNo}`, async ({ lab, page }, info) => {
      if (c.layout) { await lab.open({ layout: 'row3', slots: { a: 'board' }, ...(c.lock ? { lock: c.lock } : {}) }); expect(await domTree(page)).toBe('H[p-a,p-b,p-c]'); }
      else { await lab.openStandalone('board'); await page.getByTestId('board-copy-src').waitFor(); }
      const snapBefore = c.layout ? (await shot(page, info, '01-before')).snap : null;
      if (!c.layout) await capture(page, info, '01-before');
      const dnd0 = await readDnd(page);
      const t0 = Date.now();
      const p0 = await center(page, 'board-copy-src');
      await page.mouse.move(p0.x, p0.y); await page.mouse.down(); await page.mouse.move(p0.x + 6, p0.y, { steps: 2 });
      if (c.layout) await settle(page); else await page.waitForTimeout(200);
      const ds = dragEvents(await eventsSince(page, t0)).find((e) => e.type === 'dragstart' && e.phase === 'bubble');
      expect(ds?.isTrusted && ds.target.testid === 'board-copy-src' && (ds.types ?? []).includes('application/x-harbor-copy')).toBe(true);   // 전제
      const dragMid = await dragging(page);
      if (c.layout) await shot(page, info, '02-mid'); else await capture(page, info, '02-mid');
      const p1 = await center(page, 'board-copy-zone');
      await page.mouse.move(p1.x, p1.y); await page.mouse.move(p1.x, p1.y);
      if (c.layout) await settle(page); else await page.waitForTimeout(200);
      const hoverTree = c.layout ? await domTree(page) : null;
      await page.mouse.up();
      if (c.layout) await settle(page); else await page.waitForTimeout(200);
      const after = c.layout ? (await shot(page, info, '03-after')).snap : null;
      if (!c.layout) await capture(page, info, '03-after');
      const inv = c.layout ? await checkInvariants(page) : [];
      const dnd1 = await readDnd(page);
      const ev = dragEvents(await eventsSince(page, t0));
      const overZone = [...ev].reverse().find((e) => e.type === 'dragover' && e.phase === 'bubble' && e.target.testid === 'board-copy-zone');
      const drops = ev.filter((e) => e.type === 'drop');
      const dend = ev.find((e) => e.type === 'dragend');
      const copyD = (dnd1?.copyDrops ?? 0) - (dnd0?.copyDrops ?? 0);
      const calls = after ? after.calls.filter((x) => x.fn === 'onMovePanel').length : 0;
      const treeSame = snapBefore && after ? JSON.stringify(after.tree) === JSON.stringify(snapBefore.tree) : null;
      const lde = dnd1?.lastDragend?.dropEffect ?? dend?.dropEffect;
      const ideal = copyD === 1 && lde === 'copy';
      const pred = c.name === 'R11-board' ? copyD === 1 && lde === 'move' && ds?.effectAllowed === 'move' && dragMid === 'p-a'
        : c.name === 'R11-locked' ? copyD === 0 && lde === 'none' && ds?.effectAllowed === 'copy' && dragMid === null && drops.length === 0
        : copyD === 1 && lde === 'copy';
      await observe(page, info, {
        scenario: 'R11', caseName: c.name, runNo, expected: TXT[c.name][0], predicted: TXT[c.name][1],
        observed: `dragstart bubble effectAllowed=${ds?.effectAllowed} types [${(ds?.types ?? []).join(',')}]; 드래그 중 data-dragging-panel-id=${dragMid}; 존 위 dragover(bubble) dropEffect=${overZone?.dropEffect}; drop [${drops.map((e) => `${e.phase}${e.stopped ? '(stopped)' : ''}`).join(', ')}]; copyDrops +${copyD}, lastDragend ${JSON.stringify(dnd1?.lastDragend)}, lastTypes ${JSON.stringify(dnd1?.lastTypes)}, 프로브 dragend dropEffect=${dend?.dropEffect}`
          + (c.layout ? `; hover domTree ${hoverTree}; onMovePanel ${calls}건, 트리 불변=${treeSame}; ${invSummary(inv)}` : ''),
        verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates', invariants: inv, since: t0,
        extra: { events: fmtEvents(ev) },
      });
      if (runNo === 1 && c.name !== 'R11-standalone') {
        const caseDir = new URL(`../.artifacts/r11-board-copy-drag/${info.title}/`, import.meta.url).pathname;
        await promote({ run: 'run01-tier1', findingId: 'FC-QA-004', caseDir, images: c.name === 'R11-board' ? ['03-after.png'] : [], prefix: c.name === 'R11-board' ? 'R11-' : 'R11L-' });
      }
    });
  });
});
