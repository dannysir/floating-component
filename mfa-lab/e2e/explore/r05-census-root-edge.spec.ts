// R05 census, 루트 가장자리 (가장 넓은 리마운트). 대조 사다리: 전부 control(같은 제스처) → bare.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree } from '../helpers/geometry';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { promote } from '../helpers/evidence';

const EXPECTED = '`p-a`·`p-b`·`p-c` 모두 변화 없음';
const PREDICTED = '미리보기 `V[p-d,H[p-a,V[p-b,p-c]]]`. hover: `p-a`(orders) content +1·frame +1, `p-b`(billing) `mountCalls`·`unmountCalls` +1, `p-c`(telemetry) `loads` +1·frame +1. 옛 `split-1` fiber가 다른 노드(`H[p-a,V[…]]`)에 재사용돼 그 아래가 전부 새로 마운트된다. `p-d`: frame +0, moves +0. Esc: 셋 다 한 번 더(누적 +2), `p-d` moves +1';

const VARIANTS = [
  { name: 'R05-hover-esc', slots: { a: 'orders', b: 'billing', c: 'telemetry', d: 'control-d' }, src: 'control-d', watch: ['orders', 'billing', 'telemetry'] },
  { name: 'R05-ladder-control', slots: {}, src: 'control-d', watch: ['control-a', 'control-b', 'control-c'] },
  { name: 'R05-ladder-bare', slots: { a: 'bare-0', b: 'bare-1', c: 'bare-2', d: 'bare-3' }, src: 'bare-3', watch: ['bare-0', 'bare-1', 'bare-2'] },
];

VARIANTS.forEach((v) => {
  [1, 2].forEach((runNo) => {
    test(`${v.name}-run${runNo}`, async ({ lab, page }, info) => {
      await lab.open({ layout: 'census', slots: v.slots });
      const all = [...v.watch, v.src];
      await seedAll(page, all);
      const { snap: before } = await shot(page, info, '01-before');
      const t0 = Date.now();
      const d = await begin(page, v.src);
      await d.teleport(await dropPoint(page, 'p-a', 'top', 2));
      expect(await domTree(page)).toBe('V[p-d,H[p-a,V[p-b,p-c]]]');
      const { snap: mid } = await shot(page, info, '02-mid');
      const dh = deltas(before, mid);
      await d.cancelEsc();
      const { snap: after } = await shot(page, info, '03-after');
      const de = deltas(before, after);
      const inv = await checkInvariants(page);
      const remounted = (x: typeof dh[string], k: number) => x.frame === k || x.content === k || x.mountCalls === k || x.loads === k;
      const ideal = v.watch.every((s) => de[s].cls === 'untouched');
      const pred = v.watch.every((s) => remounted(dh[s], 1) && remounted(de[s], 2)) && dh[v.src].frame === 0 && dh[v.src].moves === 0 && de[v.src].moves === 1;
      await observe(page, info, {
        scenario: 'R05', caseName: v.name, runNo, expected: EXPECTED, predicted: v.name === 'R05-hover-esc' ? PREDICTED : `(사다리 변형) ${PREDICTED}`,
        observed: `hover(${mid.dom.domTree}): ${fmtDeltas(dh)} || Esc 뒤 누적: ${fmtDeltas(de)}. ${invSummary(inv)}`,
        verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates', invariants: inv, since: t0, extra: { hover: dh, esc: de },
      });
      if (v.name === 'R05-hover-esc' && runNo === 1) {
        const caseDir = new URL(`../.artifacts/r05-census-root-edge/${info.title}/`, import.meta.url).pathname;
        await promote({ run: 'run01-tier1', findingId: 'FC-QA-001', caseDir, images: ['02-mid.png', '03-after.png'], prefix: 'R05-' });
      }
    });
  });
});
