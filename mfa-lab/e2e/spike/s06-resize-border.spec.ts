// S6 (B1-03d 게이트): 경계선 리사이즈. ?layout=row3에서 p-a와 p-b 사이를 +150px, 10 step.
import { test, expect } from '../helpers/fixtures';
import { resizeBorder } from '../helpers/resize';
import { settle } from '../helpers/settle';
import { writeBaseline } from '../helpers/baseline';
import { expectInvariants } from '../helpers/invariants';
import { fmtEvents } from '../helpers/events';

const TOL = 3;

test('S6 resize border between p-a and p-b by +150px', async ({ lab, page }) => {
  await lab.open({ layout: 'row3' });
  await settle(page);
  const res = await resizeBorder(page, { between: ['p-a', 'p-b'], delta: 150, steps: 10 });
  console.log(`[S6] axis=${res.axis} before=${JSON.stringify(res.before)} after=${JSON.stringify(res.after)} during userSelect=${res.bodyUserSelectDuring} after=${res.bodyUserSelectAfter}`);

  expect(res.gotPointerCapture).toBe(true);
  const da = res.after.a - res.before.a;
  const db = res.after.b - res.before.b;
  expect(da).toBeGreaterThan(0);                  // p-a는 커진다
  expect(db).toBeLessThan(0);                     // p-b는 줄어든다
  expect(Math.abs(da - 150)).toBeLessThanOrEqual(TOL);
  expect(Math.abs(-db - 150)).toBeLessThanOrEqual(TOL);
  expect(res.bodyUserSelectDuring).toBe('none');
  expect(res.bodyUserSelectAfter).toBe(lab.bodyUserSelect());
  expect(res.snapshot.calls.some((c) => c.fn === 'onResizeBorder')).toBe(true);
  // 리사이즈 중 mousemove가 없는 것은 실패가 아니다 (pointerdown 취소). 기록만 한다.
  console.log(`[S6] mousemove during resize: ${res.events.filter((e) => e.type === 'mousemove').length}; calls=${res.snapshot.calls.filter((c) => c.fn === 'onResizeBorder').length}`);
  await expectInvariants(page);

  writeBaseline('s06', res.events);
  console.log(`[S6] ${fmtEvents(res.events)}`);
});
