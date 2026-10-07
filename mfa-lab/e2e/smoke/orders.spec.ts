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

// ---- federation (B1-06 순서 6) ----
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { blockRemote } from '../helpers/faults';

const ORDERS = 'http://127.0.0.1:4301';
const buildJson = () => JSON.parse(readFileSync(fileURLToPath(new URL('../../.run/build.json', import.meta.url)), 'utf8')) as { apps: Record<string, { buildId: string; mf: string }> };

test('smoke orders (a): federation remote renders same-tree with one React', async ({ lab, page }) => {
  await lab.open({ layout: 'census', slots: { a: 'orders' } });
  await settle(page);
  const s = await page.evaluate(() => {
    const w = window as unknown as { __mfe: Mfe; __fc: { build: string; env: { mf: string }; frames: Record<string, { kind: string; state: string; frameMounts: number }> } };
    return { probe: w.__mfe.orders, build: w.__fc.build, mf: w.__fc.env.mf, frame: w.__fc.frames.orders };
  });
  expect(s.mf).toBe('on');
  expect(s.probe).toMatchObject({ kind: 'same-tree', mounts: 1, unmounts: 0, reactSame: true });
  expect(s.probe.build).not.toBe(s.build);                              // remote 번들의 스탬프
  expect(s.frame).toMatchObject({ kind: 'same-tree', state: 'ready', frameMounts: 1 });
  await expect(page.locator('[data-tree-root] [data-testid="orders-row-0"]')).toBeVisible();
  expect(lab.requests.some((r) => r.url === `${ORDERS}/mf-manifest.json`)).toBe(true);
  expect(lab.requests.some((r) => r.url.startsWith(`${ORDERS}/`) && r.url.includes('remoteEntry'))).toBe(true);
  const expectStamp = process.env.EXPECT_ORDERS_STAMP;
  if (expectStamp) expect(s.probe.build).toBe(expectStamp);             // (c) 독립 배포
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});

test('smoke orders (b1): orders origin blocked, control census still renders', async ({ lab, page }) => {
  await blockRemote(page, ORDERS);
  await lab.open({ layout: 'census' });
  await settle(page);
  await expect(page.locator('[data-tree-root] [data-panel-id]')).toHaveCount(4);
  expect(lab.requests.filter((r) => r.url.startsWith(ORDERS))).toEqual([]);   // loaded-first: 쓰지 않는 remote는 부르지 않는다
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});

test('smoke orders (b2): orders origin blocked, workbench renders with the error card only in orders', async ({ lab, page }) => {
  await blockRemote(page, ORDERS);
  const opened = await lab.open({ layout: 'workbench', expectState: { orders: 'error' } });
  await settle(page);
  expect(opened.skipped).toEqual(['board']);                            // board는 B1-07 전이라 미등록
  await expect(page.locator('[data-tree-root] [data-testid="error-orders"]')).toBeVisible();
  await expect(page.locator('[data-tree-root] [data-testid^="error-"]')).toHaveCount(1);
  const states = await page.evaluate(() => Object.fromEntries(Object.entries((window as unknown as { __fc: { frames: Record<string, { state: string }> } }).__fc.frames).map(([k, v]) => [k, v.state])));
  expect(states).toMatchObject({ nav: 'ready', orders: 'error', billing: 'ready', telemetry: 'ready', 'telemetry-x': 'ready' });
  // 허용되는 콘솔 에러는 끊은 요청에 대한 것뿐이다
  const unexpected = lab.consoleErrors().filter((c) => !c.text.includes('4301') && !/Failed to load resource|ERR_FAILED|Failed to fetch|mf-manifest|RUNTIME-/.test(c.text));
  console.log(`[B1-06 b2] console errors: ${JSON.stringify(lab.consoleErrors().map((c) => c.text.slice(0, 160)))}`);
  expect(unexpected).toEqual([]);
  expect(lab.pageErrors.filter((e) => !e.includes('4301') && !/RUNTIME-|mf-manifest|Failed to fetch/.test(e))).toEqual([]);
});

test('smoke orders (c): shell build id is unchanged by an orders-only deploy', async ({ lab, page }) => {
  const expectStamp = process.env.EXPECT_ORDERS_STAMP;
  test.skip(!expectStamp, 'EXPECT_ORDERS_STAMP is not set');
  await lab.open({ layout: 'census', slots: { a: 'orders' } });
  await settle(page);
  const s = await page.evaluate(() => {
    const w = window as unknown as { __mfe: Mfe; __fc: { build: string } };
    return { orders: w.__mfe.orders.build, shell: w.__fc.build, meta: document.querySelector('meta[name="harbor-app"]')?.getAttribute('content') };
  });
  expect(s.orders).toBe(expectStamp);
  expect(s.meta).toBe(`shell@${buildJson().apps.shell.buildId}`);
  expect(s.shell).toBe(buildJson().apps.shell.buildId);
});
