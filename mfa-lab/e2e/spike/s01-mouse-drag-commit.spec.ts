// S1 (B1-03a 게이트): 실제 마우스 드래그. census bare에서 p-d → (p-a, left, depth 1), hover, overShadow 릴리스.
// 통과 조건: doc/qa/mfa/BRIEF-1-build.md 「스파이크 표」 S1
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree, treeNotation } from '../helpers/geometry';
import { readProbe } from '../helpers/probe.init';
import { settle } from '../helpers/settle';
import { writeBaseline } from '../helpers/baseline';
import { expectInvariants } from '../helpers/invariants';

const DRAG_TYPES = new Set(['dragstart', 'dragenter', 'dragover', 'dragleave', 'drop', 'dragend']);

test('S1 mouse drag commits p-d to (p-a, left, 1)', async ({ lab, page }) => {
  await lab.open({ layout: 'census', slots: { a: 'bare-0', b: 'bare-1', c: 'bare-2', d: 'bare-3' } });
  await settle(page);
  const t0 = Date.now();

  const drag = await begin(page, 'bare-3');
  expect(drag.sourceId).toBe('p-d');
  const target = await dropPoint(page, 'p-a', 'left', 1);
  const hover = await drag.teleport(target);
  expect(hover.settle?.stable).toBe(true);
  expect(hover.dom.domTree).toBe('H[p-d,p-a,V[p-b,p-c]]');
  expect(hover.dom.panels['p-d'].shadow).toBe(true);
  expect(hover.dom.draggingPanelId).toBe('p-d');

  const res = await drag.release({ mode: 'overShadow' });
  expect(res.underCursorAtDrop).toBe('source');
  expect(res.sawDrop).toBe(true);
  expect(res.dragendDropEffect).toBe('move');

  const after = res.snapshot;
  const moves = after.calls.filter((c) => c.fn === 'onMovePanel');
  expect(moves).toHaveLength(1);
  expect(moves[0].args).toEqual(['p-d', 'p-a', 'left', 1]);
  expect(after.treeNotation).toBe('H[p-d,p-a,V[p-b,p-c]]');       // 커밋된 트리 = 미리보기
  expect(await domTree(page)).toBe(treeNotation(after.tree as Parameters<typeof treeNotation>[0]));

  // 이벤트 순서: trusted dragstart → dragenter → dragover → drop → dragend
  const events = (await readProbe(page, { since: t0 })).events;
  const drags = events.filter((e) => DRAG_TYPES.has(e.type));
  drags.forEach((e) => expect(e.isTrusted, `${e.type} ${e.phase} trusted`).toBe(true));
  const firstIdx = (type: string) => drags.findIndex((e) => e.type === type);
  const order = ['dragstart', 'dragenter', 'dragover', 'drop', 'dragend'].map(firstIdx);
  order.forEach((i) => expect(i).toBeGreaterThanOrEqual(0));
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  const dragend = drags.filter((e) => e.type === 'dragend');
  expect(dragend.some((e) => e.dropEffect === 'move')).toBe(true);

  await expectInvariants(page);   // B1-03b부터 I1~I7

  const file = writeBaseline('s01', events);
  test.info().annotations.push({ type: 'baseline', description: file });
  console.log(`[S1] drag events: ${drags.map((e) => `${e.type}/${e.phase}/${e.target.panelId}${e.count ? `x${e.count}` : ''}${e.phase === 'target' ? `(connected=${e.isConnected})` : ''}`).join(' ')}`);
  console.log(`[S1] domLog: ${JSON.stringify(after.counters.domLog)}`);
});
