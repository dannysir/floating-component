// 경계선 리사이즈. Resizer는 draggable이 아니므로 드래그 인터셉트 없이 포인터 이벤트가 그대로 간다.
// 단언 규칙: 크기 변화는 방향과 3px 허용 오차로 판정한다 (doc/qa/mfa/HARNESS.md 「resize.ts」).
import type { Page } from '@playwright/test';
import { harnessError } from './errors';
import { panelRect, resizerBetween } from './geometry';
import type { Point } from './geometry';
import { readProbe } from './probe.init';
import { settle } from './settle';
import { snapshot } from './snapshot';
import type { Snapshot } from './snapshot';
import type { ProbeEvent } from './probe.init';

export interface ResizeResult {
  axis: 'x' | 'y';
  before: { a: number; b: number };
  after: { a: number; b: number };
  pointerDelta: number;
  gotPointerCapture: boolean;
  lostPointerCapture: boolean;
  bodyUserSelectDuring: string;
  bodyUserSelectAfter: string;
  events: ProbeEvent[];
  snapshot: Snapshot;
}

const sizeOf = async (page: Page, id: string, axis: 'x' | 'y') => {
  const r = await panelRect(page, id);
  return axis === 'x' ? r.width : r.height;
};

type Input = {
  down: (p: Point) => Promise<void>;
  move: (p: Point, steps: number) => Promise<void>;
  up: () => Promise<void>;
};

const runResize = async (page: Page, input: Input, opts: { between: [string, string]; delta: number; steps?: number; releaseOver?: Point }): Promise<ResizeResult> => {
  const [a, b] = opts.between;
  const res = await resizerBetween(page, a, b);
  if (!res) throw harnessError(`resizeBorder: no resizer between ${a} and ${b}`);
  const { axis } = res;
  const start = { x: res.rect.x + res.rect.width / 2, y: res.rect.y + res.rect.height / 2 };
  const end = axis === 'x' ? { x: start.x + opts.delta, y: start.y } : { x: start.x, y: start.y + opts.delta };
  const before = { a: await sizeOf(page, a, axis), b: await sizeOf(page, b, axis) };
  const t0 = Date.now();
  await input.down(start);
  await input.move(end, opts.steps ?? 10);
  await settle(page);
  const bodyUserSelectDuring = await page.evaluate(() => document.body.style.userSelect);
  if (opts.releaseOver) {
    await input.move(opts.releaseOver, 1);
    await settle(page);
  }
  await input.up();
  await settle(page);
  const events = (await readProbe(page, { since: t0 })).events;
  return {
    axis,
    before,
    after: { a: await sizeOf(page, a, axis), b: await sizeOf(page, b, axis) },
    pointerDelta: opts.delta,
    gotPointerCapture: events.some((e) => e.type === 'gotpointercapture'),
    lostPointerCapture: events.some((e) => e.type === 'lostpointercapture'),
    bodyUserSelectDuring,
    bodyUserSelectAfter: await page.evaluate(() => document.body.style.userSelect),
    events,
    snapshot: await snapshot(page, 'after-resize'),
  };
};

export const resizeBorder = (page: Page, opts: { between: [string, string]; delta: number; steps?: number; releaseOver?: Point }) =>
  runResize(page, {
    down: async (p) => { await page.mouse.move(p.x, p.y); await page.mouse.down(); },
    move: async (p, steps) => { await page.mouse.move(p.x, p.y, { steps }); },
    up: async () => { await page.mouse.up(); },
  }, opts);

// 같은 동작을 CDP 터치로 (touch 프로젝트)
export const touchResize = async (page: Page, opts: { between: [string, string]; delta: number; steps?: number }) => {
  const cdp = await page.context().newCDPSession(page);
  let cur: Point = { x: 0, y: 0 };
  const send = (type: string, p?: Point) => cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
  return runResize(page, {
    down: async (p) => { cur = p; await send('touchStart', p); },
    move: async (p, steps) => {
      const from = cur;
      await Array.from({ length: steps }, (_, i) => i + 1).reduce(async (acc, i) => {
        await acc;
        await send('touchMove', { x: from.x + ((p.x - from.x) * i) / steps, y: from.y + ((p.y - from.y) * i) / steps });
      }, Promise.resolve());
      cur = p;
    },
    up: async () => { await send('touchEnd'); },
  }, opts);
};
