// explore 스펙 공용: 슬롯별 카운터 증가분, 관찰 기록 작성. 라이브러리 동작은 단언하지 않고 기록만 한다(HARNESS 「스펙 구성」).
import type { Page, TestInfo } from '@playwright/test';
import path from 'node:path';
import { capture, finishCase, writeObservation } from './evidence';
import type { Observation } from './evidence';
import { checkInvariants } from './invariants';
import type { AllowList, InvariantResult } from './invariants';
import { settle } from './settle';
import { snapshot, seedContent, diff } from './snapshot';
import type { Snapshot, SnapshotDiff } from './snapshot';
import { readProbe } from './probe.init';

export const RUN = 'run01-tier1';
export const TOUCH_SENTENCE = 'Chromium CDP touch emulation, headless; not a real device';

export const baseLabels = (input: 'mouse' | 'touch-cdp-handle' | 'touch-cdp-longpress' = 'mouse'): Record<string, string | boolean> => ({
  input,
  browser: 'chromium-153 headless-shell',
  playwright: '1.63.0',
  native_touch_drag: 'on',
  ...(input === 'mouse' ? {} : { touch: TOUCH_SENTENCE }),
});

export interface SlotDelta {
  slot: string; panelId: string | null;
  frame: number; content: number; moves: number; loads: number | null; docIdChanged: boolean;
  mountCalls: number; unmountCalls: number; rootsAlive: number | null;
  input: string | null; counter: string | null; scrollTop: number | null;
  cls: string;
}

const n = (v: unknown) => Number(v ?? 0);

// before 대비 after의 슬롯별 증가분
export const deltas = (before: Snapshot, after: Snapshot): Record<string, SlotDelta> => {
  const d: SnapshotDiff = diff(before, after);
  return Object.fromEntries(Object.values(d.slots).map((s) => {
    const mb = before.counters.mfe[s.slot] as Record<string, unknown> | undefined;
    const ma = after.counters.mfe[s.slot] as Record<string, unknown> | undefined;
    const c = after.content[s.slot];
    return [s.slot, {
      slot: s.slot, panelId: s.panelId, frame: s.frameMounts, content: s.contentMounts, moves: s.domMoves, loads: s.loads, docIdChanged: s.docIdChanged,
      mountCalls: n(ma?.mountCalls) - n(mb?.mountCalls), unmountCalls: n(ma?.unmountCalls) - n(mb?.unmountCalls),
      rootsAlive: ma && 'rootsAlive' in ma ? n(ma.rootsAlive) : null,
      input: c?.input ?? null, counter: c?.counter ?? null, scrollTop: c?.scrollTop ?? null,
      cls: s.class,
    }];
  }));
};

export const fmtDelta = (x: SlotDelta) =>
  `${x.slot}(${x.panelId ?? '-'}): frame+${x.frame} content+${x.content} moves+${x.moves}${x.loads !== null ? ` loads+${x.loads}${x.docIdChanged ? ' docId-changed' : ''}` : ''}`
  + `${x.mountCalls || x.unmountCalls ? ` mountCalls+${x.mountCalls} unmountCalls+${x.unmountCalls}` : ''}${x.rootsAlive !== null ? ` rootsAlive=${x.rootsAlive}` : ''}`
  + ` input=${JSON.stringify(x.input)} counter=${JSON.stringify(x.counter)} scrollTop=${x.scrollTop} [${x.cls}]`;

export const fmtDeltas = (ds: Record<string, SlotDelta>) => Object.values(ds).map(fmtDelta).join('; ');

export const seedAll = async (page: Page, slots: string[]) => {
  await slots.reduce(async (acc, s) => { await acc; await seedContent(page, s); }, Promise.resolve());
  await settle(page);
};

export const shot = async (page: Page, info: TestInfo, label: string): Promise<{ png: string; snap: Snapshot }> => {
  const png = await capture(page, info, label);
  return { png, snap: await snapshot(page, label) };
};

export interface ObserveArgs {
  scenario: string; caseName: string; runNo: number;
  expected: string; predicted: string; observed: string;
  verdict: Observation['verdict'];
  labels?: Record<string, string | boolean>;
  allow?: AllowList;
  invariants?: InvariantResult[];
  since?: number;
  extra?: Record<string, unknown>;
}

// 불변식(허용 목록은 시나리오 표의 것만) + events.json/console.txt + 관찰 JSON
export const observe = async (page: Page, info: TestInfo, a: ObserveArgs) => {
  const invariants = a.invariants ?? await checkInvariants(page, { allow: a.allow });
  const dir = await finishCase(page, info, a.since ?? 0);
  const lib = await page.evaluate(() => (window as unknown as { __fc?: { lib: { source: string; tree: string; commit: string } } }).__fc?.lib
    ?? { source: 'n/a', tree: 'n/a', commit: 'n/a' });
  const artifactsRoot = path.resolve(dir, '..', '..');
  const obs: Observation & { extra?: Record<string, unknown> } = {
    run: RUN, runNo: a.runNo, scenario: a.scenario, case: a.caseName,
    expected: a.expected, predicted: a.predicted, observed: a.observed, verdict: a.verdict,
    labels: { ...baseLabels(), ...(a.labels ?? {}) },
    lib, invariants,
    artifacts: [path.relative(artifactsRoot, dir)],
    ...(a.extra ? { extra: a.extra } : {}),
  };
  const file = await writeObservation(obs);
  console.log(`[obs] ${a.caseName}-run${a.runNo} verdict=${a.verdict} :: ${a.observed}`);
  console.log(`[obs] invariants: ${invariants.map((r) => `${r.id}=${r.pass}${r.pass ? '' : `(${r.detail})`}`).join(' ')}`);
  return { file, invariants, dir };
};

export const eventsSince = async (page: Page, since: number) => (await readProbe(page, { since })).events;

export const invSummary = (inv: InvariantResult[]) => inv.every((r) => r.pass) ? 'I1~I7 통과' : `불변식 실패: ${inv.filter((r) => !r.pass).map((r) => `${r.id}(${r.detail})`).join(', ')}`;
