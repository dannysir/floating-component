import type { LayoutNode, PanelNode, SplitDirection } from "../types";

export const splitPanelAtId = (
  tree: LayoutNode,
  panelId: string,
  direction: SplitDirection,
  newPanel: PanelNode,
): LayoutNode => {
  const recurse = (
    node: LayoutNode,
    parent: LayoutNode | null,
  ): LayoutNode => {
    if (node.type === "panel") {
      if (node.id !== panelId) return node;
      if (parent && parent.type === "split" && parent.direction === direction) {
        return node;
      }
      return {
        type: "split",
        direction,
        size: node.size,
        children: [{ ...node, size: 1 }, { ...newPanel, size: 1 }],
      };
    }

    const targetIndex = node.children.findIndex(
      (c) => c.type === "panel" && c.id === panelId,
    );
    if (targetIndex !== -1 && node.direction === direction) {
      const newChildren = [...node.children];
      newChildren.splice(targetIndex + 1, 0, { ...newPanel, size: 1 });
      return { ...node, children: newChildren };
    }

    return {
      ...node,
      children: node.children.map((child) => recurse(child, node)),
    };
  };

  return recurse(tree, null);
};
