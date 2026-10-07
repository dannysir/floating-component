// FC-QA-003 회귀 스펙: 패널 내용(remote 칸반 카드)의 네이티브 드래그는 패널 드래그로 처리되지 않는다. 버그가 있는 동안 test.fail().
import { test, expect } from '../helpers/fixtures';
import { domTree } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { readProbe } from '../helpers/probe.init';

test('FC-QA-003 row3 a=board-local: card drag does not mark the root as dragging a panel', { annotation: { type: 'issue', description: 'FC-QA-003' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'row3', slots: { a: 'board-local' } });
  expect.soft(await domTree(page), 'precondition: tree').toBe('H[p-a,p-b,p-c]');
  const t0 = Date.now();
  const b = (await page.getByTestId('board-local-card-c1').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 6, b.y + b.height / 2, { steps: 2 });
  await settle(page);
  const dragging = await page.evaluate(() => document.querySelector('[data-tree-root]')?.getAttribute('data-dragging-panel-id') ?? null);
  const start = (await readProbe(page, { since: t0 })).events.find((e) => e.type === 'dragstart' && e.phase === 'bubble');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await settle(page);
  expect.soft(start, 'precondition: trusted dragstart from the card').toBeTruthy();
  expect(dragging, 'root data-dragging-panel-id during card drag').toBeNull();
  expect(start?.types ?? [], 'dragstart types').not.toContain('text/panel-id');
});
