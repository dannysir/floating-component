// B1-04 게이트: mount 어댑터와 mfe-billing (컨테이너 유형 mount).
import { test, expect } from '../helpers/fixtures';
import { settle } from '../helpers/settle';

type Mfe = Record<string, { kind?: string; mounts?: number; unmounts?: number; rootsAlive?: number; reactSame?: boolean | null; build?: string }>;
type Frames = Record<string, { kind: string; frameMounts: number; state: string; lateResolves?: number }>;

const read = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const w = window as unknown as { __mfe: Mfe; __fc: { frames: Frames; build: string; bus: { subscriberCount: (t: string) => number } } };
  return { mfe: w.__mfe, frames: w.__fc.frames, build: w.__fc.build, subs: w.__fc.bus.subscriberCount('order:selected') };
});

test('smoke billing: control-mount alone (no billing server needed)', async ({ lab, page }) => {
  await lab.open({ layout: 'census', slots: { a: 'control-mount' } });
  await settle(page);
  const s = await read(page);
  expect(s.mfe['control-mount']).toMatchObject({ kind: 'mount', mounts: 1, unmounts: 0, rootsAlive: 1, reactSame: true });
  expect(s.frames['control-mount']).toMatchObject({ kind: 'mount', frameMounts: 1, state: 'ready' });
  expect(s.frames['control-mount'].lateResolves ?? 0).toBe(0);
  await expect(page.locator('[data-tree-root] [data-testid="control-mount-input"]')).toBeVisible();
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});

test('smoke billing: billing remote, control-mount, billing-local together', async ({ lab, page }) => {
  await lab.open({ layout: 'census', slots: { a: 'billing', b: 'control-mount', c: 'billing-local' } });
  await settle(page);
  const s = await read(page);
  expect(s.mfe.billing).toMatchObject({ kind: 'mount', mounts: 1, unmounts: 0, rootsAlive: 1, reactSame: false });
  expect(s.frames.billing).toMatchObject({ kind: 'mount', frameMounts: 1, state: 'ready' });
  expect(s.frames.billing.lateResolves ?? 0).toBe(0);
  expect(s.mfe.billing.build).not.toBe(s.build);                       // remote 번들의 스탬프
  expect(s.mfe['control-mount']).toMatchObject({ kind: 'mount', mounts: 1, reactSame: true });
  expect(s.mfe['billing-local']).toMatchObject({ kind: 'local', mounts: 1, reactSame: true, build: s.build });
  expect(s.frames['billing-local']).toMatchObject({ kind: 'local', state: 'ready' });
  expect(s.subs).toBe(3);                                                // 살아 있는 billing 계열 인스턴스 수
  await Promise.all(['billing', 'control-mount', 'billing-local'].map((slot) =>
    expect(page.locator(`[data-tree-root] [data-testid="${slot}-input"]`)).toBeVisible()));
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});

test('smoke billing: standalone page', async ({ lab, page }) => {
  await lab.openStandalone('billing');
  await expect(page.locator('[data-testid="billing-input"]')).toBeVisible();
  const reactSame = await page.evaluate(() => (window as unknown as { __mfe: Mfe }).__mfe.billing.reactSame);
  expect(reactSame).toBeNull();
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});
