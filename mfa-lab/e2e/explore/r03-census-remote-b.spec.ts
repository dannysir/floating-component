// R03 census, 슬롯 B = remote (orders, billing, telemetry, telemetry-x) — hover + Esc, hover + 드롭. 대조 사다리 변형 포함.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree } from '../helpers/geometry';
import { deltas, fmtDelta, fmtDeltas, observe, seedAll, shot, invSummary } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { readFrameMfe } from '../helpers/frames';

type Kind = 'same-tree' | 'mount' | 'iframe';
const VARIANTS: { slot: string; kind: Kind; ladder?: boolean }[] = [
  { slot: 'orders', kind: 'same-tree' },
  { slot: 'billing', kind: 'mount' },
  { slot: 'telemetry', kind: 'iframe' },
  { slot: 'telemetry-x', kind: 'iframe' },
  // 대조 사다리 (기대와 다를 때): orders → orders-local, billing → billing-local → control-mount, telemetry → control-iframe. control-b·bare-1은 R01·R01-bare와 같다.
  { slot: 'orders-local', kind: 'same-tree', ladder: true },
  { slot: 'billing-local', kind: 'mount', ladder: true },
  { slot: 'control-mount', kind: 'mount', ladder: true },
  { slot: 'control-iframe', kind: 'iframe', ladder: true },
];

const EXP: Record<string, { esc: [string, string]; drop: [string, string] }> = {
  orders: { esc: ['`orders` content +0, 입력값·카운터·스크롤 유지', 'content +2, frame +2, `instanceSeq` +2, 상태 전부 초기화, `reactSame true` 유지'], drop: ['같다', 'content +1, frame +1'] },
  billing: { esc: ['`mountCalls`·`unmountCalls` +0, `rootsAlive` 1 유지, 상태 유지', '`unmountCalls` +2, `mountCalls` +2, content +2(새 루트마다 `App` 마운트), `rootsAlive` 1(settle 뒤), 상태 초기화. `lateResolves` 0(0이 아니면 픽스처 결함 후보: cleanup 뒤 도착한 모듈로 mount)'], drop: ['같다', '각 +1'] },
  telemetry: { esc: ['`loads` +0, 프레임 안 입력·스크롤 유지', '`loads` +2, `docId` 두 번 바뀜, mirror +2, `:4304` 문서 요청 +2, frame +2, 프레임 안 상태 초기화'], drop: ['같다', '`loads` +1, frame +1'] },
  'telemetry-x': { esc: ['같다', 'telemetry와 같은 수. OOPIF 여부와 무관(리마운트는 host DOM의 일)'], drop: ['같다', 'telemetry와 같은 수. OOPIF 여부와 무관(리마운트는 host DOM의 일)'] },
};
const ladderText = (slot: string): [string, string] => [`(대조 사다리 변형 ${slot}) 드래그하지 않은 슬롯 B의 내용은 리마운트·재로드되지 않는다`, '(사다리 변형) FC-QA-001 대조 실험 표: 같은 횟수'];

const docReqs = (reqs: { url: string; isNavigation: boolean }[], slot: string) => reqs.filter((r) => r.isNavigation && r.url.includes(`/?slot=${slot}&`)).length;

VARIANTS.forEach(({ slot, kind, ladder }) => {
  (['esc', 'drop'] as const).forEach((mode) => {
    if (ladder && mode === 'drop') return;   // 사다리는 hover + Esc만
    [1, 2].forEach((runNo) => {
      const caseName = ladder ? `R03-ladder-${slot}-${mode}` : `R03-${slot}-${mode}`;
      test(`${caseName}-run${runNo}`, async ({ lab, page }, info) => {
        await lab.open({ layout: 'census', slots: { b: slot } });
        await seedAll(page, ['control-a', slot, 'control-c', 'control-d']);
        const { snap: before } = await shot(page, info, '01-before');
        const reqBefore = docReqs(lab.requests, slot);
        const innerBefore = kind === 'iframe' ? await readFrameMfe(page, slot) : null;
        const t0 = Date.now();
        const d = await begin(page, 'control-d');
        await d.teleport(await dropPoint(page, 'p-a', 'left', 1));
        expect(await domTree(page)).toBe('H[p-d,p-a,V[p-b,p-c]]');
        await shot(page, info, '02-mid');
        const r = mode === 'esc' ? await d.cancelEsc() : await d.release();
        const { snap: after } = await shot(page, info, '03-after');
        const inv = await checkInvariants(page);
        const ds = deltas(before, after);
        const b = ds[slot];
        const mfe = after.counters.mfe[slot] as Record<string, unknown> | undefined;
        const frame = after.counters.frames[slot] as Record<string, unknown> | undefined;
        const innerAfter = kind === 'iframe' ? await readFrameMfe(page, slot) : null;
        const reqs = docReqs(lab.requests, slot) - reqBefore;
        const k = mode === 'esc' ? 2 : 1;
        const ideal = b.frame === 0 && b.content === 0 && b.moves === 0 && (b.loads ?? 0) === 0 && b.mountCalls === 0 && b.unmountCalls === 0;
        const pred = kind === 'same-tree' ? b.frame === k && b.content === k
          : kind === 'mount' ? (slot === 'billing-local' ? b.content === k && b.frame === k : b.mountCalls === k && b.unmountCalls === k && b.content === k && b.rootsAlive === 1)
          : b.frame === k && b.loads === k && reqs === (slot === 'control-iframe' ? 0 : k);
        const [expected, predicted] = ladder ? ladderText(slot) : EXP[slot][mode];
        const extraInfo = kind === 'same-tree' ? `instanceSeq=${mfe?.instanceSeq} reactSame=${mfe?.reactSame} build=${mfe?.build}`
          : kind === 'mount' ? `mountCalls=${mfe?.mountCalls} unmountCalls=${mfe?.unmountCalls} rootsAlive=${mfe?.rootsAlive} lateResolves=${frame?.lateResolves ?? 0}`
          : `frame-doc loads ${innerBefore?.loads}→${innerAfter?.loads}, docId changed=${innerBefore?.docId !== innerAfter?.docId}, mirror=${JSON.stringify((frame as { mirror?: unknown })?.mirror)}, :4304 문서 요청 +${reqs}`;
        await observe(page, info, {
          scenario: 'R03', caseName, runNo, expected, predicted,
          observed: `${mode === 'esc' ? 'Esc' : `드롭(커밋 ${after.treeNotation}, dragend ${r.dragendDropEffect})`} 뒤 슬롯 B ${fmtDelta(b)}; ${extraInfo}. ${invSummary(inv)}. 전체: ${fmtDeltas(ds)}`,
          verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates', invariants: inv, since: t0,
          labels: slot === 'telemetry-x' ? { oopif: 'yes (--site-per-process)', harness_fidelity: 'cross-site iframe: CDP 드래그 이벤트 미전달(S9)' } : {},
          extra: { deltas: ds, docRequests: reqs, innerBefore, innerAfter },
        });
      });
    });
  });
});
