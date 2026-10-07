import * as React from 'react';
import { useLayoutEffect, useState } from 'react';
import type { DragEvent } from 'react';
import type { PanelProps } from '@harbor/contract';
import { createProbe, ensureStyle } from '@harbor/contract';

// 출하 칸반 (Fulfilment 팀). 카드는 자체 HTML5 드래그 앤 드롭을 쓴다. 핸들러는 stopPropagation을 호출하지 않는다(흔한 구현 그대로).
// 겨냥: H-FOREIGN-DRAG, H-DROP-HIJACK, H-REMOUNT (doc/qa/mfa/ARCHITECTURE.md 「앱 목록」 mfe-board)

const CARD_TYPE = 'application/x-harbor-card';
const COPY_TYPE = 'application/x-harbor-copy';
const ROWS = Array.from({ length: 100 }, (_, i) => i);
const INITIAL: string[][] = [['c1', 'c2'], ['c3', 'c4'], ['c5', 'c6']];
const COLUMN_TITLES = ['picking', 'packing', 'shipped'];
const CSS = `[data-mfe="board"] .col { flex: 1; min-height: 80px; border: 1px dashed var(--hb-border, #d0d7de); padding: 4px; }
[data-mfe="board"] .card { padding: 4px; margin: 2px 0; background: #f6f8fa; border: 1px solid #d0d7de; cursor: grab; }`;
const SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#0969da"/></svg>')}`;

interface Dnd {
  cardMoves: number;
  zoneDrops: number;
  copyDrops: number;
  lastDragend: { dropEffect: string; effectAllowed: string } | null;
  lastTypes: string[];
}
const EMPTY_DND: Dnd = { cardMoves: 0, zoneDrops: 0, copyDrops: 0, lastDragend: null, lastTypes: [] };

type FcWindow = Window & { __fc?: { reactRef?: { createElement?: unknown } } };
const reactSame = (): boolean | null => {
  const fc = (window as FcWindow).__fc;
  return fc ? fc.reactRef?.createElement === React.createElement : null;   // 단독 페이지에서는 null
};

export const Panel = ({ slot }: PanelProps) => {
  const [probe] = useState(() => {
    const p = createProbe(slot, { remote: 'board', build: __LAB_BUILD_STAMP__, reactVersion: React.version, reactSame: reactSame() });
    if (!p.state.dnd) p.set({ dnd: EMPTY_DND });
    return p;
  });
  const [text, setText] = useState('');
  const [count, setCount] = useState(0);
  const [columns, setColumns] = useState<string[][]>(INITIAL);

  useLayoutEffect(() => {
    probe.mounted();
    return () => probe.unmounted();
  }, [probe]);
  useLayoutEffect(() => { ensureStyle('board', CSS); }, []);

  const dnd = (): Dnd => (probe.state.dnd as Dnd | undefined) ?? EMPTY_DND;
  const patchDnd = (patch: Partial<Dnd>) => probe.set({ dnd: { ...dnd(), ...patch } });
  const typesOf = (e: DragEvent) => Array.from(e.dataTransfer.types);
  const onDragEnd = (e: DragEvent) => patchDnd({ lastDragend: { dropEffect: e.dataTransfer.dropEffect, effectAllowed: e.dataTransfer.effectAllowed } });

  // 드롭이 성공하면 카드가 다른 열로 옮겨져 원본 노드가 분리되고, 분리된 노드의 dragend는 React 루트까지 오지 않는다.
  // 그래서 원본 노드 자체에 네이티브 리스너를 건다(React onDragEnd만으로는 lastDragend가 null로 남는다).
  const onCardDragStart = (id: string) => (e: DragEvent) => {
    e.dataTransfer.setData(CARD_TYPE, id);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.addEventListener('dragend', (ev) => {
      const dt = (ev as globalThis.DragEvent).dataTransfer;
      if (!(ev.target as Node).isConnected && dt) patchDnd({ lastDragend: { dropEffect: dt.dropEffect, effectAllowed: dt.effectAllowed } });
    }, { once: true });
  };
  const onColDragOver = (e: DragEvent) => {
    const types = typesOf(e);
    patchDnd({ lastTypes: types });
    if (!types.includes(CARD_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onColDrop = (col: number) => (e: DragEvent) => {
    const id = e.dataTransfer.getData(CARD_TYPE);
    patchDnd({ zoneDrops: dnd().zoneDrops + 1, lastTypes: typesOf(e) });
    if (!id) return;
    e.preventDefault();
    setColumns((prev) => prev.map((cards, i) => {
      const without = cards.filter((c) => c !== id);
      return i === col ? [...without, id] : without;
    }));
    patchDnd({ cardMoves: dnd().cardMoves + 1 });
  };
  const onCopyDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(COPY_TYPE, '1');
    e.dataTransfer.effectAllowed = 'copy';
  };
  const onCopyZoneOver = (e: DragEvent) => {
    const types = typesOf(e);
    patchDnd({ lastTypes: types });
    if (!types.includes(COPY_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onCopyZoneDrop = (e: DragEvent) => {
    if (!typesOf(e).includes(COPY_TYPE)) return;
    e.preventDefault();
    patchDnd({ copyDrops: dnd().copyDrops + 1 });
  };

  return (
    <div data-mfe="board" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: 4, boxSizing: 'border-box', color: 'var(--hb-fg, #1f2328)' }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input data-testid={`${slot}-input`} placeholder="filter" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="button" data-testid={`${slot}-counter`} onClick={() => setCount((c) => c + 1)}>count {count}</button>
        <img data-testid={`${slot}-img`} src={SVG} alt="route" width={24} height={24} onDragEnd={onDragEnd} />
        <a data-testid={`${slot}-link`} href="#board-link" onDragEnd={onDragEnd}>route link</a>
        <span data-testid={`${slot}-copy-src`} draggable onDragStart={onCopyDragStart} onDragEnd={onDragEnd} style={{ padding: '2px 6px', border: '1px solid #999', cursor: 'copy' }}>copy</span>
        <span data-testid={`${slot}-copy-zone`} onDragOver={onCopyZoneOver} onDrop={onCopyZoneDrop} style={{ padding: '2px 6px', border: '1px dashed #999' }}>drop copy</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {columns.map((cards, i) => (
          <div key={COLUMN_TITLES[i]} className="col" data-testid={`${slot}-col-${i}`} onDragOver={onColDragOver} onDrop={onColDrop(i)}>
            <strong>{COLUMN_TITLES[i]}</strong>
            {cards.map((id) => (
              <div key={id} className="card" draggable data-testid={`${slot}-card-${id}`} onDragStart={onCardDragStart(id)} onDragEnd={onDragEnd}>
                shipment {id}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div data-testid={`${slot}-scroll`} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {ROWS.map((n) => <div key={n} style={{ height: 20 }}>dock event {n}</div>)}
      </div>
    </div>
  );
};
