// R01 대조 사다리(기대와 다를 때): census bare. PanelFrame과 내용 없이 라이브러리만으로 재현되는가.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { deltas, fmtDeltas, observe, seedAll, shot } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';

const SLOTS = ['bare-0', 'bare-1', 'bare-2', 'bare-3'];
const EXPECTED = '드래그하지 않은 `p-a`·`p-b`·`p-c`의 내용은 unmount·재삽입·재로드되지 않는다. input·counter·scrollTop 유지';
const PREDICTED = '(사다리 변형) FC-QA-001 대조 실험 표: bare에서도 재현(코어 문제)';

[1, 2].forEach((runNo) => {
  test(`R01-bare-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'census', slots: { a: 'bare-0', b: 'bare-1', c: 'bare-2', d: 'bare-3' } });
    await seedAll(page, SLOTS);
    const { snap: before } = await shot(page, info, '01-before');
    const t0 = Date.now();
    const d = await begin(page, 'bare-3');
    await d.teleport(await dropPoint(page, 'p-a', 'left', 1));
    expect(await domTree(page)).toBe('H[p-d,p-a,V[p-b,p-c]]');
    const { snap: mid } = await shot(page, info, '02-mid');
    const dh = deltas(before, mid);
    await d.cancelEsc();
    await settle(page);
    const { snap: after } = await shot(page, info, '03-after');
    const de = deltas(before, after);
    const inv = await checkInvariants(page);
    const remount = ['bare-1', 'bare-2'].every((s) => dh[s].content === 1);
    await observe(page, info, {
      scenario: 'R01', caseName: 'R01-bare', runNo, expected: EXPECTED, predicted: PREDICTED,
      observed: `hover: ${fmtDeltas(dh)} || Esc 뒤 누적: ${fmtDeltas(de)}`,
      verdict: remount ? 'as-predicted' : 'as-ideal', invariants: inv, since: t0, extra: { hover: dh, esc: de },
    });
  });
});
