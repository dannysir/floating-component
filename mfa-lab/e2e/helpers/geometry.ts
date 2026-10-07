import type { Page } from '@playwright/test';

export interface Point { x: number; y: number }
export type DropPosition = 'left' | 'right' | 'top' | 'bottom';
import { harnessError } from './errors';
export { harnessError };

// ── 페이지 안에서 실행되는 함수들. 바깥 변수를 참조하지 않는다 (page.evaluate가 직렬화한다). ──

// 렌더 구조를 중첩 표기로: H[...] = flex-direction row, V[...] = column (LayoutNodeRenderer.tsx:126-129), 패널은 id.
export const readDomTree = (): string => {
  const root = document.querySelector('[data-testid="workspace"] [data-tree-root]') ?? document.querySelector('[data-tree-root]');
  if (!root) return '';
  const walk = (el: Element): string => {
    if (el.hasAttribute('data-panel-id')) return el.getAttribute('data-panel-id') ?? '?';
    if (el.hasAttribute('data-layout-split')) {
      const dir = getComputedStyle(el).flexDirection === 'row' ? 'H' : 'V';
      const kids = Array.from(el.children).filter((c) => !c.classList.contains('ftl-resizer')).map(walk);
      return `${dir}[${kids.join(',')}]`;
    }
    return '?';
  };
  const first = Array.from(root.children).find((c) => c.hasAttribute('data-layout-split') || c.hasAttribute('data-panel-id'));
  return first ? walk(first) : '';
};

// dropTarget.ts:36-73 의 재구현 + 앵커 rect 격자 탐색. 한 번의 evaluate로 끝낸다.
const findDropPointInPage = (args: { anchorId: string; position: string; depth: number; step: number }) => {
  const ROOT_EDGE_RATIO = 0.05;   // dropTarget.ts:4
  const SPLIT_EDGE_RATIO = 0.15;  // dropTarget.ts:5
  const EDGES = ['left', 'right', 'top', 'bottom'] as const;   // direction 'complex' → ALL_EDGES (dropTarget.ts:7, 14)
  const nearest = (x: number, y: number, el: Element) => {       // dropTarget.ts:17-34
    const r = el.getBoundingClientRect();
    const d = { left: (x - r.left) / r.width, right: (r.right - x) / r.width, top: (y - r.top) / r.height, bottom: (r.bottom - y) / r.height };
    return EDGES.reduce((acc, p) => (d[p] < acc.dist ? { position: p, dist: d[p] } : acc), { position: EDGES[0], dist: d[EDGES[0]] });
  };
  const panel = document.querySelector(`[data-tree-root] [data-panel-id="${CSS.escape(args.anchorId)}"]`) as HTMLElement | null;
  if (!panel) return { error: `no panel ${args.anchorId}` };
  const splits: Element[] = [];
  let root: Element | null = null;
  let cur = panel.parentElement;
  while (cur) {                                                  // dropTarget.ts:45-55
    if (cur.hasAttribute('data-tree-root')) { root = cur; break; }
    if (cur.hasAttribute('data-layout-split')) splits.push(cur);
    cur = cur.parentElement;
  }
  const classify = (x: number, y: number) => {
    if (root) { const n = nearest(x, y, root); if (n.dist < ROOT_EDGE_RATIO) return { position: n.position, depth: splits.length + 1 }; }   // :57-62
    for (let i = splits.length - 1; i >= 0; i--) { const n = nearest(x, y, splits[i]); if (n.dist < SPLIT_EDGE_RATIO) return { position: n.position, depth: i + 1 }; }   // :64-69
    return { position: nearest(x, y, panel).position, depth: 0 };   // :71-72
  };
  const r = panel.getBoundingClientRect();
  const hits: Array<[number, number]> = [];
  for (let y = r.top + 1; y < r.bottom - 1; y += args.step) {
    for (let x = r.left + 1; x < r.right - 1; x += args.step) {
      const c = classify(x, y);
      if (c.position === args.position && c.depth === args.depth) hits.push([x, y]);
    }
  }
  if (!hits.length) return { error: 'no matching region', rect: r.toJSON() };
  const xs = hits.map((h) => h[0]); const ys = hits.map((h) => h[1]);
  const box = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  // 영역 중심에서 가장 가까운 적중점을 고른다 (중심 자체는 비볼록 영역 밖일 수 있다)
  const cx = (box.left + box.right) / 2; const cy = (box.top + box.bottom) / 2;
  const best = hits.reduce((a, h) => (Math.hypot(h[0] - cx, h[1] - cy) < Math.hypot(a[0] - cx, a[1] - cy) ? h : a), hits[0]);
  const under = document.elementFromPoint(best[0], best[1])?.closest('[data-panel-id]')?.getAttribute('data-panel-id') ?? null;
  return { x: best[0], y: best[1], width: box.right - box.left + args.step, height: box.bottom - box.top + args.step, under };
};

