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
