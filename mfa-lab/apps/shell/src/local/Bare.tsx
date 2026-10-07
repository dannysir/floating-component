// src/local/Bare.tsx — PanelFrame 없음. 라이브러리만 있는 대조군.
import { useEffect, useLayoutEffect, useReducer, useState } from 'react';
import { createProbe } from '@harbor/contract';

export const Bare = ({ slot }: { slot: string }) => {
  const [probe] = useState(() => createProbe(slot, { remote: 'shell', kind: 'local', build: __LAB_BUILD_STAMP__ }));
  const [text, setText] = useState('');
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useLayoutEffect(() => { probe.mounted(); return () => probe.unmounted(); }, [probe]);
  useEffect(() => {
    const onProbe = (e: Event) => { if ((e as CustomEvent<{ slot: string }>).detail?.slot === slot) rerender(); };
    window.addEventListener('harbor:probe', onProbe);
    rerender();
    return () => window.removeEventListener('harbor:probe', onProbe);
  }, [slot]);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div data-drag-handle data-testid={`handle-${slot}`} style={{ flex: '0 0 24px', background: '#eee', fontSize: 12, padding: '0 6px' }}>
        {slot} · <output data-testid={`status-${slot}`}>c{Number(probe.state.mounts ?? 0)}</output>
      </div>
      <input data-testid={`${slot}-input`} value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
};
