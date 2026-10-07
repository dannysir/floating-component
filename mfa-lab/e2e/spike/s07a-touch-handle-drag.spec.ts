// S7a (B1-03e 게이트, touch 프로젝트): 핸들 터치 드래그. 오라클: 핸들 모드는 롱프레스 없이 8px 넘게 움직이면 시작한다.
import { test, expect } from '../helpers/fixtures';
import { handleDrag } from '../helpers/touch';
import { dropPoint, handlePoint, panelRect } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { snapshot } from '../helpers/snapshot';
import { expectInvariants } from '../helpers/invariants';
import { fmtEvents } from '../helpers/events';

test.beforeEach(({}, testInfo) => {
  if (testInfo.project.name !== 'touch') test.skip(true, 'S7a runs only in the touch project');
});

test('S7a(1) pair: p-a handle drag commits to the right of p-b', async ({ lab, page }) => {
  await lab.open({ layout: 'pair' });
  await settle(page);
  const target = await dropPoint(page, 'p-b', 'right', 0);
  const res = await handleDrag(page, 'control-a', [target, { x: target.x + 2, y: target.y }], 'end');
  console.log(`[S7a-1] ghosts=${JSON.stringify(res.ghostsDuring)} after=${res.ghostsAfter} under=${res.underCursorAtDrop} moves=${res.onMovePanelCalls} trusted=${res.touchTrusted}`);
  console.log(`[S7a-1] ${fmtEvents(res.events.filter((e) => e.type.startsWith('touch')))}`);
  expect(res.touchTrusted).toBe(true);
  res.ghostsDuring.forEach((g) => expect(g.count).toBe(1));
  expect(res.ghostsAfter).toBe(0);
  expect(res.onMovePanelCalls).toBe(1);
  expect(res.snapshot.treeNotation).toBe('H[p-b,p-a]');
  await expectInvariants(page);
});

test('S7a(2) locks: editor over terminal then locked nav cancels; next drag still starts', async ({ lab, page }) => {
  await lab.open({ layout: 'locks' });
  await settle(page);
  const before = await snapshot(page, 'before');
  const term = await panelRect(page, 'terminal');
  const overTerminal = { x: term.x + term.width / 2, y: term.y + term.height / 2 };
  const nav = await handlePoint(page, 'nav');
  const navBody = { x: nav.x, y: nav.y + 80 };
  const res = await handleDrag(page, 'control-a', [overTerminal, navBody, { x: navBody.x + 2, y: navBody.y }], 'end');
  console.log(`[S7a-2] ghosts=${JSON.stringify(res.ghostsDuring)} after=${res.ghostsAfter} under=${res.underCursorAtDrop} moves=${res.onMovePanelCalls}`);
  expect(res.touchTrusted).toBe(true);
  res.ghostsDuring.forEach((g) => expect(g.count).toBe(1));
  const overNav = res.ghostsDuring[res.ghostsDuring.length - 1];
  expect(overNav.opacity).toBe('0.4');                                  // blocked ghost (useTouchDrag.ts:11-12)
  expect(overNav.outline).toContain('solid');
  expect(res.underCursorAtDrop).toBe('locked');
  expect(res.ghostsAfter).toBe(0);
  expect(res.onMovePanelCalls).toBe(0);
  expect(res.snapshot.tree).toEqual(before.tree);
  await expectInvariants(page);

  // 이어서 두 번째 드래그가 시작된다 (취소)
  const second = await handleDrag(page, 'control-b', [overTerminal], 'cancel');
  expect(second.started).toBe(true);
  expect(second.ghostsDuring[0].count).toBe(1);
  expect(second.ghostsAfter).toBe(0);
  await expectInvariants(page);
});
