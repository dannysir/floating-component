import type { Page } from '@playwright/test';
import { readDomTree } from './geometry';

export interface SettleResult { stable: boolean; reads: number; ms: number }

// 페이지 안에서 실행. 비교용 문자열 하나를 만든다.
const readMainState = () => {
  const w = window as unknown as { __fc?: { frames: unknown }; __mfe?: unknown };
  return JSON.stringify({ frames: w.__fc?.frames ?? null, mfe: w.__mfe ?? null });
};

const readAll = async (page: Page): Promise<string> => {
  const main = await page.evaluate(readMainState);
  const tree = await page.evaluate(readDomTree);
  const frames = await Promise.all(
    page.frames().filter((f) => f !== page.mainFrame()).map((f) =>
      f.evaluate(() => JSON.stringify((window as unknown as { __mfe?: unknown }).__mfe ?? null))
        .catch(() => `LOADING:${Date.now()}:${Math.random()}`),   // 읽을 수 없는 프레임은 "다름"으로 친다 (HARNESS 「헬퍼」 settle). 매번 다른 값이어야 연속 두 번 로딩 중일 때 stable: true로 잘못 끝나지 않는다
    ),
  );
  return `${tree}|${main}|${frames.join('|')}`;
};

const lastSettle = new WeakMap<Page, SettleResult>();
export const lastSettleOf = (page: Page): SettleResult | null => lastSettle.get(page) ?? null;

export const settle = async (page: Page): Promise<SettleResult> => {
  const res = await settleInner(page);
  lastSettle.set(page, res);
  return res;
};

const settleInner = async (page: Page): Promise<SettleResult> => {
  const t0 = Date.now();
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0)))));
  let prev = await readAll(page);
  let reads = 1;
  while (Date.now() - t0 < 500) {
    await page.waitForTimeout(25);                      // 헬퍼 내부의 폴링 간격. 스펙에서는 waitForTimeout을 쓰지 않는다
    const next = await readAll(page);
    reads += 1;
    if (next === prev) return { stable: true, reads, ms: Date.now() - t0 };
    prev = next;
  }
  return { stable: false, reads, ms: Date.now() - t0 };
};
