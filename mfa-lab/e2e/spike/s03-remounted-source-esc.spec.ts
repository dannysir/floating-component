// S3 (B1-03b 게이트): 미리보기가 소스를 다른 split으로 옮긴 뒤 Esc.
// ?layout=locks에서 terminal → (editor, left, depth 0) → Esc.
// FC-QA-001 수정(daee5a0) 전에는 미리보기가 소스를 리마운트해 dragend가 분리된 원본에만(isConnected: false) 왔다.
// 수정 뒤에는 패널이 골격 위에 평평하게 렌더돼 소스가 리마운트되지 않고, dragend가 연결된 소스에서 window까지 버블링된다.
// 분리된 원본으로 가는 dragend를 하네스가 보는지는 S5(npm 0.5.1)가 계속 확인한다.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint } from '../helpers/geometry';
import { readProbe } from '../helpers/probe.init';
import { settle } from '../helpers/settle';
import { snapshot } from '../helpers/snapshot';
import { writeBaseline } from '../helpers/baseline';
import { expectInvariants } from '../helpers/invariants';
import { dragEvents, fmtEvents } from '../helpers/events';

test('S3 Esc after preview moved the source into another split', async ({ lab, page }) => {
  await lab.open({ layout: 'locks' });
  await settle(page);
  const before = await snapshot(page, 'before');
  const t0 = Date.now();

  const drag = await begin(page, 'control-b');
  expect(drag.sourceId).toBe('terminal');
  const hover = await drag.teleport(await dropPoint(page, 'editor', 'left', 0));
  expect(hover.dom.domTree).toBe('H[nav,terminal,editor,output]');
  expect(hover.dom.panels.terminal.shadow).toBe(true);
  const remounted = hover.counters.domLog.some((l) => (l as { panelId: string; kind: string }).panelId === 'terminal' && (l as { kind: string }).kind === 'remounted');
  expect(remounted, 'preview must not remount the source panel').toBe(false);

  const res = await drag.cancelEsc();
  expect(res.sawDrop).toBe(false);

  const events = (await readProbe(page, { since: t0 })).events;
  const ends = events.filter((e) => e.type === 'dragend');
  expect(ends.some((e) => e.phase === 'target' && e.isConnected === true && e.isTrusted), `dragend on connected source: ${fmtEvents(ends)}`).toBe(true);

  const after = res.snapshot;
  expect(after.calls.filter((c) => c.fn === 'onMovePanel')).toHaveLength(0);
  expect(after.tree).toEqual(before.tree);
  await expectInvariants(page);

  writeBaseline('s03', events);
  console.log(`[S3] ${fmtEvents(dragEvents(events))}`);
});
