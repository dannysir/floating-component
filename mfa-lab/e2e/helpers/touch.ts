// CDP Input.dispatchTouchEvent로 누르기·이동·떼기. touch 프로젝트(hasTouch: true)에서만 쓴다.
// 프로토콜: touchEnd·touchCancel은 touchPoints가 비어야 하고 touchStart·touchMove는 하나 이상.
import type { CDPSession, Page } from '@playwright/test';
import { settle } from './settle';
import { handlePoint, underCursor } from './geometry';
import { harnessError } from './errors';
import type { Point } from './geometry';
import { snapshot } from './snapshot';
import type { Snapshot } from './snapshot';
import { readProbe } from './probe.init';
import type { ProbeEvent } from './probe.init';

export interface Touch {
  touchStart: (p: Point) => Promise<void>;
  hold: (ms: number) => Promise<void>;
  touchMove: (p: Point) => Promise<Snapshot>;
  touchEnd: () => Promise<Snapshot>;
  touchCancel: () => Promise<Snapshot>;
  cdpCalls: () => number;
}

export interface GhostObs { count: number; opacity: string | null; outline: string | null }
export interface TouchResult {
  started: boolean;
  ghostsDuring: GhostObs[];           // 각 touchMove 뒤의 ghost 관찰
  underCursorAtDrop: 'source' | 'other-droppable' | 'locked' | 'iframe' | 'outside' | null;
  ghostsAfter: number;
  onMovePanelCalls: number;
  sawDragstart: boolean; sawContextmenu: boolean; sawSelectstart: boolean; sawTouchcancel: boolean;
  touchTrusted: boolean;
  events: ProbeEvent[];
  snapshot: Snapshot;
}

export const readGhosts = (page: Page): Promise<GhostObs> => page.evaluate(() => {
  const gs = Array.from(document.querySelectorAll('body > [style*="z-index: 9999"]')) as HTMLElement[];
  return { count: gs.length, opacity: gs[0]?.style.opacity ?? null, outline: gs[0]?.style.outline ?? null };
});

export const openTouch = async (page: Page): Promise<Touch> => {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  let calls = 0;
  const send = async (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: Point[]) => {
    calls += 1;
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: 1 })) });
  };
  return {
    touchStart: (p) => send('touchStart', [p]),
    hold: (ms) => page.waitForTimeout(ms),                                      // 움직이지 않고 기다린다 (waitForTimeout이 허용되는 유일한 자리)
    touchMove: async (p) => { await send('touchMove', [p]); await settle(page); return snapshot(page, 'touchMove'); },
    touchEnd: async () => { await send('touchEnd', []); await settle(page); return snapshot(page, 'touchEnd'); },
    touchCancel: async () => { await send('touchCancel', []); await settle(page); return snapshot(page, 'touchCancel'); },
    cdpCalls: () => calls,
  };
};

const classify = async (page: Page, p: Point, sourceId: string | null): Promise<TouchResult['underCursorAtDrop']> => {
  const u = await underCursor(page, p.x, p.y);
  if (u.isIframe) return 'iframe';
  if (!u.panelId) return 'outside';
  if (u.panelId === sourceId) return 'source';
  return u.droppable ? 'other-droppable' : 'locked';
};

const runGesture = async (page: Page, t: Touch, sourceId: string | null, waypoints: Point[], end: 'end' | 'cancel', t0: number, callsBefore: number, started: boolean, ghostsFirst: GhostObs[]): Promise<TouchResult> => {
  const ghostsDuring = [...ghostsFirst];
  // waypoint마다 이동 → settle → ghost 관찰 (순서가 중요하므로 reduce로 순차 실행)
  await waypoints.reduce(async (acc, p) => { await acc; await t.touchMove(p); ghostsDuring.push(await readGhosts(page)); }, Promise.resolve());
  const last = waypoints[waypoints.length - 1] ?? null;
  const under = last ? await classify(page, last, sourceId) : null;
  const snap = end === 'end' ? await t.touchEnd() : await t.touchCancel();
  const events = (await readProbe(page, { since: t0 })).events;
  const touches = events.filter((e) => e.type.startsWith('touch'));
  return {
    started,
    ghostsDuring,
    underCursorAtDrop: under,
    ghostsAfter: (await readGhosts(page)).count,
    onMovePanelCalls: snap.calls.filter((c) => c.fn === 'onMovePanel').length - callsBefore,
    sawDragstart: events.some((e) => e.type === 'dragstart'),
    sawContextmenu: events.some((e) => e.type === 'contextmenu'),
    sawSelectstart: events.some((e) => e.type === 'selectstart'),
    sawTouchcancel: events.some((e) => e.type === 'touchcancel'),
    touchTrusted: touches.length > 0 && touches.every((e) => e.isTrusted),
    events,
    snapshot: snap,
  };
};

const movesSoFar = async (page: Page) => (await snapshot(page, 'pre')).calls.filter((c) => c.fn === 'onMovePanel').length;

// 핸들 모드 (input: touch-cdp-handle). 롱프레스 없음. 8px를 넘는 첫 이동에서 시작한다 (useTouchDrag.ts:145-149, armed = !!dragHandleSelector :234).
export const handleDrag = async (page: Page, slot: string, waypoints: Point[], end: 'end' | 'cancel'): Promise<TouchResult> => {
  const t = await openTouch(page);
  const start = await handlePoint(page, slot);
  const sourceId = await page.evaluate((s) => document.querySelector(`[data-tree-root] [data-testid="handle-${s}"]`)?.closest('[data-panel-id]')?.getAttribute('data-panel-id') ?? null, slot);
  const callsBefore = await movesSoFar(page);
  const t0 = Date.now();
  await t.touchStart(start);
  await t.touchMove({ x: start.x + 12, y: start.y });                             // > MOVE_THRESHOLD(8)
  // Chromium은 touch slop 영역 안의 첫 touchmove를 페이지에 보내지 않는다(12px에서 pointermove만 나옴, B1-03e 관찰).
  // 그래서 한 번 더 나눠 24px로 이동한다 (BRIEF-1 B1-03e 사다리 2: 이동을 두 번 이상으로 나눠 사이마다 settle).
  const g1 = await readGhosts(page);
  if (g1.count === 0) await t.touchMove({ x: start.x + 24, y: start.y });
  const g = await readGhosts(page);
  if (g.count !== 1) throw harnessError(`handleDrag: expected 1 ghost after 12px+24px moves, got ${g.count}`);
  return runGesture(page, t, sourceId, waypoints, end, t0, callsBefore, true, [g]);
};

// ?drag=panel 전용, 기록만 (S7b, P1). 550ms > LONG_PRESS_MS 450 (useTouchDrag.ts:8, 246-250).
export const longPressDrag = async (page: Page, panelId: string, waypoints: Point[], end: 'end' | 'cancel'): Promise<TouchResult> => {
  const t = await openTouch(page);
  const box = await page.locator(`[data-tree-root] [data-panel-id="${panelId}"]`).boundingBox();
  if (!box) throw harnessError(`longPressDrag: no panel ${panelId}`);
  const callsBefore = await movesSoFar(page);
  const t0 = Date.now();
  await t.touchStart({ x: box.x + box.width / 2, y: box.y + 14 });
  await t.hold(550);
  const g = await readGhosts(page);
  return runGesture(page, t, panelId, waypoints, end, t0, callsBefore, g.count === 1, [g]);
};
