// 한 단계의 상태를 JSON 하나로 만든다. 규칙: doc/qa/mfa/HARNESS.md 「스냅샷」
import type { Page } from '@playwright/test';
import { readDomTree, treeNotation } from './geometry';
import { lastSettleOf } from './settle';
import type { SettleResult } from './settle';
import { labStateOf } from './labstate';
import type { ConsoleEntry } from './labstate';

export interface PanelSnap { slot: string | null; rect: { x: number; y: number; width: number; height: number }; draggable: boolean; droppable: boolean; shadow: boolean; elementSeq: number | null }
export interface GhostSnap { rect: { x: number; y: number; width: number; height: number }; opacity: string; outline: string; iframeCount: number }
export interface ContentSnap { input: string | null; counter: string | null; scrollTop: number | null; focused: boolean }

export interface Snapshot {
  step: string;
  url: string;
  lib: { source: string; tree: string; commit: string } | null;
  settle: SettleResult | null;
  tree: unknown;
  treeNotation: string;
  treeVersion: number;
  calls: Array<{ seq: number; fn: string; args: unknown[]; treeVersionBefore: number }>;
  dom: {
    domTree: string;
    draggingPanelId: string | null;
    panels: Record<string, PanelSnap>;
    resizerCount: number;
    resizers: Array<{ rect: { x: number; y: number; width: number; height: number }; axis: 'x' | 'y' }>;
    ghosts: GhostSnap[];
    bodyUserSelect: string;
  };
  counters: {
    frames: Record<string, unknown>;
    mfe: Record<string, unknown>;
    iframes: Record<string, { loads: number | null; docId: string | null; frameUrl: string }>;
    domMoves: Record<string, number>;
    domLog: unknown[];
  };
  content: Record<string, ContentSnap>;
  activeTestid: string | null;
  console: ConsoleEntry[];
  pageErrors: string[];
  documentRequests: Record<string, number>;
}

// 페이지 안에서 실행. 바깥을 참조하지 않는다.
const readPageState = () => {
  type Fc = { lib: { source: string; tree: string; commit: string }; getTree: () => unknown; treeVersion: () => number; calls: Snapshot['calls']; frames: Record<string, unknown> };
  const w = window as unknown as { __fc?: Fc; __mfe?: Record<string, unknown>; __probe?: { domMoves: Record<string, number>; domLog: unknown[]; seqOf: (el: Element) => number } };
  const root = document.querySelector('[data-testid="workspace"] [data-tree-root]') ?? document.querySelector('[data-tree-root]');
  const rectOf = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  const panels: Record<string, unknown> = {};
  root?.querySelectorAll('[data-panel-id]').forEach((el) => {
    const h = el as HTMLElement;
    const slotEl = h.querySelector('[data-slot]') ?? h.querySelector('[data-testid^="handle-"]');
    const slot = slotEl?.getAttribute('data-slot') ?? slotEl?.getAttribute('data-testid')?.replace(/^handle-/, '') ?? null;
    panels[h.getAttribute('data-panel-id') ?? '?'] = {
      slot, rect: rectOf(h), draggable: h.draggable, droppable: h.getAttribute('data-panel-droppable') !== 'false',
      shadow: h.style.opacity === '0.5' && h.style.outlineStyle === 'dashed',
      elementSeq: w.__probe?.seqOf ? w.__probe.seqOf(h) : null,
    };
  });
  const resizers = Array.from(root?.querySelectorAll('.ftl-resizer') ?? []).map((el) => ({ rect: rectOf(el), axis: el.classList.contains('ftl-resizer--horizontal') ? 'x' : 'y' }));
  const ghosts = Array.from(document.querySelectorAll('body > [style*="z-index: 9999"]')).map((el) => {
    const h = el as HTMLElement;
    return { rect: rectOf(h), opacity: h.style.opacity, outline: h.style.outline, iframeCount: h.querySelectorAll('iframe').length };
  });
  const content: Record<string, unknown> = {};
  root?.querySelectorAll('[data-testid$="-input"]').forEach((el) => {
    const tid = el.getAttribute('data-testid') ?? '';
    const slot = tid.replace(/-input$/, '');
    const counter = root.querySelector(`[data-testid="${slot}-counter"]`);
    const scroll = root.querySelector(`[data-testid="${slot}-scroll"]`) as HTMLElement | null;
    content[slot] = { input: (el as HTMLInputElement).value, counter: counter?.textContent ?? null, scrollTop: scroll ? scroll.scrollTop : null, focused: document.activeElement === el };
  });
  return {
    url: location.href,
    lib: w.__fc?.lib ?? null,
    tree: w.__fc?.getTree() ?? null,
    treeVersion: w.__fc?.treeVersion() ?? -1,
    calls: (w.__fc?.calls ?? []).map((c) => ({ seq: c.seq, fn: c.fn, args: c.args, treeVersionBefore: c.treeVersionBefore })),
    draggingPanelId: (root as HTMLElement | null)?.dataset.draggingPanelId ?? null,
    panels,
    resizers,
    ghosts,
    bodyUserSelect: document.body.style.userSelect,
    frames: w.__fc?.frames ?? {},
    mfe: w.__mfe ?? {},
    domMoves: w.__probe?.domMoves ? { ...w.__probe.domMoves } : {},
    domLog: w.__probe?.domLog ? [...w.__probe.domLog] : [],
    content,
    activeTestid: document.activeElement?.closest('[data-testid]')?.getAttribute('data-testid') ?? null,
  };
};

