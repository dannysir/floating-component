// R02 census, 전부 control — hover 뒤 드롭 (overShadow)
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree } from '../helpers/geometry';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';

const SLOTS = ['control-a', 'control-b', 'control-c', 'control-d'];
const EXPECTED = '커밋은 미리보기 상태에서 아무것도 더하지 않는다. 드래그하지 않은 패널의 카운터는 +0';
const PREDICTED = "`p-b`·`p-c` 누적 frame +1, content +1(hover 분만. 커밋 시점 추가 없음). 커밋된 트리 = 미리보기. `calls`에 `onMovePanel('p-d','p-a','left',1)` 1건. `dragendDropEffect 'move'`";

[1, 2].forEach((runNo) => {
  test(`R02-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'census' });
    await seedAll(page, SLOTS);
    const { snap: before } = await shot(page, info, '01-before');
    const t0 = Date.now();
    const d = await begin(page, 'control-d');
    await d.teleport(await dropPoint(page, 'p-a', 'left', 1));
    expect(await domTree(page)).toBe('H[p-d,p-a,V[p-b,p-c]]');
    const { snap: mid } = await shot(page, info, '02-mid');
    const r = await d.release();
    const { snap: after } = await shot(page, info, '03-after');
    const dm = deltas(before, mid);
    const da = deltas(before, after);
    const calls = after.calls.filter((c) => c.fn === 'onMovePanel').map((c) => JSON.stringify(c.args));
    const inv = await checkInvariants(page);
    const commitAdds = ['control-a', 'control-b', 'control-c'].some((s) => da[s].frame !== dm[s].frame || da[s].content !== dm[s].content || da[s].moves !== dm[s].moves);
    const ideal = ['control-a', 'control-b', 'control-c'].every((s) => da[s].frame === 0 && da[s].content === 0 && da[s].moves === 0);
    const pred = ['control-b', 'control-c'].every((s) => da[s].frame === 1 && da[s].content === 1) && !commitAdds
      && after.treeNotation === 'H[p-d,p-a,V[p-b,p-c]]' && calls.length === 1 && calls[0] === JSON.stringify(['p-d', 'p-a', 'left', 1]) && r.dragendDropEffect === 'move';
    await observe(page, info, {
      scenario: 'R02', caseName: 'R02-drop', runNo, expected: EXPECTED, predicted: PREDICTED,
      observed: `커밋 트리 ${after.treeNotation}, onMovePanel ${JSON.stringify(calls)}, sawDrop=${r.sawDrop}, dragendDropEffect=${r.dragendDropEffect}, under=${r.underCursorAtDrop}. 커밋 시점 추가 변화 ${commitAdds ? '있음' : '없음'}. ${invSummary(inv)}. 누적: ${fmtDeltas(da)}`,
      verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates', invariants: inv, since: t0, extra: { hover: dm, after: da },
    });
  });
});
