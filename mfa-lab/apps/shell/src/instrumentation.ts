import * as React from 'react';
import type { LayoutNode } from '@dannysir/floating-components';
import { registry } from './registry/registry';
import { bus } from './bus';

type FrameKind = 'local' | 'same-tree' | 'mount' | 'iframe';
type FrameState = 'loading' | 'ready' | 'error';
export interface FrameEntry {
  kind: FrameKind; frameMounts: number; frameUnmounts: number; state: FrameState;
  lateResolves?: number;
  mirror?: { loads: number; docIds: string[]; lastLoadedAt: number };
}
export interface CallEntry {
  seq: number; t: number; layout: string;
  fn: 'onMovePanel' | 'onResizeBorder' | 'removePanel' | 'insertPanel';
  args: unknown[]; treeVersionBefore: number;
}
interface Fc {
  ready: boolean; error?: string; build: string;
  lib: { source: 'src' | 'npm051' | 'dist'; tree: string; commit: string };
  env: { mode: 'prod' | 'dev'; mf: 'on' | 'off'; layout: string; flags: Record<string, string> };
  reactVersion: string; reactRef: { createElement: typeof React.createElement };
  registry: typeof registry;
  getTree: (layoutId?: string) => LayoutNode | null;
  treeVersion: (layoutId?: string) => number;
  calls: CallEntry[];
  frames: Record<string, FrameEntry>;
  bus: { subscriberCount: (topic: string) => number };
  resetLog: () => void;
}
type FcWindow = Window & { __fc?: Fc };

const layouts = new Map<string, { get: () => LayoutNode; version: () => number }>();
let seq = 0;

const read = (): Fc => (window as FcWindow).__fc!;
// 불변 갱신: 새 객체를 만들어 다시 대입하고, 배지가 다시 그리도록 이벤트를 보낸다.
const write = (patch: Partial<Fc>) => {
  (window as FcWindow).__fc = { ...read(), ...patch };
  window.dispatchEvent(new CustomEvent('harbor:frame'));
};
const patchFrame = (slot: string, fn: (f: FrameEntry) => FrameEntry) => {
  const frames = read().frames;
  const cur = frames[slot] ?? { kind: 'local', frameMounts: 0, frameUnmounts: 0, state: 'loading' };
  write({ frames: { ...frames, [slot]: fn(cur) } });
};

export const installInstrumentation = () => {
  const flags = Object.fromEntries(new URLSearchParams(window.location.search).entries());
  (window as FcWindow).__fc = {
    ready: false,
    build: __LAB_BUILD_STAMP__,
    lib: { source: __LAB_LIB_SOURCE__, tree: __LAB_LIB_TREE__, commit: __LAB_LIB_COMMIT__ },
    env: { mode: __LAB_MODE__, mf: __LAB_MF__, layout: flags.layout ?? 'workbench', flags },
    reactVersion: React.version,
    reactRef: { createElement: React.createElement },
    registry,
    getTree: (layoutId = 'main') => layouts.get(layoutId)?.get() ?? null,
    treeVersion: (layoutId = 'main') => layouts.get(layoutId)?.version() ?? -1,
    calls: [],
    frames: {},
    bus: { subscriberCount: (topic) => bus.subscriberCount(topic) },
    resetLog: () => write({ calls: [] }),
  };
};

export const registerLayout = (layoutId: string, get: () => LayoutNode, version: () => number) => {
  layouts.set(layoutId, { get, version });
  return () => { layouts.delete(layoutId); };
};
export const markReady = () => write({ ready: true });
export const markError = (message: string) => write({ error: message });
export const logCall = (layout: string, fn: CallEntry['fn'], args: unknown[], treeVersionBefore: number) => {
  seq += 1;
  write({ calls: [...read().calls, { seq, t: performance.now(), layout, fn, args, treeVersionBefore }] });
};
export const frameMounted = (slot: string, kind: FrameKind) =>
  patchFrame(slot, (f) => ({ ...f, kind, frameMounts: f.frameMounts + 1, state: kind === 'local' ? 'ready' : f.state }));
export const frameUnmounted = (slot: string) => patchFrame(slot, (f) => ({ ...f, frameUnmounts: f.frameUnmounts + 1 }));
export const setFrameState = (slot: string, state: FrameState) => patchFrame(slot, (f) => ({ ...f, state }));
export const bumpLateResolve = (slot: string) => patchFrame(slot, (f) => ({ ...f, lateResolves: (f.lateResolves ?? 0) + 1 }));
export const mirrorLoaded = (slot: string, docId: string) =>
  patchFrame(slot, (f) => {
    const m = f.mirror ?? { loads: 0, docIds: [], lastLoadedAt: 0 };
    return { ...f, mirror: { loads: m.loads + 1, docIds: [...m.docIds, docId], lastLoadedAt: Date.now() } };
  });
