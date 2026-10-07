import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { HarborBus, ProbeKind } from '@harbor/contract';
import { createProbe, ensureStyle } from '@harbor/contract';

const ROWS = Array.from({ length: 100 }, (_, i) => i);

// kind: billing(remote 모듈)과 control-mount는 모듈이 먼저 'mount'로 만들어 둔다. billing-local(twin)은 'local'을 넘긴다.
export const App = ({ slot, bus, kind }: { slot: string; bus: HarborBus; kind?: ProbeKind }) => {
  const [probe] = useState(() => createProbe(slot, { remote: 'billing', kind, build: __LAB_BUILD_STAMP__ }));
  const [text, setText] = useState('');
  const [count, setCount] = useState(0);
  const [range, setRange] = useState(40);
  const [lastOrder, setLastOrder] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => { probe.mounted(); return () => probe.unmounted(); }, [probe]);
  useLayoutEffect(() => { ensureStyle('billing', `[data-mfe="billing"] p { user-select: text; }`); }, []);
  useEffect(() => bus.subscribe('order:selected', (p) => setLastOrder(String((p as { orderId?: string })?.orderId ?? ''))), [bus]);
  useEffect(() => {
    const c = canvasRef.current?.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, 160, 40);
    c.fillStyle = '#0078d4';
    ROWS.slice(0, 32).forEach((i) => c.fillRect(i * 5, 40 - ((i * 7 + range) % 40), 4, 40));
  }, [range]);

  return (
    <div data-mfe="billing" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: 4, boxSizing: 'border-box' }}>
      <input data-testid={`${slot}-input`} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" data-testid={`${slot}-counter`} onClick={() => setCount((n) => n + 1)}>count {count}</button>
      <input type="range" data-testid={`${slot}-range`} min={0} max={100} value={range} onChange={(e) => setRange(Number(e.target.value))} />
      <canvas ref={canvasRef} data-testid={`${slot}-canvas`} width={160} height={40} />
      <p data-testid={`${slot}-last-order`}>last order: {lastOrder || '-'}</p>
      <div data-testid={`${slot}-scroll`} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {ROWS.map((n) => <div key={n} style={{ height: 20 }}>invoice {n}</div>)}
      </div>
    </div>
  );
};
