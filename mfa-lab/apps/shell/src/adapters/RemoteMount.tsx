// src/adapters/RemoteMount.tsx
import { useLayoutEffect, useRef, useState } from 'react';
import type { Mount, Unmount } from '@harbor/contract';
import { bus } from '../bus';
import { registry } from '../registry/registry';
import { bumpLateResolve, setFrameState } from '../instrumentation';
import { registerResetter } from './resetLoader';

type MountModule = { mount: Mount; unmount: Unmount };
const modules = new Map<string, Promise<MountModule>>();     // URL(슬롯)별 모듈 promise 캐시

const loaderFor = (slot: string): (() => Promise<unknown>) => {
  if (slot === 'control-mount') return () => import('../local/controlMount');   // host 로컬 모듈, host의 React
  const r = registry.remotes[slot];
  const url = `${r.origin}${r.entry}`;                                           // http://127.0.0.1:4303/remote-entry.js
  return () => import(/* @vite-ignore */ url);
};

const loadModule = (slot: string): Promise<MountModule> => {
  const hit = modules.get(slot);
  if (hit) return hit;
  const p = loaderFor(slot)().then((m) => {
    const mod = m as Partial<MountModule>;
    if (typeof mod.mount !== 'function' || typeof mod.unmount !== 'function') {
      throw new Error(`RemoteMount(${slot}): module has no mount/unmount export`);
    }
    return mod as MountModule;
  });
  p.catch(() => { modules.delete(slot); });   // 거부된 promise는 캐시에서 지워 retry가 다시 시도하게 한다
  modules.set(slot, p);
  return p;
};

export const RemoteMount = ({ slot }: { slot: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<Error | null>(null);

  useLayoutEffect(() => {
    registerResetter(slot, () => modules.delete(slot));
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let mounted: MountModule | null = null;
    loadModule(slot).then(
      (m) => {
        if (cancelled) { bumpLateResolve(slot); return; }       // cleanup이 먼저 실행됐다: mount하지 않는다
        m.mount(el, { slot, bus, contract: 1 });
        mounted = m;
        setFrameState(slot, 'ready');
      },
      (e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); },
    );
    return () => {
      cancelled = true;
      if (mounted) mounted.unmount(el);                          // 동기. 미루지 않는다 (아래 설명)
    };
  }, [slot]);

  if (error) throw error;                                        // RemoteErrorBoundary가 받아 error-<slot> 카드를 그린다
  return <div ref={ref} data-testid={`mount-${slot}`} style={{ width: '100%', height: '100%' }} />;
};
