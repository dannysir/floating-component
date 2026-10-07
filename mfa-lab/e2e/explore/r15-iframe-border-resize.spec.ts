// R15 iframe 옆 경계선 리사이즈: iframe 쪽으로 150px 끌고 iframe 본문 위에서 놓기 → 같은 경계선을 반대로(다시 잡히는지).
import { test } from '../helpers/fixtures';
import { panelRect } from '../helpers/geometry';
import { resizeBorder } from '../helpers/resize';
import { observe, seedAll, shot, invSummary } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { readFrameMfe } from '../helpers/frames';
import { snapshot } from '../helpers/snapshot';

const TXT: Record<string, [string, string]> = {
  'R15-telemetry': ['포인터가 iframe 위를 지나고 iframe 위에서 놓아도 리사이즈가 끝까지 따라오고 깨끗이 끝난다', '통과(same-site, 같은 프로세스). `gotpointercapture` 1건, 캡처 중 프레임 안 `seen.pointermove` 증가 없음, 방향·3px, `userSelect` 복원'],
  'R15-telemetry-x': ['같다', '**열린 질문.** 프로세스 밖 iframe 위의 포인터 캡처는 근거가 없다. 가정하지 말고 기록한다. 캡처가 끊기면 `userSelect`가 `none`으로 남고 그 Resizer는 다시 잡히지 않는다(`activePointerId` 잔존)'],
};
const CASES = [
  { name: 'R15-telemetry', between: ['p-a', 'p-b'] as [string, string], over: 'p-b', frameSlot: 'telemetry' },
  { name: 'R15-telemetry-x', between: ['p-b', 'p-c'] as [string, string], over: 'p-c', frameSlot: 'telemetry-x' },
];

CASES.forEach((c) => {
  [1, 2].forEach((runNo) => {
    test(`${c.name}-run${runNo}`, async ({ lab, page }, info) => {
      await lab.open({ layout: 'row3', slots: { a: 'control-a', b: 'telemetry', c: 'telemetry-x' } });
      await seedAll(page, ['control-a', 'telemetry', 'telemetry-x']);
      const { snap: before } = await shot(page, info, '01-before');
      const r = await panelRect(page, c.over);
      const center = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      const f0 = await readFrameMfe(page, c.frameSlot);
      const rz = await page.evaluate(([a, b]) => { const ra = document.querySelector(`[data-tree-root] [data-panel-id="${a}"]`)!.getBoundingClientRect(); const rb = document.querySelector(`[data-tree-root] [data-panel-id="${b}"]`)!.getBoundingClientRect(); return (ra.right + rb.left) / 2; }, c.between);
      const pointerTravel = center.x - rz;                                                // releaseOver가 커서를 iframe 중앙까지 더 옮긴다
      const t0 = Date.now();
      const r1 = await resizeBorder(page, { between: c.between, delta: 150, steps: 15, releaseOver: center });
      const f1 = await readFrameMfe(page, c.frameSlot);
      await shot(page, info, '02-mid');
      const inv1 = await checkInvariants(page);
      const r2 = await resizeBorder(page, { between: c.between, delta: -150, steps: 15 });
      const { snap: after } = await shot(page, info, '03-after');
      const inv2 = await checkInvariants(page);
      const f2 = await readFrameMfe(page, c.frameSlot);
      const up1 = r1.events.filter((e) => e.type === 'pointerup').map((e) => (e.top ? 'top' : 'frame'));
      const calls = after.calls.slice(before.calls.length).filter((x) => x.fn === 'onResizeBorder');
      const d1 = r1.after.a - r1.before.a; const d2 = r2.after.a - r2.before.a;
      const ok1 = d1 > 0 && Math.abs(d1 - pointerTravel) <= 3 && r1.gotPointerCapture && r1.bodyUserSelectAfter === '' && inv1.every((x) => x.pass);
      const ok2 = d2 < -100 && r2.bodyUserSelectAfter === '' && inv2.every((x) => x.pass);
      const ideal = ok1 && ok2 && (f1?.seen.pointermove ?? 0) === (f0?.seen.pointermove ?? 0) && (f2?.loads ?? 0) === (f0?.loads ?? 0);
      const pred = c.name === 'R15-telemetry' ? ideal
        : !r1.gotPointerCapture && r1.bodyUserSelectAfter === 'none' && Math.abs(d2) < 1;
      const s = await snapshot(page, 'x');
      await observe(page, info, {
        scenario: 'R15', caseName: c.name, runNo, expected: TXT[c.name][0], predicted: TXT[c.name][1],
        observed: `r1(+150, ${c.over} 본문 위에서 놓기): ${c.between[0]} ${r1.before.a.toFixed(1)}→${r1.after.a.toFixed(1)}(${d1.toFixed(1)}, 포인터 이동 ${pointerTravel.toFixed(1)}), capture ${r1.gotPointerCapture}/${r1.lostPointerCapture}, pointerup [${up1.join(',')}], userSelect ${JSON.stringify(r1.bodyUserSelectDuring)}→${JSON.stringify(r1.bodyUserSelectAfter)}, 불변식 ${invSummary(inv1)}; `
          + `${c.frameSlot} seen.pointermove ${f0?.seen.pointermove}→${f1?.seen.pointermove}, loads ${f0?.loads}→${f2?.loads}; r2(-150): ${r2.before.a.toFixed(1)}→${r2.after.a.toFixed(1)}(${d2.toFixed(1)}), capture ${r2.gotPointerCapture}, userSelect→${JSON.stringify(r2.bodyUserSelectAfter)}; onResizeBorder ${calls.length}건(첫 path ${JSON.stringify(calls[0]?.args?.slice(0, 2))}); 끝 ${invSummary(inv2)}; bodyUserSelect ${JSON.stringify(s.dom.bodyUserSelect)}`,
        verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates', invariants: inv2, since: t0,
        labels: c.name === 'R15-telemetry-x' ? { oopif: 'yes (--site-per-process, S9)' } : {},
      });
    });
  });
});