// ── 하네스 쪽 ──

export const domTree = (page: Page): Promise<string> => page.evaluate(readDomTree);

export const dropPoint = async (page: Page, anchorId: string, position: DropPosition, depth: number): Promise<Point> => {
  const res = await page.evaluate(findDropPointInPage, { anchorId, position, depth, step: 2 });
  if ('error' in res) throw harnessError(`dropPoint(${anchorId}, ${position}, ${depth}): ${res.error}`);
  if (res.width < 4 || res.height < 4) throw harnessError(`dropPoint(${anchorId}, ${position}, ${depth}): band ${res.width}x${res.height}px is under 4px`);
  if (res.under !== anchorId) throw harnessError(`dropPoint: elementFromPoint gives ${res.under}, not ${anchorId}`);
  return { x: res.x, y: res.y };
};

export const underCursor = (page: Page, x: number, y: number) =>
  page.evaluate(([px, py]) => {
    const el = document.elementFromPoint(px, py);
    const panel = el?.closest('[data-panel-id]');
    return {
      panelId: panel?.getAttribute('data-panel-id') ?? null,
      droppable: panel ? panel.getAttribute('data-panel-droppable') !== 'false' : false,   // PanelNodeRenderer.tsx:142
      isIframe: el?.tagName === 'IFRAME',
      tag: el?.tagName ?? '',
      testid: el?.closest('[data-testid]')?.getAttribute('data-testid') ?? null,
    };
  }, [x, y] as const);

export const handlePoint = async (page: Page, slot: string): Promise<Point> => {
  const loc = page.locator(`[data-tree-root] [data-testid="handle-${slot}"]`);
  const box = await loc.boundingBox();                                         // ghost(body 바로 아래)는 [data-tree-root] 밖이라 제외된다
  if (!box) throw harnessError(`handlePoint: no handle for slot ${slot}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

export const panelRect = async (page: Page, panelId: string) => {
  const box = await page.locator(`[data-tree-root] [data-panel-id="${panelId}"]`).boundingBox();
  if (!box) throw harnessError(`panelRect: no panel ${panelId}`);
  return box;
};

export interface Rect { x: number; y: number; width: number; height: number }

interface TreeNodeLike { type: string; id?: string; direction?: string; children?: TreeNodeLike[] }

// LayoutNode JSON → domTree와 같은 표기 (I5용)
export const treeNotation = (tree: TreeNodeLike | null): string => {
  if (!tree) return '';
  if (tree.type === 'panel') return tree.id ?? '?';
  return `${tree.direction === 'horizontal' ? 'H' : 'V'}[${(tree.children ?? []).map(treeNotation).join(',')}]`;
};

// .ftl-resizer 중 두 패널 rect 사이에 놓인 것을 기하로 찾는다. 없으면 null.
export const resizerBetween = async (page: Page, idA: string, idB: string): Promise<{ rect: Rect; axis: 'x' | 'y' } | null> =>
  page.evaluate(([a, b]) => {
    const ra = document.querySelector(`[data-tree-root] [data-panel-id="${CSS.escape(a)}"]`)?.getBoundingClientRect();
    const rb = document.querySelector(`[data-tree-root] [data-panel-id="${CSS.escape(b)}"]`)?.getBoundingClientRect();
    if (!ra || !rb) return null;
    const resizers = Array.from(document.querySelectorAll('[data-tree-root] .ftl-resizer')).map((el) => ({ r: el.getBoundingClientRect(), h: el.classList.contains('ftl-resizer--horizontal') }));
    const overlap = (a1: number, a2: number, b1: number, b2: number) => Math.min(a2, b2) - Math.max(a1, b1);
    const hit = resizers.find(({ r, h }) => {
      if (h) {
        const [left, right] = ra.left < rb.left ? [ra, rb] : [rb, ra];
        return Math.abs(r.left - left.right) <= 1 && Math.abs(r.right - right.left) <= 1 && overlap(r.top, r.bottom, left.top, left.bottom) > 0 && overlap(r.top, r.bottom, right.top, right.bottom) > 0;
      }
      const [top, bottom] = ra.top < rb.top ? [ra, rb] : [rb, ra];
      return Math.abs(r.top - top.bottom) <= 1 && Math.abs(r.bottom - bottom.top) <= 1 && overlap(r.left, r.right, top.left, top.right) > 0 && overlap(r.left, r.right, bottom.left, bottom.right) > 0;
    });
    return hit ? { rect: { x: hit.r.x, y: hit.r.y, width: hit.r.width, height: hit.r.height }, axis: (hit.h ? 'x' : 'y') as 'x' | 'y' } : null;
  }, [idA, idB] as const);
