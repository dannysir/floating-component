import * as React from 'react';
import { useLayoutEffect, useState } from 'react';
import type { PanelProps } from '@harbor/contract';
import { createProbe, ensureStyle } from '@harbor/contract';

const ROWS = Array.from({ length: 200 }, (_, i) => i);
const CSS = `[data-mfe="orders"] table { min-width: 480px; border-collapse: collapse; } [data-mfe="orders"] td { padding: 2px 6px; }`;

type FcWindow = Window & { __fc?: { reactRef?: { createElement?: unknown } } };
// 함수 참조를 비교한다. 네임스페이스 객체는 번들마다 달라서 비교할 수 없다.
const reactSame = (): boolean | null => {
  const fc = (window as FcWindow).__fc;
  return fc ? fc.reactRef?.createElement === React.createElement : null;   // 단독 페이지에서는 null
};

export const Panel = ({ slot, bus }: PanelProps) => {
  // 슬롯당 한 번. 다시 만들어도 같은 프로브가 돌아온다. kind는 넘기지 않는다: twin 래퍼가 'local'로, 그 밖에는 기본 'same-tree'.
  const [probe] = useState(() =>
    createProbe(slot, { remote: 'orders', build: __LAB_BUILD_STAMP__, reactVersion: React.version, reactSame: reactSame() }),
  );
  const [text, setText] = useState('');
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('all');

  useLayoutEffect(() => {
    probe.mounted();                                   // layout effect: settle 뒤에 읽어도 값이 확정돼 있다
    return () => probe.unmounted();
  }, [probe]);
  useLayoutEffect(() => { ensureStyle('orders', CSS); }, []);

  return (
    <div data-mfe="orders" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: 4, boxSizing: 'border-box', color: 'var(--hb-fg, #1f2328)' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input data-testid={`${slot}-input`} placeholder="search" value={text} onChange={(e) => setText(e.target.value)} />
        <select data-testid={`${slot}-select`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">all</option><option value="open">open</option><option value="paid">paid</option>
        </select>
        <button type="button" data-testid={`${slot}-counter`} onClick={() => setCount((c) => c + 1)}>count {count}</button>
      </div>
      <div data-testid={`${slot}-scroll`} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <table>
          <tbody>
            {ROWS.map((n) => (
              <tr key={n} data-testid={`${slot}-row-${n}`} onClick={() => bus.publish('order:selected', { orderId: `ORD-${n}` })}>
                <td>ORD-{n}</td><td>customer {n % 17}</td><td>{n % 3 === 0 ? 'paid' : 'open'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
