import type { LayoutNode } from "../types";

export const getRootPanelId = (tree: LayoutNode): string | null => {
  if (tree.type === "panel") return tree.id;
  for (const child of tree.children) {
    const id = getRootPanelId(child);
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
