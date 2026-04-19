import type { DropPosition } from "../types";
import { ROOT_EDGE_RATIO, SPLIT_EDGE_RATIO } from "../constants/dropTarget";

const getNearestEdge = (
  clientX: number,
  clientY: number,
  el: HTMLElement,
): { position: DropPosition; dist: number } => {
  const rect = el.getBoundingClientRect();
  const dists: Record<DropPosition, number> = {
    left: (clientX - rect.left) / rect.width,
    right: (rect.right - clientX) / rect.width,
    top: (clientY - rect.top) / rect.height,
    bottom: (rect.bottom - clientY) / rect.height,
  };
  const position = (Object.keys(dists) as DropPosition[]).reduce((a, b) =>
    dists[a] < dists[b] ? a : b,
  );
  return { position, dist: dists[position] };
};

export const getDropTarget = (
  clientX: number,
  clientY: number,
  panelEl: HTMLElement,
): { position: DropPosition; depth: number } => {
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
    const { position, dist } = getNearestEdge(clientX, clientY, rootEl);
    if (dist < ROOT_EDGE_RATIO) {
      return { position, depth: splitEls.length + 1 };
    }
  }

  for (let i = splitEls.length - 1; i >= 0; i--) {
    const { position, dist } = getNearestEdge(clientX, clientY, splitEls[i]);
    if (dist < SPLIT_EDGE_RATIO) {
      return { position, depth: i + 1 };
    }
  }

  const { position } = getNearestEdge(clientX, clientY, panelEl);
  return { position, depth: 0 };
};
