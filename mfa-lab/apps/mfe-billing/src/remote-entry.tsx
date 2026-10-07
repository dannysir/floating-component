import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { MountContext } from '@harbor/contract';
import { createProbe } from '@harbor/contract';
import { App } from './App';

const roots = new WeakMap<HTMLElement, Root>();
const slotOf = new WeakMap<HTMLElement, string>();

type FcWindow = Window & { __fc?: { reactRef?: { createElement?: unknown } } };
const reactSame = (): boolean | null => {
  const fc = (window as FcWindow).__fc;
  return fc ? fc.reactRef?.createElement === React.createElement : null;   // 기대값 false (자기 React)
};
const probeFor = (slot: string) =>
  createProbe(slot, { remote: 'billing', kind: 'mount', build: __LAB_BUILD_STAMP__, reactVersion: React.version, reactSame: reactSame() });

export const mount = (el: HTMLElement, ctx: MountContext) => {
  if (ctx.contract !== 1) throw new Error(`mfe-billing: unsupported contract ${String(ctx.contract)}`);
  const probe = probeFor(ctx.slot);
  probe.bump('mountCalls');
  if (roots.has(el)) return;                             // 같은 el에 두 번 mount → 두 번째는 무시
  const root = createRoot(el);
  roots.set(el, root);
  slotOf.set(el, ctx.slot);
  probe.bump('rootsAlive');
  root.render(<App slot={ctx.slot} bus={ctx.bus} />);
};

export const unmount = (el: HTMLElement) => {
  const root = roots.get(el);
  const slot = slotOf.get(el);
  if (!root || !slot) return;                            // 모르는 el → 무시
  const probe = probeFor(slot);
  probe.bump('unmountCalls');
  roots.delete(el);
  slotOf.delete(el);
  root.unmount();                                        // 즉시. host React의 commit은 이 사본에 보이지 않는다 (3.12절 표)
  probe.bump('rootsAlive', -1);
};
