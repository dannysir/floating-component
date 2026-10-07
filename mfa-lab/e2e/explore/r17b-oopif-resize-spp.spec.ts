// R17 귀속 사다리(대조·하네스 점검): workbench의 telemetry|telemetry-x 경계선 리사이즈. 방향 ±120을 새 페이지에서 각각.
// 짝 파일 r17b-oopif-resize-nospp.spec.ts는 사이트 격리 없이(telemetry-x가 OOPIF가 아님) 같은 절차. 기록만 한다.
import { test } from '../helpers/fixtures';
import { resizeBorder } from '../helpers/resize';
import { readFrameMfe } from '../helpers/frames';
import { checkInvariants } from '../helpers/invariants';

const LABEL = 'spp';
[120, -120].forEach((delta) => {
  test(`r17b-${LABEL}-${delta}`, async ({ lab, page }) => {
    await lab.open({ layout: 'workbench' });
    const s0 = (await readFrameMfe(page, 'telemetry-x'))?.seen;
    const s0t = (await readFrameMfe(page, 'telemetry'))?.seen;
    const r = await resizeBorder(page, { between: ['telemetry', 'telemetry-x'], delta, steps: 10 });
    const s1 = (await readFrameMfe(page, 'telemetry-x'))?.seen;
    const s1t = (await readFrameMfe(page, 'telemetry'))?.seen;
    const ptr = r.events.filter((e) => e.type.startsWith('pointer') || e.type.endsWith('pointercapture'));
    const summary = ptr.map((e) => `${e.type}/${e.phase}/${e.top ? 'top' : 'frame'}${e.count ? `x${e.count}` : ''}`).join(' ');
    const inv = await checkInvariants(page);
    // 같은 경계선을 반대로 한 번 더(다시 잡히는지)
    const r2 = await resizeBorder(page, { between: ['telemetry', 'telemetry-x'], delta: -delta, steps: 10 });
    console.log(`[r17b ${LABEL} ${delta}] a ${r.before.a.toFixed(1)}→${r.after.a.toFixed(1)} cap ${r.gotPointerCapture}/${r.lostPointerCapture} us ${JSON.stringify(r.bodyUserSelectDuring)}→${JSON.stringify(r.bodyUserSelectAfter)} `
      + `seen.pm telemetry-x ${s0?.pointermove}→${s1?.pointermove} telemetry ${s0t?.pointermove}→${s1t?.pointermove}; I4=${inv.find((x) => x.id === 'I4')?.pass}; events ${summary}; `
      + `재시도 ${-delta}: a ${r2.before.a.toFixed(1)}→${r2.after.a.toFixed(1)} cap ${r2.gotPointerCapture}`);
  });
});
