// FC-QA-004 회귀 스펙(후보 오라클, needs-user-confirmation): 패널 드래그가 아닌 드래그의 drop은 window 버블 단계까지 전파된다(단독 페이지와 같다). 버그가 있는 동안 test.fail().
import { test, expect } from '../helpers/fixtures';
import { settle } from '../helpers/settle';
import { readProbe } from '../helpers/probe.init';

test('FC-QA-004 row3 a=board-local: card drop reaches the window bubble listener', { annotation: { type: 'issue', description: 'FC-QA-004' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'row3', slots: { a: 'board-local' } });
  const t0 = Date.now();
  const center = async (id: string) => { const b = (await page.getByTestId(id).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const p0 = await center('board-local-card-c1');
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.mouse.move(p0.x + 6, p0.y, { steps: 2 });
  await settle(page);
  const p1 = await center('board-local-col-1');
  await page.mouse.move(p1.x, p1.y, { steps: 2 });
  await page.mouse.move(p1.x, p1.y);
  await settle(page);
  await page.mouse.up();
  await settle(page);
  const drops = (await readProbe(page, { since: t0 })).events.filter((e) => e.type === 'drop');
  expect.soft(drops.some((e) => e.phase === 'capture'), 'precondition: a drop happened').toBe(true);
  expect(drops.some((e) => e.phase === 'bubble'), 'window bubble drop').toBe(true);
});

const copyDrag = async (page: import('@playwright/test').Page) => {
  const c = async (id: string) => { const b = (await page.getByTestId(id).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const p0 = await c('board-copy-src');
  await page.mouse.move(p0.x, p0.y); await page.mouse.down(); await page.mouse.move(p0.x + 6, p0.y, { steps: 2 }); await settle(page);
  const p1 = await c('board-copy-zone');
  await page.mouse.move(p1.x, p1.y); await page.mouse.move(p1.x, p1.y); await settle(page);
  await page.mouse.up(); await settle(page);
  return page.evaluate(() => (window as unknown as { __mfe: Record<string, { dnd: { copyDrops: number; lastDragend: { dropEffect: string } | null } }> }).__mfe.board.dnd);
};

test('FC-QA-004 row3 a=board: a copy-only drag inside the panel ends with dropEffect copy (R11-board)', { annotation: { type: 'issue', description: 'FC-QA-004' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'row3', slots: { a: 'board' } });
  const dnd = await copyDrag(page);
  expect.soft(dnd.copyDrops, 'precondition: copy drop handled').toBe(1);
  expect(dnd.lastDragend?.dropEffect, 'dragend dropEffect').toBe('copy');
});

test('FC-QA-004 row3 a=board lock=p-a:draggable: a copy-only drag is accepted (R11-locked)', { annotation: { type: 'issue', description: 'FC-QA-004' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'row3', slots: { a: 'board' }, lock: 'p-a:draggable' });
  const dnd = await copyDrag(page);
  expect(dnd.copyDrops, 'copy drops').toBe(1);
});
