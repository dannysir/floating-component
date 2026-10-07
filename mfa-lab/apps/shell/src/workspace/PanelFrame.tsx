// src/workspace/PanelFrame.tsx
import { Suspense, useEffect, useLayoutEffect, useReducer } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { frameMounted, frameUnmounted, setFrameState } from '../instrumentation';
import { RemoteErrorBoundary } from '../adapters/RemoteErrorBoundary';

type Kind = 'local' | 'same-tree' | 'mount' | 'iframe';
interface PanelFrameProps { slot: string; kind: Kind; title: string; team: string; children: ReactNode }

const FRAME: CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: 'var(--hb-bg, #fff)', color: 'var(--hb-fg, #1f2328)' };
const HEADER: CSSProperties = { flex: '0 0 28px', display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', fontSize: 12, borderBottom: '1px solid var(--hb-border, #d0d7de)', cursor: 'grab', userSelect: 'none' };
const BODY: CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' };

const PanelSkeleton = ({ slot }: { slot: string }) => {
  useLayoutEffect(() => { setFrameState(slot, 'loading'); }, [slot]);
  return <div data-testid={`loading-${slot}`}>loading…</div>;
};

type MfeWindow = Window & { __mfe?: Record<string, Record<string, unknown>>; __fc?: { frames: Record<string, { frameMounts: number; mirror?: { loads: number } }> } };

export const PanelFrame = ({ slot, kind, title, team, children }: PanelFrameProps) => {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useLayoutEffect(() => {
    frameMounted(slot, kind);
    return () => frameUnmounted(slot);
  }, [slot, kind]);
  useEffect(() => {
    const onChange = () => rerender();
    window.addEventListener('harbor:probe', onChange);
    window.addEventListener('harbor:frame', onChange);
    rerender();   // 구독 전에 지나간 첫 마운트 갱신을 배지에 반영한다
    return () => { window.removeEventListener('harbor:probe', onChange); window.removeEventListener('harbor:frame', onChange); };
  }, []);
  const w = window as MfeWindow;
  const f = w.__fc?.frames[slot];
  const status = kind === 'iframe'
    ? `f${f?.frameMounts ?? 0} l${f?.mirror?.loads ?? 0}`
    : `f${f?.frameMounts ?? 0} c${Number(w.__mfe?.[slot]?.mounts ?? 0)}`;
  return (
    <section data-testid={`frame-${slot}`} data-slot={slot} data-kind={kind} style={FRAME}>
      <header data-drag-handle data-testid={`handle-${slot}`} style={HEADER}>
        <strong>{title}</strong> · {team} · {kind} · <output data-testid={`status-${slot}`}>{status}</output>
      </header>
      <div data-testid={`body-${slot}`} style={BODY}>
        <RemoteErrorBoundary slot={slot}>
          <Suspense fallback={<PanelSkeleton slot={slot} />}>{children}</Suspense>
        </RemoteErrorBoundary>
      </div>
    </section>
  );
};
