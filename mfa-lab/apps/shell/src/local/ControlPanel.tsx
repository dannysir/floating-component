// src/local/ControlPanel.tsx — 프로브 표면(input, 100행 스크롤, 카운터 버튼)
import * as React from 'react';
import { useLayoutEffect, useState } from 'react';
import { createProbe } from '@harbor/contract';

type FcWindow = Window & { __fc?: { reactRef: { createElement: unknown } } };
const reactSameAsHost = () => {
  const fc = (window as FcWindow).__fc;
  return fc ? fc.reactRef.createElement === React.createElement : null;
};

const ROWS = Array.from({ length: 100 }, (_, i) => i);

export const ControlPanel = ({ slot }: { slot: string }) => {
  const [probe] = useState(() => createProbe(slot, { remote: 'shell', kind: 'local', build: __LAB_BUILD_STAMP__, reactVersion: React.version, reactSame: reactSameAsHost() }));
  const [text, setText] = useState('');
  const [count, setCount] = useState(0);
  useLayoutEffect(() => { probe.mounted(); return () => probe.unmounted(); }, [probe]);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: 4, boxSizing: 'border-box' }}>
      <input data-testid={`${slot}-input`} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" data-testid={`${slot}-counter`} onClick={() => setCount((c) => c + 1)}>count {count}</button>
      <div data-testid={`${slot}-scroll`} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {ROWS.map((n) => <div key={n} style={{ height: 20 }}>row {n}</div>)}
      </div>
    </div>
  );
};
