// 레이아웃 프리셋. 필드 이름은 src/tree/types.ts:7-30의 PanelNode·SplitNode 그대로다.
// 정의: doc/qa/mfa/ARCHITECTURE.md 「레이아웃 프리셋」
import type { LayoutNode } from '@dannysir/floating-components';

export type PresetName = 'census' | 'locks' | 'row3' | 'pair' | 'workbench';

const panel = (id: string, componentKey: string, size = 1, extra: Record<string, unknown> = {}): LayoutNode =>
  ({ type: 'panel', id, size, componentKey, ...extra }) as LayoutNode;
const split = (direction: 'horizontal' | 'vertical', size: number, children: LayoutNode[], extra: Record<string, unknown> = {}): LayoutNode =>
  ({ type: 'split', direction, size, children, ...extra }) as LayoutNode;

const NAV_LOCK = { minWidth: 200, maxWidth: 200, draggable: false, droppable: false, resizable: false };

export const presets: Record<PresetName, () => LayoutNode> = {
  census: () => split('horizontal', 1, [
    panel('p-a', 'control-a'),
    split('vertical', 1, [panel('p-b', 'control-b'), panel('p-c', 'control-c')]),
    panel('p-d', 'control-d'),
  ]),
  locks: () => split('horizontal', 1, [
    panel('nav', 'nav', 1, NAV_LOCK),
    panel('editor', 'control-a', 2),
    split('vertical', 2, [panel('terminal', 'control-b'), panel('output', 'control-c')]),
  ]),
  row3: () => split('horizontal', 1, [panel('p-a', 'control-a'), panel('p-b', 'control-b'), panel('p-c', 'control-c')]),
  pair: () => split('horizontal', 1, [panel('p-a', 'control-a'), panel('p-b', 'control-b')]),
  workbench: () => split('horizontal', 1, [
    panel('nav', 'nav', 1, NAV_LOCK),
    panel('orders', 'orders', 3, { minWidth: 320 }),
    split('vertical', 3, [
      split('horizontal', 2, [panel('board', 'board'), panel('billing', 'billing')]),
      split('horizontal', 1, [panel('telemetry', 'telemetry'), panel('telemetry-x', 'telemetry-x')], { minHeight: 160 }),
    ]),
  ]),
};

// 슬롯 지정 쿼리 키 → 패널 id. 쿼리는 해당 패널의 componentKey만 바꾼다.
export const slotParams: Record<PresetName, Record<string, string>> = {
  census: { a: 'p-a', b: 'p-b', c: 'p-c', d: 'p-d' },
  locks: { editor: 'editor', terminal: 'terminal', output: 'output' },
  row3: { a: 'p-a', b: 'p-b', c: 'p-c' },
  pair: { a: 'p-a', b: 'p-b' },
  workbench: {},
};

export const isPreset = (name: string): name is PresetName => Object.prototype.hasOwnProperty.call(presets, name);

// 트리를 불변으로 고친다: 패널 하나에 patch를 적용한다.
export const mapPanels = (node: LayoutNode, fn: (p: Extract<LayoutNode, { type: 'panel' }>) => LayoutNode): LayoutNode =>
  node.type === 'panel' ? fn(node) : { ...node, children: node.children.map((c) => mapPanels(c, fn)) };

export const collectKeys = (node: LayoutNode): string[] =>
  node.type === 'panel' ? [node.componentKey] : node.children.flatMap(collectKeys);

export const collectPanelIds = (node: LayoutNode): string[] =>
  node.type === 'panel' ? [node.id] : node.children.flatMap(collectPanelIds);
