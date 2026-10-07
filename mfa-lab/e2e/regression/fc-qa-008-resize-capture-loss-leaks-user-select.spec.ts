// FC-QA-008 회귀 스펙: 경계선 리사이즈가 포인터 캡처를 잃어도(OOPIF 쪽으로 끌기) userSelect가 복원되고 같은 Resizer를 다시 잡을 수 있다.
// 버그가 있는 동안 test.fail(). 트리거는 --site-per-process(기본 실행 인자)의 telemetry-x OOPIF.
import { test, expect } from '../helpers/fixtures';
import { resizeBorder } from '../helpers/resize';

test('FC-QA-008 workbench telemetry|telemetry-x: after a resize dragged into the OOPIF, userSelect is restored and the resizer works again', { annotation: { type: 'issue', description: 'FC-QA-008' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'workbench' });
  await resizeBorder(page, { between: ['telemetry', 'telemetry-x'], delta: 120, steps: 10 });
  const userSelect = await page.evaluate(() => document.body.style.userSelect);
  const r2 = await resizeBorder(page, { between: ['telemetry', 'telemetry-x'], delta: -120, steps: 10 });
  expect(userSelect, 'body.style.userSelect after the first resize').toBe('');
  expect(r2.after.a - r2.before.a, 'second resize (-120) moves the border').toBeLessThan(-100);
});
