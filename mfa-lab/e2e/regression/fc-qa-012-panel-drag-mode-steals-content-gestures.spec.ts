// FC-QA-012 회귀 스펙(후보 오라클, needs-user-confirmation): ?drag=panel(핸들 없음)에서도 패널 안 입력창의 텍스트 드래그 선택은 패널 드래그가 되지 않는다.
// 버그가 있는 동안 test.fail().
import { test, expect } from '../helpers/fixtures';
import { settle } from '../helpers/settle';

test('FC-QA-012 pair drag=panel: drag-selecting text in control-a input selects text instead of dragging the panel', { annotation: { type: 'issue', description: 'FC-QA-012' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'pair', flags: { drag: 'panel' } });
  const inp = page.locator('[data-tree-root] [data-testid="control-a-input"]');
  await inp.fill('select me please');
  const b = (await inp.boundingBox())!;
  await page.mouse.move(b.x + 4, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width - 10, b.y + b.height / 2, { steps: 8 }); await settle(page);
  const dragging = await page.evaluate(() => document.querySelector('[data-tree-root]')?.getAttribute('data-dragging-panel-id') ?? null);
  await page.mouse.up(); await page.keyboard.press('Escape'); await settle(page);
  const sel = await inp.evaluate((el: HTMLInputElement) => (el.selectionEnd ?? 0) - (el.selectionStart ?? 0));
  expect(dragging, 'panel drag started from text selection').toBeNull();
  expect(sel, 'selected characters').toBeGreaterThan(0);
});
