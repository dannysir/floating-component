// lab 픽스처: URL 조립, __fc.ready 대기, 슬롯 상태 대기, lib.source 확인, console/pageerror/request 수집, bodyUserSelect 저장.
// 규칙: doc/qa/mfa/HARNESS.md 「헬퍼」 fixtures.ts
import { test as base, expect } from '@playwright/test';
import type { Page, Request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { harnessError } from './errors';
import { SLOT_PARAMS } from './presets';
import { installProbe } from './probe.init';
import { registerLabState } from './labstate';
import type { ConsoleEntry, RequestEntry } from './labstate';
import type { PresetName } from './presets';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const registry = JSON.parse(readFileSync(here('../../registry.json'), 'utf8')) as {
  shell: { origin: string };
  baseline: { npm051: { origin: string } };
  remotes: Record<string, { origin: string; kind: string }>;
};
const lane = JSON.parse(readFileSync(here('../lane.json'), 'utf8')) as { lane: string; playwright: string; chromium: string };

export type SlotState = 'ready' | 'error' | 'unregistered';

export interface OpenOptions {
  layout: PresetName;
  slots?: Record<string, string>;
  drag?: 'handle' | 'panel';
  lock?: string | string[];
  iframeShield?: 0 | 1;
  origin?: 'shell' | 'baseline';
  expectState?: Record<string, SlotState>;
  flags?: Record<string, string>;
}

export interface OpenResult {
  url: string;
  lib: { source: string; tree: string; commit: string };
  skipped: string[];
}

export type { ConsoleEntry, RequestEntry };

export interface Lab {
  open: (opts: OpenOptions) => Promise<OpenResult>;
  openStandalone: (remote: 'orders' | 'board' | 'billing') => Promise<void>;
  console: ConsoleEntry[];
  pageErrors: string[];
  requests: RequestEntry[];
  failedRequests: { url: string; failure: string }[];
  consoleErrors: () => ConsoleEntry[];
  bodyUserSelect: () => string | null;
  lastOpen: () => OpenResult | null;
}

const IFRAME_SLOTS = new Set(['telemetry', 'telemetry-x', 'control-iframe']);

export const buildUrl = (opts: OpenOptions): string => {
  const origin = opts.origin === 'baseline' ? registry.baseline.npm051.origin : registry.shell.origin;
  const q = new URLSearchParams();
  q.set('layout', opts.layout);
  Object.entries(opts.slots ?? {}).forEach(([k, v]) => {
    if (!(k in SLOT_PARAMS[opts.layout])) throw harnessError(`slot param "${k}" is not valid for layout ${opts.layout}`);
    q.set(k, v);
  });
  if (opts.drag) q.set('drag', opts.drag);
  (Array.isArray(opts.lock) ? opts.lock : opts.lock ? [opts.lock] : []).forEach((l) => q.append('lock', l));
  if (opts.iframeShield !== undefined) q.set('iframeShield', String(opts.iframeShield));
  Object.entries(opts.flags ?? {}).forEach(([k, v]) => q.set(k, v));
  return `${origin}/?${q.toString()}`;
};

interface PanelInfo { id: string; slot: string }

// 미등록 판정: 패널 요소에 자식이 없고 __fc.frames·__mfe 어디에도 그 슬롯 키가 없다.
const readPanels = (page: Page) => page.evaluate(() => {
  type N = { type: string; id?: string; componentKey?: string; children?: N[] };
  const w = window as unknown as { __fc: { getTree: () => N; frames: Record<string, unknown> }; __mfe?: Record<string, unknown> };
  const walk = (n: N): { id: string; slot: string }[] => (n.type === 'panel' ? [{ id: n.id ?? '', slot: n.componentKey ?? '' }] : (n.children ?? []).flatMap(walk));
  return walk(w.__fc.getTree()).map((p) => {
    const el = document.querySelector(`[data-tree-root] [data-panel-id="${CSS.escape(p.id)}"]`);
    const hasKey = Object.prototype.hasOwnProperty.call(w.__fc.frames, p.slot) || Object.prototype.hasOwnProperty.call(w.__mfe ?? {}, p.slot);
    return { ...p, empty: !!el && el.childElementCount === 0, hasKey };
  });
});

const slotReached = (page: Page, slot: string, want: SlotState) => page.evaluate(([s, w, isIframe]) => {
  const win = window as unknown as {
    __fc: { frames: Record<string, { state: string; mirror?: { loads: number } }> };
    __mfe?: Record<string, { mounts?: number }>;
  };
  if (s.startsWith('bare-')) return Number(win.__mfe?.[s]?.mounts ?? 0) >= 1;
  const f = win.__fc.frames[s];
  if (!f) return false;
  if (w === 'ready' && isIframe) return f.state === 'ready' && Number(f.mirror?.loads ?? 0) >= 1;
  return f.state === w;
}, [slot, want, IFRAME_SLOTS.has(slot)] as const);

const waitFor = async (fn: () => Promise<boolean>, timeoutMs: number, what: string) => {
  const t0 = Date.now();
  const loop = async (): Promise<void> => {
    if (await fn()) return;
    if (Date.now() - t0 > timeoutMs) throw harnessError(`timeout ${timeoutMs}ms waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
    await loop();
  };
  await loop();
};

export const test = base.extend<{ lab: Lab; probe: boolean }>({
  probe: [true, { option: true }],
  lab: async ({ page, probe }, use) => {
    if (probe) await installProbe(page.context());   // 모든 프레임에 window.__probe (test.use({ probe: false })로 끈다)
    const consoleLog: ConsoleEntry[] = [];
    const pageErrors: string[] = [];
    const requests: RequestEntry[] = [];
    const failedRequests: { url: string; failure: string }[] = [];
    const t0 = Date.now();
    page.on('console', (m) => consoleLog.push({ type: m.type(), text: m.text(), url: m.location().url }));
    page.on('pageerror', (e) => pageErrors.push(String(e?.stack ?? e)));
    page.on('request', (r: Request) => requests.push({
      url: r.url(), method: r.method(), resourceType: r.resourceType(),
      frameUrl: (() => { try { return r.frame().url(); } catch { return ''; } })(),
      isNavigation: r.isNavigationRequest(), t: Date.now() - t0,
    }));
    page.on('requestfailed', (r) => failedRequests.push({ url: r.url(), failure: r.failure()?.errorText ?? '' }));
    let bodyUserSelect: string | null = null;
    let last: OpenResult | null = null;

    const open = async (opts: OpenOptions): Promise<OpenResult> => {
      const major = page.context().browser()?.version().split('.')[0];
      if (major && major !== lane.chromium.split('.')[0]) throw harnessError(`browser major ${major} != lane chromium ${lane.chromium}`);
      const url = buildUrl(opts);
      const res = await page.goto(url);
      if (!res || res.status() !== 200) throw harnessError(`server not ready: ${url} -> ${res?.status() ?? 'no response'}`);
      await page.waitForFunction(() => (window as unknown as { __fc?: { ready?: boolean } }).__fc?.ready === true, null, { timeout: 15_000 })
        .catch(async () => {
          const err = await page.evaluate(() => (window as unknown as { __fc?: { error?: string } }).__fc?.error ?? null).catch(() => null);
          throw harnessError(`__fc.ready not true within 15s (${url})${err ? `: __fc.error=${err}` : ''}`);
        });
      const lib = await page.evaluate(() => (window as unknown as { __fc: { lib: { source: string; tree: string; commit: string } } }).__fc.lib);
      const wantSource = opts.origin === 'baseline' ? ['npm051'] : ['src', 'dist'];
      if (!wantSource.includes(lib.source)) throw harnessError(`lib.source ${lib.source} does not match origin ${opts.origin ?? 'shell'}`);

      const panels = await readPanels(page);
      const expectState = opts.expectState ?? {};
      const skipped = panels.filter((p) => p.empty && !p.hasKey).map((p) => p.slot);
      const notUnregistered = panels.find((p) => expectState[p.slot] === 'unregistered' && !skipped.includes(p.slot));
      if (notUnregistered) throw harnessError(`slot ${notUnregistered.slot} expected unregistered but panel has children or probe keys`);
      const waits: PanelInfo[] = panels.filter((p) => !skipped.includes(p.slot));
      await Promise.all(waits.map((p) => {
        const want = expectState[p.slot] ?? 'ready';
        return waitFor(() => slotReached(page, p.slot, want), 15_000, `slot ${p.slot} -> ${want}`);
      }));
      bodyUserSelect = await page.evaluate(() => document.body.style.userSelect);
      last = { url, lib, skipped };
      return last;
    };

    const openStandalone = async (remote: 'orders' | 'board' | 'billing') => {
      const origin = registry.remotes[remote]?.origin;
      if (!origin) throw harnessError(`unknown remote ${remote}`);
      const res = await page.goto(`${origin}/`);
      if (!res || res.status() !== 200) throw harnessError(`standalone ${remote} not ready`);
    };

    registerLabState(page, {
      console: consoleLog, pageErrors, requests,
      bodyUserSelect: () => bodyUserSelect, lastOpen: () => last, cursor: { console: 0, pageErrors: 0 },
    });
    await use({
      open,
      openStandalone,
      console: consoleLog,
      pageErrors,
      requests,
      failedRequests,
      consoleErrors: () => consoleLog.filter((c) => c.type === 'error'),
      bodyUserSelect: () => bodyUserSelect,
      lastOpen: () => last,
    });
  },
});

export { expect };
