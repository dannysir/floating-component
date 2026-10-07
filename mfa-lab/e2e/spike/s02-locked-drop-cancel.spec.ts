// S2 (B1-03b 게이트): 잠긴 패널에 놓기, 소스 리마운트 없음.
// ?layout=locks에서 editor → dropPoint(output, right, 3) → 미리보기 H[nav,V[terminal,output],editor] → handlePoint('nav')로 teleport → release settled
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, handlePoint } from '../helpers/geometry';
import { readProbe } from '../helpers/probe.init';
import { settle } from '../helpers/settle';
import { snapshot } from '../helpers/snapshot';
import { writeBaseline } from '../helpers/baseline';
import { expectInvariants } from '../helpers/invariants';
import { dragEvents, fmtEvents } from '../helpers/events';

test('S2 release over locked nav cancels without drop', async ({ lab, page }) => {
  await lab.open({ layout: 'locks' });
  await settle(page);
  const before = await snapshot(page, 'before');
  const t0 = Date.now();

  const drag = await begin(page, 'control-a');
  expect(drag.sourceId).toBe('editor');
  const hover = await drag.teleport(await dropPoint(page, 'output', 'right', 3));
  expect(hover.dom.domTree).toBe('H[nav,V[terminal,output],editor]');
  expect(hover.dom.panels.editor.shadow).toBe(true);

  const tRel = Date.now();
  const overNav = await drag.teleport(await handlePoint(page, 'nav'));
  expect(overNav.dom.domTree).toBe('H[nav,V[terminal,output],editor]');   // 잠긴 패널 위 dragover는 직전 미리보기를 유지한다
  const res = await drag.release({ mode: 'settled' });
  expect(res.underCursorAtDrop).toBe('locked');
  expect(res.sawDrop).toBe(false);
  expect(res.dragendDropEffect).toBe('none');

  const relEvents = dragEvents((await readProbe(page, { since: tRel })).events);
  expect(relEvents.some((e) => e.type === 'dragleave')).toBe(true);
  expect(relEvents.some((e) => e.type === 'dragend')).toBe(true);
  expect(relEvents.some((e) => e.type === 'drop')).toBe(false);

  const after = res.snapshot;
  expect(after.calls.filter((c) => c.fn === 'onMovePanel')).toHaveLength(0);
  expect(after.tree).toEqual(before.tree);
  expect(after.treeVersion).toBe(before.treeVersion);
  await expectInvariants(page);

  const events = (await readProbe(page, { since: t0 })).events;
  dragEvents(events).forEach((e) => expect(e.isTrusted).toBe(true));
  writeBaseline('s02', events);
  console.log(`[S2] ${fmtEvents(dragEvents(events))}`);
});
