// S3 (B1-03b 게이트): 미리보기가 소스를 리마운트한 뒤 Esc.
// ?layout=locks에서 terminal → (editor, left, depth 0) → Esc. 소스 노드에 직접 건 dragend가 isConnected: false로 찍혀야 한다.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint } from '../helpers/geometry';
import { readProbe } from '../helpers/probe.init';
import { settle } from '../helpers/settle';
import { snapshot } from '../helpers/snapshot';
import { writeBaseline } from '../helpers/baseline';
import { expectInvariants } from '../helpers/invariants';
import { dragEvents, fmtEvents } from '../helpers/events';

test('S3 Esc after preview remounted the source', async ({ lab, page }) => {
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
  expect(remounted, 'preview remounted the source panel').toBe(true);

  const res = await drag.cancelEsc();
  expect(res.sawDrop).toBe(false);

  const events = (await readProbe(page, { since: t0 })).events;
  const ends = events.filter((e) => e.type === 'dragend');
  expect(ends.some((e) => e.phase === 'target' && e.isConnected === false && e.isTrusted), `dragend on detached source: ${fmtEvents(ends)}`).toBe(true);

  const after = res.snapshot;
  expect(after.calls.filter((c) => c.fn === 'onMovePanel')).toHaveLength(0);
  expect(after.tree).toEqual(before.tree);
  await expectInvariants(page);

  writeBaseline('s03', events);
  console.log(`[S3] ${fmtEvents(dragEvents(events))}`);
});
