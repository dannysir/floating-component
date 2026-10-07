// R18 #13 재현: 다른 패널 헤더 위에서 미리보기가 생긴 뒤 그 점에서 놓기. 깨끗한 컨텍스트 2회 × (nudge 없음 / nudge 4회).
// nudge 없음: 미리보기 리플로로 대상 요소가 바뀌어 release의 dragover가 미뤄지고 drop 없이 취소(HARNESS 부작용 #17 계열).
// nudge 4회(멈춘 커서의 주기적 dragover 흉내, 부작용 #2 emulated): release가 other-droppable에 떨어져 stale preview 시그니처 → FC-QA-009.
import { test } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { domTree, dropPoint, handlePoint } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { capture, promote } from '../helpers/evidence';
import { eventsSince } from '../helpers/explore';
import { dragEvents, fmtEvents } from '../helpers/events';
import { checkInvariants } from '../helpers/invariants';
import { snapshot } from '../helpers/snapshot';

[1, 2].forEach((runNo) => {
  (['nonudge', 'nudge'] as const).forEach((mode) => {
    test(`r18-x01-${mode}-run${runNo}`, async ({ lab, page }, info) => {
      await lab.open({ layout: 'workbench' });
      const s = await begin(page, 'orders');
      await s.teleport(await dropPoint(page, 'billing', 'top', 0)); await s.release(); await settle(page);   // 준비: orders → billing 위
      const tree0 = await domTree(page);
      const pt = await handlePoint(page, 'telemetry');
      const t0 = Date.now();
      const d = await begin(page, 'board');
      await d.teleport(pt);
      const seq: string[] = [await domTree(page)];
      if (mode === 'nudge') for (let k = 0; k < 4; k++) { await d.nudge(); seq.push(await domTree(page)); }
      await capture(page, info, '02-mid');
      const res = await d.release({ mode: 'settled' });
      await settle(page);
      await capture(page, info, '03-after');
      const ev = dragEvents(await eventsSince(page, t0));
      const inv = await checkInvariants(page);
      const snap = await snapshot(page, 'after');
      const lastOver = [...ev].reverse().find((e) => e.type === 'dragover');
      const drop = ev.find((e) => e.type === 'drop');
      const end = ev.find((e) => e.type === 'dragend');
      const gap = lastOver && (drop ?? end) ? Math.round(((drop ?? end)!.t - (lastOver.tLast ?? lastOver.t)) * 10) / 10 : null;
      console.log(`[x01 ${mode} run${runNo}] tree0 ${tree0}; hover 순서 [${seq.join(' → ')}]; under=${res.underCursorAtDrop} drop=${res.sawDrop} dropEffect=${res.dragendDropEffect}; `
        + `마지막 dragover(${lastOver?.target.panelId}) → ${drop ? 'drop' : 'dragend'} ${gap}ms; DOM ${await domTree(page)} / tree ${snap.treeNotation}; shadow board=${snap.dom.panels.board?.shadow}; `
        + `onMovePanel ${snap.calls.filter((c) => c.fn === 'onMovePanel').length}건(준비 1 포함); inv ${inv.filter((r) => !r.pass).map((r) => `${r.id}(${r.detail})`).join(',') || 'pass'}; events ${fmtEvents(ev.slice(-8))}`);
      if (runNo === 1 && mode === 'nudge') {
        const caseDir = new URL(`../.artifacts/r18-x01-header-release-after-root-preview/${info.title}/`, import.meta.url).pathname;
        await promote({ run: 'run01-tier1', findingId: 'FC-QA-009', caseDir, images: ['02-mid.png', '03-after.png'] });
      }
    });
  });
});
