import type { LayoutNode, PanelNode, SplitNode } from "../types";

export const getFirstPanelId = (tree: LayoutNode): string | null => {
  if (tree.type === "panel") return tree.id;
  for (const child of tree.children) {
    const id = getFirstPanelId(child);
    if (id !== null) return id;
  }
  return null;
};

export const getPanelIds = (tree: LayoutNode): string[] => {
  const ids: string[] = [];
  const walk = (node: LayoutNode): void => {
    if (node.type === "panel") {
      ids.push(node.id);
      return;
    }
    node.children.forEach(walk);
  };
  walk(tree);
  return ids;
};

type Ancestor = { split: SplitNode; childIndex: number };

export const findPanelWithAncestors = (
  root: LayoutNode,
  panelId: string,
): { panel: PanelNode; ancestors: Ancestor[] } | null => {
  const search = (
    node: LayoutNode,
    acc: Ancestor[],
  ): { panel: PanelNode; ancestors: Ancestor[] } | null => {
    if (node.type === "panel") {
      return node.id === panelId ? { panel: node, ancestors: acc } : null;
    }
    for (let i = 0; i < node.children.length; i++) {
      const found = search(node.children[i], [...acc, { split: node, childIndex: i }]);
      if (found) return found;
    }
    return null;
  };

  return search(root, []);
};
