// R01 census, 전부 control — hover와 Esc (BRIEF-2 「시나리오 표」 R01, 「기대와 예측」 R01)
// 전제만 단언한다. 라이브러리 동작은 관찰 기록으로 남긴다.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree, treeNotation } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary, eventsSince } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { promote } from '../helpers/evidence';

const SLOTS = ['control-a', 'control-b', 'control-c', 'control-d'];
const EXPECTED = {
  hover: '드래그하지 않은 `p-a`·`p-b`·`p-c`의 내용은 unmount·재삽입·재로드되지 않는다. input·counter·scrollTop 유지',
  esc: '원래 배치로 복귀, 카운터 변화 없음, I1~I7 통과',
};
const PREDICTED = {
  hover: '미리보기 `H[p-d,p-a,V[p-b,p-c]]`. `p-b`·`p-c`: frame +1, content +1, input·counter·scrollTop 초기화(split 키 `split-1` → `split-2`). `p-a`: frame +0, content +0, moves +1, scrollTop 0으로 초기화. `p-d`(소스): 변화 없음, DOM도 안 움직임',
  esc: '`p-b`·`p-c` 누적 frame +2, content +2. `p-d` moves +1(취소 때 재삽입). `p-a` 추가 변화 없음. I1~I7 통과. `calls` 비어 있음. `dragend`는 window 레코드(소스가 리마운트되지 않았으므로 연결된 노드)',
};

[1, 2].forEach((runNo) => {
  test(`R01-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'census' });
    expect(await domTree(page)).toBe('H[p-a,V[p-b,p-c],p-d]');
    await seedAll(page, SLOTS);
    const { snap: before } = await shot(page, info, '01-before');
    const t0 = Date.now();

    const d = await begin(page, 'control-d');
    await d.teleport(await dropPoint(page, 'p-a', 'left', 1));
    expect(await domTree(page)).toBe('H[p-d,p-a,V[p-b,p-c]]');                     // 전제
    const { snap: mid } = await shot(page, info, '02-mid');
    expect(mid.dom.panels['p-d'].shadow).toBe(true);                                // 전제
    const dh = deltas(before, mid);
    const midInv = await checkInvariants(page, { skipSettle: true });

    const idealHover = ['control-a', 'control-b', 'control-c'].every((s) => dh[s].frame === 0 && dh[s].content === 0 && dh[s].moves === 0 && dh[s].cls === 'untouched');
    const predHover = ['control-b', 'control-c'].every((s) => dh[s].frame === 1 && dh[s].content === 1)
      && dh['control-a'].frame === 0 && dh['control-a'].moves === 1 && dh['control-d'].frame === 0 && dh['control-d'].moves === 0;
    await observe(page, info, {
      scenario: 'R01', caseName: 'R01-hover', runNo, expected: EXPECTED.hover, predicted: PREDICTED.hover,
      observed: `미리보기 ${mid.dom.domTree}, p-d shadow=${mid.dom.panels['p-d'].shadow}. ${fmtDeltas(dh)}`,
      verdict: idealHover ? 'as-ideal' : predHover ? 'as-predicted' : 'deviates',
      invariants: midInv, since: t0, extra: { deltas: dh, phase: 'hover (불변식은 드래그 중이라 I1·I2 실패가 정상)' },
    });

    const res = await d.cancelEsc();
    await settle(page);
    const { snap: after } = await shot(page, info, '03-after');
    const de = deltas(before, after);
    const events = await eventsSince(page, t0);
    const dragends = events.filter((e) => e.type === 'dragend').map((e) => `${e.phase}/${e.target.panelId}/connected=${e.isConnected}`);
    const inv = await checkInvariants(page);
    const movesCalls = after.calls.filter((c) => c.fn === 'onMovePanel').length;
    const treeSame = JSON.stringify(after.tree) === JSON.stringify(before.tree);
    const idealEsc = treeSame && inv.every((r) => r.pass) && SLOTS.every((s) => de[s].frame === 0 && de[s].content === 0 && de[s].moves === 0);
    const predEsc = treeSame && inv.every((r) => r.pass) && movesCalls === 0
      && ['control-b', 'control-c'].every((s) => de[s].frame === 2 && de[s].content === 2) && de['control-d'].moves === 1;
    await observe(page, info, {
      scenario: 'R01', caseName: 'R01-esc', runNo, expected: EXPECTED.esc, predicted: PREDICTED.esc,
      observed: `Esc 뒤 domTree ${after.dom.domTree} (tree ${treeNotation(after.tree as Parameters<typeof treeNotation>[0])}), sawDrop=${res.sawDrop}, onMovePanel ${movesCalls}건, dragend [${dragends.join(', ')}]. ${invSummary(inv)}. 누적: ${fmtDeltas(de)}`,
      verdict: idealEsc ? 'as-ideal' : predEsc ? 'as-predicted' : 'deviates',
      invariants: inv, since: t0, extra: { deltas: de, dragends },
    });
    if (runNo === 1) {
      const caseDir = new URL(`../.artifacts/r01-census-hover-esc/${info.title}/`, import.meta.url).pathname;
      await promote({ run: 'run01-tier1', findingId: 'FC-QA-001', caseDir, images: ['01-before.png', '02-mid.png', '03-after.png'] });
      await promote({ run: 'run01-tier1', findingId: 'FC-QA-002', caseDir, images: ['01-before.png', '02-mid.png'] });
    }
  });
});
