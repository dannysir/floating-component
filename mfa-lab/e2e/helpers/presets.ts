// 레이아웃 프리셋의 기대 JSON (doc/qa/mfa/ARCHITECTURE.md 「레이아웃 프리셋」). shell 코드와 독립된 오라클로 둔다.
export type PresetName = 'census' | 'locks' | 'row3' | 'pair' | 'workbench';

export interface PanelJson { type: 'panel'; id: string; size: number; componentKey: string; [k: string]: unknown }
export interface SplitJson { type: 'split'; direction: 'horizontal' | 'vertical'; size: number; children: NodeJson[]; [k: string]: unknown }
export type NodeJson = PanelJson | SplitJson;

const NAV = { minWidth: 200, maxWidth: 200, draggable: false, droppable: false, resizable: false };

export const PRESETS: Record<PresetName, NodeJson> = {
  census: { type: 'split', direction: 'horizontal', size: 1, children: [
    { type: 'panel', id: 'p-a', size: 1, componentKey: 'control-a' },
    { type: 'split', direction: 'vertical', size: 1, children: [
      { type: 'panel', id: 'p-b', size: 1, componentKey: 'control-b' },
      { type: 'panel', id: 'p-c', size: 1, componentKey: 'control-c' }] },
    { type: 'panel', id: 'p-d', size: 1, componentKey: 'control-d' }] },
  locks: { type: 'split', direction: 'horizontal', size: 1, children: [
    { type: 'panel', id: 'nav', size: 1, componentKey: 'nav', ...NAV },
    { type: 'panel', id: 'editor', size: 2, componentKey: 'control-a' },
    { type: 'split', direction: 'vertical', size: 2, children: [
      { type: 'panel', id: 'terminal', size: 1, componentKey: 'control-b' },
      { type: 'panel', id: 'output', size: 1, componentKey: 'control-c' }] }] },
  row3: { type: 'split', direction: 'horizontal', size: 1, children: [
    { type: 'panel', id: 'p-a', size: 1, componentKey: 'control-a' },
    { type: 'panel', id: 'p-b', size: 1, componentKey: 'control-b' },
    { type: 'panel', id: 'p-c', size: 1, componentKey: 'control-c' }] },
  pair: { type: 'split', direction: 'horizontal', size: 1, children: [
    { type: 'panel', id: 'p-a', size: 1, componentKey: 'control-a' },
    { type: 'panel', id: 'p-b', size: 1, componentKey: 'control-b' }] },
  workbench: { type: 'split', direction: 'horizontal', size: 1, children: [
    { type: 'panel', id: 'nav', size: 1, componentKey: 'nav', ...NAV },
    { type: 'panel', id: 'orders', size: 3, componentKey: 'orders', minWidth: 320 },
    { type: 'split', direction: 'vertical', size: 3, children: [
      { type: 'split', direction: 'horizontal', size: 2, children: [
        { type: 'panel', id: 'board', size: 1, componentKey: 'board' },
        { type: 'panel', id: 'billing', size: 1, componentKey: 'billing' }] },
      { type: 'split', direction: 'horizontal', size: 1, minHeight: 160, children: [
        { type: 'panel', id: 'telemetry', size: 1, componentKey: 'telemetry' },
        { type: 'panel', id: 'telemetry-x', size: 1, componentKey: 'telemetry-x' }] }] }] },
};

// 슬롯 지정 쿼리 키 → 패널 id
export const SLOT_PARAMS: Record<PresetName, Record<string, string>> = {
  census: { a: 'p-a', b: 'p-b', c: 'p-c', d: 'p-d' },
  locks: { editor: 'editor', terminal: 'terminal', output: 'output' },
  row3: { a: 'p-a', b: 'p-b', c: 'p-c' },
  pair: { a: 'p-a', b: 'p-b' },
  workbench: {},
};

export const RESIZER_COUNT: Record<PresetName, number> = { census: 3, locks: 2, row3: 2, pair: 1, workbench: 4 };

const mapPanels = (n: NodeJson, fn: (p: PanelJson) => PanelJson): NodeJson =>
  n.type === 'panel' ? fn(n) : { ...n, children: n.children.map((c) => mapPanels(c, fn)) };

export const presetWithSlots = (layout: PresetName, slots: Record<string, string> = {}): NodeJson => {
  const byPanel = new Map(Object.entries(slots).map(([k, slot]) => [SLOT_PARAMS[layout][k], slot]));
  return mapPanels(PRESETS[layout], (p) => (byPanel.has(p.id) ? { ...p, componentKey: byPanel.get(p.id) ?? p.componentKey } : p));
};

export const panelsOf = (n: NodeJson): PanelJson[] => (n.type === 'panel' ? [n] : n.children.flatMap(panelsOf));
