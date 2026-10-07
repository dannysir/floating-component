// src/local/controlMount.tsx — 대조군. host의 React로 createRoot. unmount는 queueMicrotask로 미루고 재mount 가드를 둔다.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { MountContext } from '@harbor/contract';
import { createProbe } from '@harbor/contract';
import { App } from '@twin/billing';

const roots = new WeakMap<HTMLElement, Root>();
const slotOf = new WeakMap<HTMLElement, string>();
const pendingUnmount = new WeakMap<HTMLElement, boolean>();

const probeFor = (slot: string) =>
  createProbe(slot, { remote: 'billing', kind: 'mount', build: __LAB_BUILD_STAMP__, reactVersion: React.version, reactSame: true });

export const mount = (el: HTMLElement, ctx: MountContext) => {
  if (ctx.contract !== 1) throw new Error(`control-mount: unsupported contract ${String(ctx.contract)}`);
  const probe = probeFor(ctx.slot);
  probe.bump('mountCalls');
  if (pendingUnmount.get(el)) { pendingUnmount.set(el, false); return; }   // 미룬 unmount를 취소하고 기존 루트를 유지 (strict=1 대비)
  if (roots.has(el)) return;                                                // 같은 el에 두 번 mount → 무시
  const root = createRoot(el);
  roots.set(el, root);
  slotOf.set(el, ctx.slot);
  probe.bump('rootsAlive');
  root.render(<App slot={ctx.slot} bus={ctx.bus} />);   // kind는 넘기지 않는다: probeFor가 먼저 적은 'mount'가 유지된다 (ARCHITECTURE 「앱 목록」 mfe-billing 「소스 구조」)
};

export const unmount = (el: HTMLElement) => {
  const slot = slotOf.get(el);
  if (!slot || !roots.has(el)) return;                                      // 모르는 el → 무시
  const probe = probeFor(slot);
  probe.bump('unmountCalls');
  pendingUnmount.set(el, true);
  queueMicrotask(() => {
    if (!pendingUnmount.get(el)) return;                                    // 그 사이 mount가 다시 왔다
    pendingUnmount.set(el, false);
    roots.get(el)?.unmount();
    roots.delete(el);
    slotOf.delete(el);
    probe.bump('rootsAlive', -1);
  });
};
