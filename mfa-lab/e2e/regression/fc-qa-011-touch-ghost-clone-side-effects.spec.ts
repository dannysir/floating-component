// FC-QA-011 회귀 스펙(후보 오라클, needs-user-confirmation): 터치 드래그 시작(ghost 생성)이 iframe 패널 문서를 한 번 더 로드하지 않는다.
// touch 프로젝트 전용. 버그가 있는 동안 test.fail().
import { test, expect } from '../helpers/fixtures';
import { openTouch } from '../helpers/touch';
import { handlePoint } from '../helpers/geometry';
import { settle } from '../helpers/settle';

test.beforeEach(({}, testInfo) => {
  if (testInfo.project.name !== 'touch') test.skip(true, 'touch project only');
});

test('FC-QA-011 pair a=telemetry: starting a handle touch drag does not load the iframe document again (ghost clone)', { annotation: { type: 'issue', description: 'FC-QA-011' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'pair', slots: { a: 'telemetry', b: 'control-b' } });
  const mirror = () => page.evaluate(() => (window as unknown as { __fc: { frames: Record<string, { mirror?: { loads: number } }> } }).__fc.frames.telemetry?.mirror?.loads ?? 0);
  const m0 = await mirror();
  const t = await openTouch(page);
  const h = await handlePoint(page, 'telemetry');
  await t.touchStart(h);
  await t.touchMove({ x: h.x + 12, y: h.y });
  await t.touchMove({ x: h.x + 24, y: h.y });
  await t.hold(500);
  await settle(page);
  const ghosts = await page.locator('body > [style*="z-index: 9999"]').count();
  const m1 = await mirror();
  await t.touchCancel();
  expect.soft(ghosts, 'precondition: drag started (ghost)').toBe(1);
  expect(m1 - m0, 'iframe document loads caused by the ghost').toBe(0);
});
