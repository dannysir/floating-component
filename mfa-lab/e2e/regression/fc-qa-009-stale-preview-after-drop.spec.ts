// FC-QA-009 회귀 스펙(stale preview, harness_amplified): 소스가 아닌 패널 위에서 놓아도 드롭 뒤 미리보기·shadow가 남지 않는다(I2).
// 버그가 있는 동안 test.fail(). 재현 경로는 explore/r18-x01(nudge) — 마지막 dragover가 drop과 한 프레임 안.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, handlePoint } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { checkInvariants } from '../helpers/invariants';

test('FC-QA-009 workbench: release over another panel header leaves no shadow on the source', { annotation: { type: 'issue', description: 'FC-QA-009' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'workbench' });
  const s = await begin(page, 'orders');
  await s.teleport(await dropPoint(page, 'billing', 'top', 0)); await s.release(); await settle(page);
  const pt = await handlePoint(page, 'telemetry');
  const d = await begin(page, 'board');
  await d.teleport(pt);
  for (let k = 0; k < 4; k++) await d.nudge();                       // 멈춘 커서의 주기적 dragover(부작용 #2 emulated)
  const res = await d.release({ mode: 'settled' });
  expect.soft(res.underCursorAtDrop, 'precondition: release over another droppable panel').toBe('other-droppable');
  const inv = await checkInvariants(page);
  expect(inv.find((r) => r.id === 'I2')?.pass, 'I2: no shadow after the drag ended').toBe(true);
});

test('FC-QA-009 workbench: a non-panel drop (ext-chip) after a drag does not call onMovePanel', { annotation: { type: 'issue', description: 'FC-QA-009' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다 (R08 대체 유도: stale 미리보기를 chip 드롭이 커밋한다)
  await lab.open({ layout: 'workbench' });
  const s = await begin(page, 'orders');
  await s.teleport(await dropPoint(page, 'billing', 'top', 0)); await s.release(); await settle(page);
  const d = await begin(page, 'board');
  await d.teleport(await handlePoint(page, 'telemetry'));
  for (let k = 0; k < 4; k++) await d.nudge();
  await d.release({ mode: 'settled' });
  await settle(page);
  const callsOf = () => page.evaluate(() => (window as unknown as { __fc: { calls: Array<{ fn: string }> } }).__fc.calls.filter((c) => c.fn === 'onMovePanel').length);
  const n0 = await callsOf();
  const b = (await page.getByTestId('ext-chip').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + 6, b.y + b.height / 2, { steps: 2 }); await settle(page);
  const o = (await page.locator('[data-tree-root] [data-panel-id="orders"]').boundingBox())!;
  await page.mouse.move(o.x + o.width / 2, o.y + 40); await page.mouse.move(o.x + o.width / 2, o.y + 40); await settle(page);
  await page.mouse.up(); await settle(page);
  expect(await callsOf() - n0, 'onMovePanel calls caused by the chip drop').toBe(0);
});
