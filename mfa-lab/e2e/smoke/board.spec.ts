// B1-07 게이트: mfe-board (두 번째 MF remote, 자체 HTML5 DnD 칸반). 첫 케이스는 twin(board-local).
import { test, expect } from '../helpers/fixtures';
import { settle } from '../helpers/settle';

type Mfe = Record<string, { kind?: string; mounts?: number; unmounts?: number; reactSame?: boolean | null; build?: string; dnd?: unknown }>;

test('smoke board: twin board-local renders in the host tree', async ({ lab, page }) => {
  await lab.open({ layout: 'census', slots: { b: 'board-local' } });
  await settle(page);
  const s = await page.evaluate(() => {
    const w = window as unknown as { __mfe: Mfe; __fc: { build: string } };
    return { probe: w.__mfe['board-local'], build: w.__fc.build };
  });
  expect(s.probe).toMatchObject({ kind: 'local', mounts: 1, unmounts: 0, reactSame: true, build: s.build });
  expect(s.probe.dnd).toBeTruthy();
  await expect(page.locator('[data-tree-root] [data-testid="board-local-card-c1"]')).toBeVisible();
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});

// ---- federation ----
import { blockRemote } from '../helpers/faults';

const ORDERS = 'http://127.0.0.1:4301';
const BOARD = 'http://127.0.0.1:4302';

test('smoke board: board and orders remotes share one React', async ({ lab, page }) => {
  await lab.open({ layout: 'census', slots: { a: 'orders', b: 'board' } });
  await settle(page);
  const s = await page.evaluate(() => {
    const w = window as unknown as { __mfe: Mfe; __fc: { build: string; frames: Record<string, { kind: string; state: string }> } };
    return { board: w.__mfe.board, orders: w.__mfe.orders, build: w.__fc.build, frame: w.__fc.frames.board };
  });
  expect(s.board).toMatchObject({ kind: 'same-tree', mounts: 1, unmounts: 0, reactSame: true });
  expect(s.board.dnd).toBeTruthy();
  expect(s.board.build).not.toBe(s.build);
  expect(s.orders).toMatchObject({ kind: 'same-tree', mounts: 1, reactSame: true });   // 두 remote가 한 React
  expect(s.frame).toMatchObject({ kind: 'same-tree', state: 'ready' });
  await expect(page.locator('[data-tree-root] [data-testid="board-card-c1"]')).toBeVisible();
  expect(lab.requests.some((r) => r.url === `${BOARD}/mf-manifest.json`)).toBe(true);
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});

test('smoke board: standalone page', async ({ lab, page }) => {
  await lab.openStandalone('board');
  await expect(page.locator('[data-testid="board-card-c1"]')).toBeVisible();
  const reactSame = await page.evaluate(() => (window as unknown as { __mfe: Mfe }).__mfe.board.reactSame);
  expect(reactSame).toBeNull();
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});

const READY_ALL = { nav: 'ready', orders: 'ready', board: 'ready', billing: 'ready', telemetry: 'ready', 'telemetry-x': 'ready' };
const frameStates = (page: import('@playwright/test').Page) => page.evaluate(() =>
  Object.fromEntries(Object.entries((window as unknown as { __fc: { frames: Record<string, { state: string }> } }).__fc.frames).map(([k, v]) => [k, v.state])));

[
  { blocked: 'board', origin: BOARD },
  { blocked: 'orders', origin: ORDERS },
].forEach(({ blocked, origin }) => {
  test(`smoke board: fault isolation, ${blocked} origin blocked in workbench`, async ({ lab, page }) => {
    await blockRemote(page, origin);
    await lab.open({ layout: 'workbench', expectState: { [blocked]: 'error' } });
    await settle(page);
    await expect(page.locator(`[data-tree-root] [data-testid="error-${blocked}"]`)).toBeVisible();
    await expect(page.locator('[data-tree-root] [data-testid^="error-"]')).toHaveCount(1);
    expect(await frameStates(page)).toEqual({ ...READY_ALL, [blocked]: 'error' });
    const unexpected = lab.consoleErrors().filter((c) => !/Failed to load resource|RUNTIME-|mf-manifest/.test(c.text));
    expect(unexpected).toEqual([]);
  });
});
