// FC-QA-010 회귀 스펙: 경계선 드래그의 상한이 설정 px(maxWidth 400)과 3px 안에서 같다(자식 3개 split). 버그가 있는 동안 test.fail().
import { test, expect } from '../helpers/fixtures';
import { panelRect } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { resizeBorder } from '../helpers/resize';

const TREE = { type: 'split', direction: 'horizontal', size: 1, children: [
  { type: 'panel', id: 'p-a', size: 1, componentKey: 'control-a', minWidth: 200, maxWidth: 400 },
  { type: 'panel', id: 'p-b', size: 1, componentKey: 'control-b' },
  { type: 'panel', id: 'p-c', size: 1, componentKey: 'control-c', minWidth: 150 }] };

test('FC-QA-010 row3-size: dragging the p-a|p-b border outward stops at maxWidth 400px (±3), not below the start width', { annotation: { type: 'issue', description: 'FC-QA-010' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'row3' });
  await page.evaluate((t) => { localStorage.clear(); localStorage.setItem('harbor.layout.row3.v1', JSON.stringify(t)); }, TREE);
  await lab.open({ layout: 'row3', flags: { persist: '1' } });
  await settle(page);
  const start = (await panelRect(page, 'p-a')).width;
  await resizeBorder(page, { between: ['p-a', 'p-b'], delta: 400, steps: 20 });
  const after = (await panelRect(page, 'p-a')).width;
  expect(after, 'p-a must not shrink when the border is dragged outward').toBeGreaterThanOrEqual(start - 1);
  expect(Math.abs(after - 400), 'p-a width vs maxWidth 400').toBeLessThanOrEqual(3);
});
