// FC-QA-005 회귀 스펙: iframe 패널도 마우스 드롭 대상이다(터치와 같다). 하네스가 충실한 same-origin control-iframe으로 본다(HARNESS 부작용 #7).
// 버그가 있는 동안 test.fail().
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree } from '../helpers/geometry';

test('FC-QA-005 row3 b=control-iframe: mouse hover over the iframe body previews H[p-b,p-a,p-c]', { annotation: { type: 'issue', description: 'FC-QA-005' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'row3', slots: { a: 'control-a', b: 'control-iframe', c: 'control-c' }, flags: { iframeShield: '0' } });
  expect.soft(await domTree(page), 'precondition: tree').toBe('H[p-a,p-b,p-c]');
  const a = await begin(page, 'control-a');
  await a.teleport(await dropPoint(page, 'p-b', 'right', 0));
  await a.nudge();
  const hover = await domTree(page);
  await a.cancelEsc();
  expect(hover, 'hover preview over iframe panel').toBe('H[p-b,p-a,p-c]');
});
