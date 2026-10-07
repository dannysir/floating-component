// B1-07 게이트: workbench 제품 화면. 제품 슬롯 6개 ready, Nav 토글로 board 닫기·다시 열기.
import { test, expect } from '../helpers/fixtures';
import { settle } from '../helpers/settle';
import { domTree } from '../helpers/geometry';

type Tree = { type: string; id?: string; size: number; children?: Tree[] };
const PRODUCT = ['nav', 'orders', 'board', 'billing', 'telemetry', 'telemetry-x'];

test('smoke workbench: all product slots ready, nav toggles board', async ({ lab, page }) => {
  const opened = await lab.open({ layout: 'workbench' });
  expect(opened.skipped).toEqual([]);
  await settle(page);
  const states = await page.evaluate(() => Object.fromEntries(Object.entries((window as unknown as { __fc: { frames: Record<string, { state: string }> } }).__fc.frames).map(([k, v]) => [k, v.state])));
  PRODUCT.forEach((slot) => expect(states[slot], slot).toBe('ready'));
  expect(await domTree(page)).toBe('H[nav,orders,V[H[board,billing],H[telemetry,telemetry-x]]]');
  const treeBefore = await page.evaluate(() => (window as unknown as { __fc: { getTree: () => Tree } }).__fc.getTree());

  const toggle = page.locator('[data-tree-root] [data-testid="nav-toggle-board"]');
  await toggle.click();
  await settle(page);
  const afterClose = await page.evaluate(() => (window as unknown as { __fc: { getTree: () => Tree } }).__fc.getTree());
  const ids = (t: Tree): string[] => (t.type === 'panel' ? [t.id ?? ''] : (t.children ?? []).flatMap(ids));
  expect(ids(afterClose)).not.toContain('board');
  expect(await domTree(page)).not.toContain('board');

  await toggle.click();
  await settle(page);
  const afterOpen = await page.evaluate(() => (window as unknown as { __fc: { getTree: () => Tree } }).__fc.getTree());
  expect(ids(afterOpen)).toContain('board');
  expect(await domTree(page)).toBe('H[nav,orders,V[H[board,billing],H[telemetry,telemetry-x]]]');   // size는 비교하지 않는다

  // 토글 전후 size 차이는 기록만 한다 (SPIKE.md 8절)
  const sizes = (t: Tree, path = 'root'): string[] => [`${path}:${t.size}`, ...(t.children ?? []).flatMap((c, i) => sizes(c, `${path}.${c.type === 'panel' ? c.id : i}`))];
  console.log(`[workbench] sizes before: ${sizes(treeBefore).join(' ')}`);
  console.log(`[workbench] sizes after close: ${sizes(afterClose).join(' ')}`);
  console.log(`[workbench] sizes after reopen: ${sizes(afterOpen).join(' ')}`);
  const calls = await page.evaluate(() => (window as unknown as { __fc: { calls: Array<{ fn: string; args: unknown[] }> } }).__fc.calls.map((c) => `${c.fn}(${JSON.stringify(c.args)})`));
  console.log(`[workbench] calls: ${calls.join(' ')}`);
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});
