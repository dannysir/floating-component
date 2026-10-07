import type { Page } from '@playwright/test';
import { settle } from './settle';
import { handlePoint, underCursor, harnessError } from './geometry';
import type { Point } from './geometry';
import { readProbe } from './probe.init';
import { snapshot } from './snapshot';
import type { Snapshot } from './snapshot';

export type ReleaseMode = 'overShadow' | 'settled' | 'immediate';
export type UnderCursorAtDrop = 'source' | 'other-droppable' | 'locked' | 'iframe' | 'outside' | null;
export interface ReleaseResult { mode: ReleaseMode | 'esc'; underCursorAtDrop: UnderCursorAtDrop; dragendDropEffect: string | null; sawDrop: boolean; snapshot: Snapshot }
export interface MouseDrag {
  sourceId: string; slot: string; readonly current: Point; readonly teleportMoves: number;
  teleport: (p: Point) => Promise<Snapshot>;
  glide: (p: Point, steps: number) => Promise<Snapshot>;
  nudge: () => Promise<Snapshot>;
  release: (opts?: { mode?: ReleaseMode }) => Promise<ReleaseResult>;
  cancelEsc: () => Promise<ReleaseResult>;
}

const panelIdOfSlot = (page: Page, slot: string) =>
  page.evaluate((s) => document.querySelector(`[data-tree-root] [data-testid="handle-${s}"]`)?.closest('[data-panel-id]')?.getAttribute('data-panel-id') ?? null, slot);

const classifyUnder = (u: Awaited<ReturnType<typeof underCursor>>, sourceId: string): UnderCursorAtDrop => {
  if (u.isIframe) return 'iframe';
  if (!u.panelId) return 'outside';
  if (u.panelId === sourceId) return 'source';
  return u.droppable ? 'other-droppable' : 'locked';
};

export const begin = async (page: Page, slot: string, opts: { expectStart?: boolean } = {}): Promise<MouseDrag> => {
  const expectStart = opts.expectStart ?? true;
  const sourceId = await panelIdOfSlot(page, slot);
  if (!sourceId) throw harnessError(`begin: slot ${slot} has no handle in the tree`);
  const start = await handlePoint(page, slot);
  const since = Date.now();
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();                                   // 핸들 위의 실제 mousedown이 panel.draggable을 켠다 (PanelNodeRenderer.tsx:59-69)
  await page.mouse.move(start.x + 6, start.y);               // 첫 이동 ≥ 4px → dragstart + dragenter (dragover는 아직 없다)
  await settle(page);
  const started = await page.evaluate((id) => document.querySelector(`[data-tree-root][data-dragging-panel-id="${id}"]`) !== null, sourceId);
  const probe = await readProbe(page, { since });
  const sawTrustedStart = probe.events.some((e) => e.type === 'dragstart' && e.isTrusted && e.target.panelId === sourceId);
  if (expectStart && (!started || !sawTrustedStart)) throw harnessError(`begin: no trusted dragstart for ${sourceId} (started=${started}, probe=${sawTrustedStart})`);
  if (!expectStart && (started || sawTrustedStart)) throw harnessError(`begin: drag started on ${sourceId} but expectStart=false`);
  let current: Point = { x: start.x + 6, y: start.y };
  let lastTeleportMoves = 0;

  const finish = async (mode: ReleaseResult['mode'], since2: number): Promise<ReleaseResult> => {
    await settle(page);
    const events = (await readProbe(page, { since: since2 })).events;
    const dragend = [...events].reverse().find((e) => e.type === 'dragend');
    const lastOver = [...events].reverse().find((e) => e.type === 'dragover');
    const under: UnderCursorAtDrop = mode === 'esc' ? null
      : !lastOver ? 'outside'
      : !lastOver.top ? 'iframe'
      : lastOver.target.panelId === sourceId ? 'source'
      : lastOver.target.panelId ? (lastOver.target.droppable === false ? 'locked' : 'other-droppable') : 'outside';
    return { mode, underCursorAtDrop: under, dragendDropEffect: dragend?.dropEffect ?? null, sawDrop: events.some((e) => e.type === 'drop'), snapshot: await snapshot(page, `after-${mode}`) };
  };

  const drag: MouseDrag = {
    sourceId, slot,
    get current() { return current; },
    get teleportMoves() { return lastTeleportMoves; },
    // 이동 1회 = dragover 1회. Blink는 대상 요소가 바뀌는 이동에서 dragenter/dragleave만 보내고 dragover는 다음 갱신으로 미룬다
    // (EventHandler::UpdateDragAndDrop의 should_only_fire_drag_over_event_). 그 경우에만 같은 점으로 한 번 더 이동해 dragover 1회를 만든다.
    teleport: async (p) => {
      const t = Date.now();
      await page.mouse.move(p.x, p.y);
      current = p;
      const sawOver = (await readProbe(page, { since: t })).events.some((e) => e.type === 'dragover');
      if (!sawOver) await page.mouse.move(p.x, p.y);
      lastTeleportMoves = sawOver ? 1 : 2;
      await settle(page);
      return snapshot(page, 'teleport');
    },
    glide: async (p, steps) => { await page.mouse.move(p.x, p.y, { steps }); current = p; await settle(page); return snapshot(page, 'glide'); },
    nudge: async () => { await page.mouse.move(current.x, current.y); await settle(page); return snapshot(page, 'nudge'); },   // 멈춘 커서는 dragover를 만들지 않는다 → 흉내. 라벨 emulated
    release: async ({ mode = 'overShadow' } = {}) => {
      const t = Date.now();
      if (mode === 'overShadow') {
        const shadowHandle = await handlePoint(page, slot);   // 미리보기 안 shadow 패널의 헤더 (중앙이 아니다: 중앙은 iframe 문서나 드롭 존일 수 있다)
        await page.mouse.move(shadowHandle.x, shadowHandle.y);
        current = shadowHandle;
        await settle(page);
        const u = await underCursor(page, shadowHandle.x, shadowHandle.y);
        if (classifyUnder(u, sourceId) !== 'source') throw harnessError(`release(overShadow): under cursor is ${JSON.stringify(u)}, not source ${sourceId}`);
      } else if (mode === 'settled') {
        await settle(page);
      }
      await page.mouse.up();                                  // 드래그 중이면 CDP 'drop' → dragover + drop + dragend 연속
      return finish(mode, t);
    },
    cancelEsc: async () => { const t = Date.now(); await settle(page); await page.keyboard.press('Escape'); return finish('esc', t); },   // CDP dragCancel → dragend만, dragleave 없음
  };
  return drag;
};
