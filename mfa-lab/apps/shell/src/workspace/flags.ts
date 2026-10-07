// URL 플래그 파싱. 정의: doc/qa/mfa/ARCHITECTURE.md 「핸들·잠금·URL 플래그」
import type { LayoutNode } from '@dannysir/floating-components';
import { collectKeys, collectPanelIds, isPreset, mapPanels, presets, slotParams } from './layouts';
import type { PresetName } from './layouts';

export interface Flags {
  layout: PresetName;
  drag: 'handle' | 'panel';
  iframeShield: boolean;
  persist: boolean;
  strict: boolean;
  initialTree: LayoutNode;
  persistKey: string;
}

export type FlagResult = { ok: true; flags: Flags } | { ok: false; error: string };

const LOCK_OPTIONS = new Set(['draggable', 'droppable', 'resizable']);

export const persistKeyOf = (layout: string) => `harbor.layout.${layout}.v1`;

const readPersisted = (key: string): LayoutNode | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LayoutNode) : null;      // 검증 없이 그대로 (미등록 키도 통과)
  } catch {
    return null;
  }
};

export const parseFlags = (search: string, isRegistered: (key: string) => boolean): FlagResult => {
  const q = new URLSearchParams(search);
  const layout = q.get('layout') ?? 'workbench';
  if (!isPreset(layout)) return { ok: false, error: `unknown layout "${layout}"` };

  const drag = q.get('drag') ?? 'handle';
  if (drag !== 'handle' && drag !== 'panel') return { ok: false, error: `unknown drag "${drag}"` };

  // 슬롯 지정: 쿼리에 적힌 슬롯은 등록돼 있어야 한다.
  const params = slotParams[layout];
  const assigned = Object.entries(params).filter(([key]) => q.has(key)).map(([key, panelId]) => ({ panelId, slot: q.get(key) ?? '' }));
  const unknownSlot = assigned.find((a) => !isRegistered(a.slot));
  if (unknownSlot) return { ok: false, error: `unregistered slot "${unknownSlot.slot}" for panel "${unknownSlot.panelId}"` };
  const bySlot = new Map(assigned.map((a) => [a.panelId, a.slot]));
  const withSlots = mapPanels(presets[layout](), (p) => (bySlot.has(p.id) ? { ...p, componentKey: bySlot.get(p.id) ?? p.componentKey } : p));

  // ?lock=<panelId>:<csv> (반복 가능)
  const ids = new Set(collectPanelIds(withSlots));
  const locks = q.getAll('lock').map((v) => {
    const [panelId, csv = ''] = v.split(':');
    return { panelId, opts: csv.split(',').filter(Boolean) };
  });
  const badLock = locks.find((l) => !ids.has(l.panelId) || l.opts.some((o) => !LOCK_OPTIONS.has(o)));
  if (badLock) return { ok: false, error: `bad lock "${badLock.panelId}:${badLock.opts.join(',')}"` };
  const locked = locks.reduce<LayoutNode>((tree, l) => mapPanels(tree, (p) => (p.id === l.panelId
    ? { ...p, ...Object.fromEntries(l.opts.map((o) => [o, false])) }
    : p)), withSlots);

  const keys = collectKeys(locked);
  const dup = keys.find((k, i) => keys.indexOf(k) !== i);
  if (dup) return { ok: false, error: `duplicate slot "${dup}"` };

  const persist = q.get('persist') === '1';
  const persistKey = persistKeyOf(layout);
  const initialTree = (persist && readPersisted(persistKey)) || locked;

  return {
    ok: true,
    flags: { layout, drag, iframeShield: q.get('iframeShield') === '1', persist, strict: q.get('strict') === '1', initialTree, persistKey },
  };
};
