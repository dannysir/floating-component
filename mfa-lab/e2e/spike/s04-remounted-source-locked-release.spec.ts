// S4 (B1-03b 게이트): S3과 같되 Esc 대신 잠긴 nav 위에서 릴리스.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, handlePoint } from '../helpers/geometry';
import { readProbe } from '../helpers/probe.init';
import { settle } from '../helpers/settle';
import { snapshot } from '../helpers/snapshot';
import { writeBaseline } from '../helpers/baseline';
import { expectInvariants } from '../helpers/invariants';
import { dragEvents, fmtEvents } from '../helpers/events';

test('S4 release over locked nav after preview remounted the source', async ({ lab, page }) => {
  await lab.open({ layout: 'locks' });
  await settle(page);
  const before = await snapshot(page, 'before');
  const t0 = Date.now();

  const drag = await begin(page, 'control-b');
  const hover = await drag.teleport(await dropPoint(page, 'editor', 'left', 0));
  expect(hover.dom.domTree).toBe('H[nav,terminal,editor,output]');

  await drag.teleport(await handlePoint(page, 'nav'));
  const res = await drag.release({ mode: 'settled' });
  expect(res.underCursorAtDrop).toBe('locked');
  expect(res.sawDrop).toBe(false);

  const after = res.snapshot;
  expect(after.calls.filter((c) => c.fn === 'onMovePanel')).toHaveLength(0);
  expect(after.tree).toEqual(before.tree);
  await expectInvariants(page);

  const events = (await readProbe(page, { since: t0 })).events;
  writeBaseline('s04', events);
  console.log(`[S4] ${fmtEvents(dragEvents(events))}`);
});
