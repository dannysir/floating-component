// src/adapters/SameTreeRemote.tsx
import { lazy, useLayoutEffect } from 'react';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import type { PanelProps } from '@harbor/contract';
import { loaders } from '../registry/loaders';
import { bus } from '../bus';
import { setFrameState } from '../instrumentation';
import { registerResetter } from './resetLoader';

type LazyPanel = LazyExoticComponent<ComponentType<PanelProps>>;
const lazyBySlot = new Map<string, LazyPanel>();   // 슬롯당 한 번. 리마운트 때 다시 받지 않는다 (lazy는 결과를 기억한다)

const lazyFor = (slot: string): LazyPanel => {
  const hit = lazyBySlot.get(slot);
  if (hit) return hit;
  const load = loaders[slot];
  if (!load) throw new Error(`SameTreeRemote: no loader for slot "${slot}"`);
  // React.lazy는 default 키를 요구한다. remote는 named export만 쓰므로 여기서 감싼다 (허용된 예외).
  const Lazy = lazy(() => load().then((m) => ({ default: m.Panel })));
  lazyBySlot.set(slot, Lazy);
  return Lazy;
};

// lazy 자식이 커밋된 뒤 실행되는 layout effect로 ready를 표시한다 (부모의 layout effect는 자식 커밋 뒤에 돈다).
const MarkReady = ({ slot, children }: { slot: string; children: ReactNode }) => {
  useLayoutEffect(() => { setFrameState(slot, 'ready'); }, [slot]);
  return children;
};

export const SameTreeRemote = ({ slot }: { slot: string }) => {
  registerResetter(slot, () => lazyBySlot.delete(slot));   // retry가 새 lazy를 만들게 한다 (거부된 lazy는 영원히 거부 상태)
  const Lazy = lazyFor(slot);
  return (
    <MarkReady slot={slot}>
      <Lazy slot={slot} bus={bus} />
    </MarkReady>
  );
};
