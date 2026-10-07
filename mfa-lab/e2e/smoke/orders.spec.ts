// B1-06 게이트: mfe-orders. 첫 케이스는 twin(orders-local), 이어서 federation 케이스 (a)~(c).
import { test, expect } from '../helpers/fixtures';
import { settle } from '../helpers/settle';

type Mfe = Record<string, { kind?: string; mounts?: number; unmounts?: number; reactSame?: boolean | null; build?: string }>;

test('smoke orders: twin orders-local renders in the host tree', async ({ lab, page }) => {
  await lab.open({ layout: 'census', slots: { b: 'orders-local' } });
  await settle(page);
  const s = await page.evaluate(() => {
    const w = window as unknown as { __mfe: Mfe; __fc: { build: string; frames: Record<string, { kind: string; state: string }> } };
    return { probe: w.__mfe['orders-local'], build: w.__fc.build, frame: w.__fc.frames['orders-local'] };
  });
  expect(s.probe).toMatchObject({ kind: 'local', mounts: 1, unmounts: 0, reactSame: true });
  expect(s.probe.build).toBe(s.build);                                  // twin은 shell이 번들하므로 스탬프가 shell과 같다
  expect(s.frame).toMatchObject({ kind: 'local', state: 'ready' });
  await expect(page.locator('[data-tree-root] [data-testid="orders-local-row-0"]')).toBeVisible();
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});
