// R12 iframe 패널이 드롭 대상이 되는가 (마우스). 대조 사다리: b=control-iframe. 터치 사다리는 r12b-*.spec.ts
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { domTree, dropPoint, underCursor, treeNotation } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary, eventsSince } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { readFrameMfe } from '../helpers/frames';
import { promote } from '../helpers/evidence';
import { fmtEvents, dragEvents } from '../helpers/events';

const EXP = 'iframe 패널도 드롭 대상이다. hover에서 미리보기 `H[p-b,p-a,p-c]`, 놓으면 커밋';
const PRED: Record<string, string> = {
  telemetry: '`dragenter`/`dragover`가 `:4304` 프레임에 찍히고 top 프레임의 `p-b` 대상 `dragover`는 없다. `seen.dragover` 증가. `domTree` 불변(미리보기 없음). `underCursorAtDrop \'iframe\'`, `sawDrop false`, `dragend`만. 트리 불변. I1~I7 통과',
  'telemetry-x': '같다. 이벤트가 어느 프레임 프로브에 찍히는지는 S9 결과에 따름(하네스 충실도 단서)',
  shield: '`pointer-events: none`으로 `dragover`가 `p-b`/`p-c`에 닿아 미리보기 `H[p-b,p-a,p-c]`, `overShadow`로 커밋. `calls` 1건',
};
const FIDELITY = 'cross-origin iframe 위 CDP 마우스 드래그 이벤트 미전달(S9, HARNESS 부작용 #7)';

type Case = { caseName: string; slots: Record<string, string>; shield: '0' | '1'; anchor: 'p-b' | 'p-c'; frameSlot: string; pred: string; exp: string; ladder?: boolean };
const SLOTS = { a: 'control-a', b: 'telemetry', c: 'telemetry-x' };
const CASES: Case[] = [
  { caseName: 'R12-telemetry', slots: SLOTS, shield: '0', anchor: 'p-b', frameSlot: 'telemetry', pred: 'telemetry', exp: EXP },
  { caseName: 'R12-telemetry-x', slots: SLOTS, shield: '0', anchor: 'p-c', frameSlot: 'telemetry-x', pred: 'telemetry-x', exp: '같다' },
  { caseName: 'R12-shield-p-b', slots: SLOTS, shield: '1', anchor: 'p-b', frameSlot: 'telemetry', pred: 'shield', exp: '(shield는 우회책이다. 기대는 shield 없이도 위와 같아야 한다는 것)' },
  { caseName: 'R12-shield-p-c', slots: SLOTS, shield: '1', anchor: 'p-c', frameSlot: 'telemetry-x', pred: 'shield', exp: '(shield는 우회책이다. 기대는 shield 없이도 위와 같아야 한다는 것)' },
  { caseName: 'R12-ladder-control-iframe', slots: { ...SLOTS, b: 'control-iframe' }, shield: '0', anchor: 'p-b', frameSlot: 'control-iframe', pred: 'telemetry', exp: `(대조 사다리 b=control-iframe) ${EXP}`, ladder: true },
];

CASES.forEach((c) => {
  [1, 2].forEach((runNo) => {
    test(`${c.caseName}-run${runNo}`, async ({ lab, page }, info) => {
      await lab.open({ layout: 'row3', slots: c.slots, flags: { iframeShield: c.shield } });
      expect(await domTree(page)).toBe('H[p-a,p-b,p-c]');                                  // 전제
      await seedAll(page, Object.values(c.slots));
      const { snap: before } = await shot(page, info, '01-before');
      const innerBefore = await readFrameMfe(page, c.frameSlot);
      const t0 = Date.now();
      const a = await begin(page, 'control-a');
      const pos = c.anchor === 'p-b' ? 'right' : 'left';
      const pt = await dropPoint(page, c.anchor, pos, 0);
      const u = await underCursor(page, pt.x, pt.y);
      expect(u.panelId).toBe(c.anchor);                                                     // 전제
      await a.teleport(pt);
      await settle(page);
      const { snap: mid } = await shot(page, info, '02-mid');
      const hoverTree = mid.dom.domTree;
      const innerMid = await readFrameMfe(page, c.frameSlot);
      let res;
      if (c.shield === '1') {
        res = await a.release({ mode: 'overShadow' });
      } else {
        await a.nudge();
        res = await a.release({ mode: 'settled' });
      }
      const { snap: after } = await shot(page, info, '03-after');
      const inv = await checkInvariants(page);
      const innerAfter = await readFrameMfe(page, c.frameSlot);
      const drags = dragEvents(await eventsSince(page, t0));
      const frames = [...new Set(drags.filter((e) => e.type === 'dragover' || e.type === 'dragenter').map((e) => (e.top ? 'top' : new URL(e.frame).host)))];
      const topOverAnchor = drags.filter((e) => e.top && e.type === 'dragover' && e.target.panelId === c.anchor).length;
      const moveCalls = after.calls.filter((x) => x.fn === 'onMovePanel');
      const committed = treeNotation(after.tree as Parameters<typeof treeNotation>[0]);
      const treeSame = JSON.stringify(after.tree) === JSON.stringify(before.tree);
      const dd = deltas(before, after);
      const target = c.anchor === 'p-b' ? 'H[p-b,p-a,p-c]' : 'H[p-b,p-a,p-c]';
      const ideal = hoverTree === target && moveCalls.length === 1 && committed === target && inv.every((r) => r.pass);
      const pred = c.shield === '1'
        ? hoverTree === target && moveCalls.length === 1
        : hoverTree === 'H[p-a,p-b,p-c]' && topOverAnchor === 0 && res.underCursorAtDrop === 'iframe' && !res.sawDrop && treeSame && inv.every((r) => r.pass);
      const crossOrigin = c.frameSlot.startsWith('telemetry');
      await observe(page, info, {
        scenario: 'R12', caseName: c.caseName, runNo, expected: c.exp, predicted: c.ladder ? `(대조 사다리 control-iframe) ${PRED.telemetry}` : PRED[c.pred],
        observed: `hover domTree ${hoverTree}; dragenter/dragover 프레임 [${frames.join(',')}], top 프레임 ${c.anchor} 대상 dragover ${topOverAnchor}건; `
          + `${c.frameSlot} seen ${JSON.stringify(innerBefore?.seen)} → hover ${JSON.stringify(innerMid?.seen)} → 후 ${JSON.stringify(innerAfter?.seen)}, loads ${innerBefore?.loads}→${innerAfter?.loads}; `
          + `under=${res.underCursorAtDrop}, sawDrop=${res.sawDrop}, dragendDropEffect=${res.dragendDropEffect}; onMovePanel ${moveCalls.length}건 ${moveCalls.map((m) => JSON.stringify(m.args)).join(' ')}; 커밋된 트리 ${committed}; ${invSummary(inv)}. 누적: ${fmtDeltas(dd)}`,
        verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates',
        invariants: inv, since: t0,
        labels: crossOrigin && c.shield === '0' ? { harness_fidelity: FIDELITY } : {},
        extra: { events: fmtEvents(drags), deltas: dd, innerBefore, innerMid, innerAfter },
      });
      if (runNo === 1 && c.caseName === 'R12-telemetry') {
        const caseDir = new URL(`../.artifacts/r12-iframe-drop-target/${info.title}/`, import.meta.url).pathname;
        await promote({ run: 'run01-tier1', findingId: 'FC-QA-005', caseDir, images: ['02-mid.png', '03-after.png'] });
      }
    });
  });
});