const readIframes = async (page: Page) => {
  const handles = await page.locator('[data-tree-root] iframe[data-testid^="iframe-"]').elementHandles();
  const entries = await Promise.all(handles.map(async (h) => {
    const slot = ((await h.getAttribute('data-testid')) ?? '').replace(/^iframe-/, '');
    const frame = await h.contentFrame();
    if (!frame) return [slot, { loads: null, docId: null, frameUrl: '' }] as const;
    const v = await frame.evaluate((s) => {
      const m = (window as unknown as { __mfe?: Record<string, { loads?: number; docId?: string }> }).__mfe?.[s];
      const input = document.querySelector('[data-testid="tele-input"]') as HTMLInputElement | null;
      const scroll = document.querySelector('[data-testid="tele-scroll"]') as HTMLElement | null;
      return { loads: m?.loads ?? null, docId: m?.docId ?? null, input: input?.value ?? null, scrollTop: scroll?.scrollTop ?? null, focused: document.hasFocus() && document.activeElement === input };
    }, slot).catch(() => ({ loads: null, docId: null, input: null, scrollTop: null, focused: false }));
    return [slot, { ...v, frameUrl: frame.url() }] as const;
  }));
  return Object.fromEntries(entries);
};

export const snapshot = async (page: Page, step: string): Promise<Snapshot> => {
  const s = await page.evaluate(readPageState);
  const domTree = await page.evaluate(readDomTree);
  const iframes = await readIframes(page);
  const state = labStateOf(page);
  const newConsole = state ? state.console.slice(state.cursor.console) : [];
  const newErrors = state ? state.pageErrors.slice(state.cursor.pageErrors) : [];
  if (state) state.cursor = { console: state.console.length, pageErrors: state.pageErrors.length };
  const documentRequests = (state?.requests ?? []).filter((r) => r.isNavigation).reduce<Record<string, number>>((acc, r) => {
    const origin = (() => { try { return new URL(r.url).origin; } catch { return r.url; } })();
    return { ...acc, [origin]: (acc[origin] ?? 0) + 1 };
  }, {});
  const iframeContent = Object.fromEntries(Object.entries(iframes).map(([slot, v]) => [slot, { input: (v as { input?: string | null }).input ?? null, counter: null, scrollTop: (v as { scrollTop?: number | null }).scrollTop ?? null, focused: Boolean((v as { focused?: boolean }).focused) }]));
  return {
    step,
    url: s.url,
    lib: s.lib,
    settle: lastSettleOf(page),
    tree: s.tree,
    treeNotation: treeNotation(s.tree as Parameters<typeof treeNotation>[0]),
    treeVersion: s.treeVersion,
    calls: s.calls,
    dom: {
      domTree, draggingPanelId: s.draggingPanelId, panels: s.panels as Record<string, PanelSnap>,
      resizerCount: s.resizers.length, resizers: s.resizers as Snapshot['dom']['resizers'], ghosts: s.ghosts, bodyUserSelect: s.bodyUserSelect,
    },
    counters: {
      frames: s.frames as Record<string, unknown>, mfe: s.mfe as Record<string, unknown>,
      iframes: Object.fromEntries(Object.entries(iframes).map(([k, v]) => [k, { loads: (v as { loads: number | null }).loads, docId: (v as { docId: string | null }).docId, frameUrl: (v as { frameUrl: string }).frameUrl }])),
      domMoves: s.domMoves, domLog: s.domLog,
    },
    content: { ...(s.content as Record<string, ContentSnap>), ...iframeContent },
    activeTestid: s.activeTestid,
    console: newConsole,
    pageErrors: newErrors,
    documentRequests,
  };
};

// 제스처 전에 내용 상태를 기본값이 아닌 값으로 만든다: 입력 seed-<slot>, 카운터 3회, scrollTop 120.
export const seedContent = async (page: Page, slot: string): Promise<void> => {
  const root = page.locator('[data-tree-root]');
  await root.locator(`[data-testid="${slot}-input"]`).fill(`seed-${slot}`);
  const counter = root.locator(`[data-testid="${slot}-counter"]`);
  if (await counter.count()) {
    await counter.click();
    await counter.click();
    await counter.click();
  }
  await root.locator(`[data-testid="${slot}-scroll"]`).evaluate((el) => { (el as HTMLElement).scrollTop = 120; }).catch(() => undefined);
};
