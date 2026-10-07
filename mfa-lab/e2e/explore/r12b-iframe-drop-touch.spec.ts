// R12 사다리 3단계(입력 교체): touch 프로젝트에서 같은 동작. 예측: 터치는 iframe 패널을 대상으로 잡아 커밋.
import { test, expect } from '../helpers/fixtures';
import { handleDrag } from '../helpers/touch';
import { domTree, dropPoint, treeNotation } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary, baseLabels } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { promote } from '../helpers/evidence';
import { fmtEvents } from '../helpers/events';

test.beforeEach(({}, testInfo) => {
  if (testInfo.project.name !== 'touch') test.skip(true, 'R12 touch ladder runs only in the touch project');
});

const EXP = '마우스와 같다';
const PRED = '터치는 `document.elementFromPoint` → `<iframe>` → `closest(\'[data-panel-id]\')`로 `p-b`를 잡아 **커밋된다**. 마우스와 결과가 갈린다';
const SLOTS = { a: 'control-a', b: 'telemetry', c: 'telemetry-x' };
const CASES = [
  { caseName: 'R12-touch-telemetry', slots: SLOTS, anchor: 'p-b' as const },
  { caseName: 'R12-touch-telemetry-x', slots: SLOTS, anchor: 'p-c' as const },
  { caseName: 'R12-touch-control-iframe', slots: { ...SLOTS, b: 'control-iframe' }, anchor: 'p-b' as const },
];

CASES.forEach((c) => {
  [1, 2].forEach((runNo) => {
    test(`${c.caseName}-run${runNo}`, async ({ lab, page }, info) => {
      await lab.open({ layout: 'row3', slots: c.slots, flags: { iframeShield: '0' } });
      expect(await domTree(page)).toBe('H[p-a,p-b,p-c]');                                  // 전제
      await seedAll(page, Object.values(c.slots));
      const { snap: before } = await shot(page, info, '01-before');
      const t0 = Date.now();
      const pt = await dropPoint(page, c.anchor, c.anchor === 'p-b' ? 'right' : 'left', 0);
      const res = await handleDrag(page, 'control-a', [pt], 'end');
      await settle(page);
      const { snap: after } = await shot(page, info, '03-after');
      const inv = await checkInvariants(page);
      const committed = treeNotation(after.tree as Parameters<typeof treeNotation>[0]);
      const moveCalls = after.calls.filter((x) => x.fn === 'onMovePanel');
      const dd = deltas(before, after);
      const ok = committed === 'H[p-b,p-a,p-c]' && moveCalls.length === 1;
      await observe(page, info, {
        scenario: 'R12', caseName: c.caseName, runNo, expected: EXP, predicted: PRED,
        observed: `touch started=${res.started}, ghosts ${JSON.stringify(res.ghostsDuring)}, ghostsAfter ${res.ghostsAfter}, under=${res.underCursorAtDrop}, touchTrusted=${res.touchTrusted}; `
          + `onMovePanel ${moveCalls.length}건 ${moveCalls.map((m) => JSON.stringify(m.args)).join(' ')}; 커밋된 트리 ${committed}; ${invSummary(inv)}. 누적: ${fmtDeltas(dd)}`,
        verdict: ok && inv.every((r) => r.pass) ? 'as-predicted' : 'deviates',
        invariants: inv, since: t0,
        labels: { ...baseLabels('touch-cdp-handle') },
        extra: { events: fmtEvents(res.events.filter((e) => e.type.startsWith('touch'))), deltas: dd },
      });
      if (runNo === 1 && c.caseName === 'R12-touch-telemetry') {
        const caseDir = new URL(`../.artifacts/r12b-iframe-drop-touch/${info.title}/`, import.meta.url).pathname;
        await promote({ run: 'run01-tier1', findingId: 'FC-QA-005', caseDir, images: ['03-after.png'], prefix: 'R12t-' });
      }
    });
  });
});
