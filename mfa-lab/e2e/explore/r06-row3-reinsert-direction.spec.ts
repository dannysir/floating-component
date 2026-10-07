// R06 row3, B = telemetry — 재삽입의 방향(어느 패널이 언제 재삽입·재로드되는가). 구간별 증가분: hover / Esc / 다시 hover / 드롭.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree, treeNotation } from '../helpers/geometry';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary } from '../helpers/explore';
import type { SlotDelta } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';

const EXP = '재로드 없음, 상태 유지';
const PRED = {
  a: '리마운트 없음. hover(`H[p-c,p-a,p-b]`): `p-a`·`p-b` moves +1(telemetry at B: `loads` +1), `p-c` 그대로. Esc: `p-c`(소스)만 moves +1. 드롭: hover 이후 추가 없음',
  b: 'hover(`H[p-b,p-c,p-a]`): `p-a`(소스)만 moves +1. Esc: `p-b`·`p-c` moves +1(telemetry `loads`가 **취소 때** +1). 드롭: 추가 없음',
};
const CASES = [
  { name: 'R06-a', b: 'telemetry', src: 'control-c', anchor: 'p-a', pos: 'left', tree: 'H[p-c,p-a,p-b]', call: ['p-c', 'p-a', 'left', 1], pred: PRED.a },
  { name: 'R06-b', b: 'telemetry', src: 'control-a', anchor: 'p-c', pos: 'right', tree: 'H[p-b,p-c,p-a]', call: ['p-a', 'p-c', 'right', 1], pred: PRED.b },
] as const;
const short = (ds: Record<string, SlotDelta>) => Object.values(ds).map((x) => `${x.panelId}:f+${x.frame} c+${x.content} m+${x.moves}${x.loads !== null ? ` l+${x.loads}` : ''}`).join(' ');
const nz = (ds: Record<string, SlotDelta>) => Object.fromEntries(Object.values(ds).map((x) => [x.panelId, { f: x.frame, c: x.content, m: x.moves, l: x.loads ?? 0 }]));

CASES.forEach((c) => {
  [1, 2].forEach((runNo) => {
    test(`${c.name}-run${runNo}`, async ({ lab, page }, info) => {
      await lab.open({ layout: 'row3', slots: { b: c.b } });
      expect(await domTree(page)).toBe('H[p-a,p-b,p-c]');                                 // 전제
      await seedAll(page, ['control-a', c.b, 'control-c']);
      const { snap: s1 } = await shot(page, info, '01-before');
      const t0 = Date.now();
      const d = await begin(page, c.src);
      await d.teleport(await dropPoint(page, c.anchor, c.pos, 1));
      expect(await domTree(page)).toBe(c.tree);                                            // 전제
      const { snap: s2 } = await shot(page, info, '02-mid');
      await d.cancelEsc();
      const { snap: s3 } = await shot(page, info, '03-after');
      const inv1 = await checkInvariants(page);
      const d2 = await begin(page, c.src);
      await d2.teleport(await dropPoint(page, c.anchor, c.pos, 1));
      expect(await domTree(page)).toBe(c.tree);                                            // 전제
      const { snap: s4 } = await shot(page, info, '04-mid-drop');
      await d2.release();
      const { snap: s5 } = await shot(page, info, '05-after-drop');
      const inv2 = await checkInvariants(page);
      const seg = [deltas(s1, s2), deltas(s2, s3), deltas(s3, s4), deltas(s4, s5)];
      const n = seg.map(nz);
      const calls = s5.calls.filter((x) => x.fn === 'onMovePanel');
      const committed = treeNotation(s5.tree as Parameters<typeof treeNotation>[0]);
      const noRemount = seg.every((sg) => Object.values(sg).every((x) => x.frame === 0 && x.content === 0));
      const ideal = noRemount && seg.every((sg) => Object.values(sg).filter((x) => x.slot !== c.src).every((x) => x.moves === 0 && (x.loads ?? 0) === 0));
      const pred = c.name === 'R06-a'
        ? noRemount && n[0]['p-a'].m === 1 && n[0]['p-b'].m === 1 && n[0]['p-b'].l === 1 && n[0]['p-c'].m === 0 && n[1]['p-c'].m === 1 && n[1]['p-a'].m === 0 && n[1]['p-b'].m === 0 && Object.values(n[3]).every((x) => x.m === 0 && x.l === 0)
        : noRemount && n[0]['p-a'].m === 1 && n[0]['p-b'].m === 0 && n[0]['p-c'].m === 0 && n[1]['p-b'].m === 1 && n[1]['p-c'].m === 1 && n[1]['p-b'].l === 1 && Object.values(n[3]).every((x) => x.m === 0 && x.l === 0);
      await observe(page, info, {
        scenario: 'R06', caseName: c.name, runNo, expected: EXP, predicted: c.pred,
        observed: `hover[${short(seg[0])}] Esc[${short(seg[1])}] 재hover[${short(seg[2])}] 드롭[${short(seg[3])}]; 커밋 ${committed}, onMovePanel ${calls.length}건 ${calls.map((x) => JSON.stringify(x.args)).join(' ')}; Esc 뒤 ${invSummary(inv1)}, 드롭 뒤 ${invSummary(inv2)}. 누적: ${fmtDeltas(deltas(s1, s5))}`,
        verdict: ideal ? 'as-ideal' : pred && committed === c.tree ? 'as-predicted' : 'deviates', invariants: inv2, since: t0,
        extra: { segments: n },
      });
    });
  });
});
