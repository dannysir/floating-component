// R04 census, 슬롯 A = remote — p-a 재삽입(R01과 같은 제스처). 대조 사다리는 기대와 다를 때(예측대로면 R01 control-a·bare-0이 이미 같은 결과).
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree } from '../helpers/geometry';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import type { Page } from '@playwright/test';

const EXP = '`p-a`에 아무 변화 없음';
const PRED: Record<string, string> = {
  orders: 'hover: frame +0, content +0, moves +1, `orders-scroll`의 `scrollTop` 0으로 초기화, input·counter 유지. Esc: 추가 변화 없음',
  billing: '같다. `mountCalls`·`unmountCalls` +0, `rootsAlive` 1, scrollTop 초기화',
  telemetry: 'frame +0인데 `loads` +1, `docId` 변경, 문서 요청 +1(재삽입된 iframe이 다시 로드). Esc 추가 없음',
};
const docReqs = (page: Page) => page.evaluate(() => performance.getEntriesByType('resource').filter((e) => (e as PerformanceResourceTiming).initiatorType === 'iframe').length);

// telemetry: (p-a, left, 1) 점이 iframe 본문 위라 shield 없이는 미리보기가 생기지 않는다(FC-QA-005). 재삽입을 보려고 iframeShield=1을 쓴다
// (shield는 드래그 중 iframe에 pointer-events:none만 건다. 라이브러리의 재배치 경로는 같다). 대조 사다리: control-iframe(같은 shield).
const CASES = [
  { slot: 'orders', name: 'R04-orders', flags: {} },
  { slot: 'billing', name: 'R04-billing', flags: {} },
  { slot: 'telemetry', name: 'R04-telemetry', flags: { iframeShield: '1' } },
  { slot: 'control-iframe', name: 'R04-ladder-control-iframe', flags: { iframeShield: '1' } },
] as const;
CASES.forEach(({ slot, name, flags }) => {
  [1, 2].forEach((runNo) => {
    test(`${name}-run${runNo}`, async ({ lab, page }, info) => {
      await lab.open({ layout: 'census', slots: { a: slot }, flags: { ...flags } });
      expect(await domTree(page)).toBe('H[p-a,V[p-b,p-c],p-d]');                           // 전제
      const slots = [slot, 'control-b', 'control-c', 'control-d'];
      await seedAll(page, slots);
      const { snap: before } = await shot(page, info, '01-before');
      const req0 = await docReqs(page);
      const t0 = Date.now();
      const d = await begin(page, 'control-d');
      await d.teleport(await dropPoint(page, 'p-a', 'left', 1));
      expect(await domTree(page)).toBe('H[p-d,p-a,V[p-b,p-c]]');                           // 전제
      const { snap: mid } = await shot(page, info, '02-mid');
      const req1 = await docReqs(page);
      await d.cancelEsc();
      const { snap: after } = await shot(page, info, '03-after');
      const req2 = await docReqs(page);
      const inv = await checkInvariants(page);
      const dh = deltas(before, mid); const de = deltas(mid, after);
      const A = dh[slot]; const Ae = de[slot];
      const late = await page.evaluate((s) => (window as unknown as { __fc: { frames: Record<string, { lateResolves?: number }> } }).__fc.frames[s]?.lateResolves ?? null, slot);
      const ideal = A.cls === 'untouched' && Ae.cls === 'untouched';
      const iframe = slot === 'telemetry' || slot === 'control-iframe';
      const pred = iframe
        ? A.frame === 0 && A.loads === 1 && A.docIdChanged && (Ae.loads ?? 0) === 0 && Ae.frame === 0
        : A.frame === 0 && A.content === 0 && A.moves === 1 && A.scrollTop === 0 && Ae.frame === 0 && Ae.content === 0 && (slot !== 'billing' || (A.mountCalls === 0 && A.unmountCalls === 0 && A.rootsAlive === 1));
      await observe(page, info, {
        scenario: 'R04', caseName: name, runNo, expected: name.includes('ladder') ? `(대조 사다리) ${EXP}` : EXP, predicted: name.includes('ladder') ? `(대조 사다리 control-iframe) ${PRED.telemetry}` : PRED[slot],
        labels: iframe ? { iframeShield: '1 (FC-QA-005 때문에 shield 사용)' } : {},
        observed: `hover(01→02): ${fmtDeltas(dh)} || Esc(02→03): ${fmtDeltas(de)} || iframe 리소스 요청 ${req0}→${req1}→${req2}; lateResolves ${late}; ${invSummary(inv)}`,
        verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates', invariants: inv, since: t0,
        extra: { hover: dh, esc: de },
      });
    });
  });
});
