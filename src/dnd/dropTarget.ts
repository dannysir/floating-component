import type { DropPosition, LayoutDirection } from "../tree/types";
import { COMPLEX, HORIZONTAL, VERTICAL, LEFT, RIGHT, TOP, BOTTOM } from "../tree/constants";

const ROOT_EDGE_RATIO = 0.05;
const SPLIT_EDGE_RATIO = 0.15;

const ALL_EDGES: readonly DropPosition[] = [LEFT, RIGHT, TOP, BOTTOM];
const HORIZONTAL_EDGES: readonly DropPosition[] = [LEFT, RIGHT];
const VERTICAL_EDGES: readonly DropPosition[] = [TOP, BOTTOM];

const allowedEdgesFor = (direction: LayoutDirection): readonly DropPosition[] => {
  if (direction === HORIZONTAL) return HORIZONTAL_EDGES;
  if (direction === VERTICAL) return VERTICAL_EDGES;
  return ALL_EDGES;
};

const getNearestEdge = (
  clientX: number,
  clientY: number,
  el: HTMLElement,
  allowed: readonly DropPosition[],
): { position: DropPosition; dist: number } => {
  const rect = el.getBoundingClientRect();
  const dists: Record<DropPosition, number> = {
    left: (clientX - rect.left) / rect.width,
    right: (rect.right - clientX) / rect.width,
    top: (clientY - rect.top) / rect.height,
    bottom: (rect.bottom - clientY) / rect.height,
  };
  return allowed.reduce(
    (acc, pos) => (dists[pos] < acc.dist ? { position: pos, dist: dists[pos] } : acc),
    { position: allowed[0], dist: dists[allowed[0]] },
  );
};

export const getDropTarget = (
  clientX: number,
  clientY: number,
  panelEl: HTMLElement,
  direction: LayoutDirection = COMPLEX,
): { position: DropPosition; depth: number } => {
  const allowed = allowedEdgesFor(direction);
  const splitEls: HTMLElement[] = [];
  let rootEl: HTMLElement | null = null;
  let cur: HTMLElement | null = panelEl.parentElement;
  while (cur) {
    if (cur.hasAttribute("data-tree-root")) {
      rootEl = cur;
      break;
    }
    if (cur.hasAttribute("data-layout-split")) {
      splitEls.push(cur);
    }
    cur = cur.parentElement;
  }

  if (rootEl) {
    const { position, dist } = getNearestEdge(clientX, clientY, rootEl, allowed);
    if (dist < ROOT_EDGE_RATIO) {
      return { position, depth: splitEls.length + 1 };
    }
  }

  for (let i = splitEls.length - 1; i >= 0; i--) {
    const { position, dist } = getNearestEdge(clientX, clientY, splitEls[i], allowed);
    if (dist < SPLIT_EDGE_RATIO) {
      return { position, depth: i + 1 };
    }
  }

  const { position } = getNearestEdge(clientX, clientY, panelEl, allowed);
  return { position, depth: 0 };
};
