import type { LayoutNode, SplitNode } from "./types";

export const getNodeAtPath = (root: LayoutNode, path: number[]): LayoutNode | null => {
  let node = root;
  for (const idx of path) {
    if (node.type !== "split" || idx >= node.children.length) return null;
    node = node.children[idx];
  }
  return node;
};

export const updateAtPath = (
  root: LayoutNode,
  path: number[],
  updater: (node: LayoutNode) => LayoutNode,
): LayoutNode => {
  if (path.length === 0) return updater(root);
  if (root.type !== "split") return root;

  const [idx, ...rest] = path;
  return {
    ...root,
    children: root.children.map((child, i) =>
      i === idx ? updateAtPath(child, rest, updater) : child,
    ),
  };
};

export const findAndUpdate = (
  node: LayoutNode,
  panelId: string,
  updater: (node: LayoutNode, parent: SplitNode | null, index: number) => LayoutNode | null,
  parent: SplitNode | null = null,
  index: number = 0,
): LayoutNode | null => {
  if (node.type === "panel" && node.id === panelId) {
    return updater(node, parent, index);
  }
  if (node.type === "split") {
    const newChildren = node.children
      .map((child, i) => findAndUpdate(child, panelId, updater, node, i))
      .filter((child): child is LayoutNode => child !== null);

    if (newChildren.length === 0) return null;
    if (newChildren.length === 1) return newChildren[0];
    return { ...node, children: newChildren };
  }
  return node;
};
