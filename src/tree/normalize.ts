import type { LayoutNode, LayoutDirection, SplitDirection } from "./types";
import { COMPLEX, HORIZONTAL, VERTICAL } from "./constants";

export const normalizeTreeDirection = (
  tree: LayoutNode,
  direction: LayoutDirection,
): { tree: LayoutNode; changed: boolean } => {
  if (direction === COMPLEX) return { tree, changed: false };
  const target: SplitDirection = direction === HORIZONTAL ? HORIZONTAL : VERTICAL;
  let changed = false;

  const walk = (node: LayoutNode): LayoutNode => {
    if (node.type === "panel") return node;
    const newChildren = node.children.map(walk);
    const childrenChanged = newChildren.some((c, i) => c !== node.children[i]);
    if (node.direction !== target) {
      changed = true;
      return { ...node, direction: target, children: newChildren };
    }
    return childrenChanged ? { ...node, children: newChildren } : node;
  };

  return { tree: walk(tree), changed };
};
