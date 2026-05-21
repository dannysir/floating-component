# @dannysir/floating-components

[한국어 README](./README.ko.md) · [Live Demo](https://dannysir-labs.vercel.app/en/libraries/floating-components) · [API Reference](./doc/API.md)

Tree-based resizable and reorderable panel layout for React. Split panels horizontally or vertically, resize borders by dragging, and reorder panels via drag and drop — just like VS Code or any modern IDE.

<img src="doc/assets/layout-overview.png" alt="Layout overview" width="640" />

---

## Features

- **N-ary tree structure** — `SplitNode` can hold two or more children, keeping the tree flat without unnecessary nesting
- **Border drag resize** — drag panel borders to resize (requestAnimationFrame optimized)
- **Drag-and-drop panel move** — reorder panels via HTML5 Drag & Drop API
- **Multi-level drop target** — distinguishes panel edge, parent split edge, and root edge for depth-aware placement
- **Immutable state** — all tree updates produce new objects via spread
- **View / State separation** — `TreeLayout` (rendering) and `useLayoutTree` (state) can be used independently
- **TypeScript** — full type declarations included
- **ESM + CJS** — dual-format bundle output

---

## Installation

```bash
npm install @dannysir/floating-components
```

> **Peer dependencies**: `react >= 18`

---

## Quick Start

```tsx
import { TreeLayout, useLayoutTree, type LayoutNode } from "@dannysir/floating-components";

const initialTree: LayoutNode = {
  type: "split",
  direction: "horizontal",
  size: 1,
  children: [
    {
      type: "panel",
      id: "panel-a",
      size: 1,
      component: <div style={{ padding: 16, background: "#dbeafe", height: "100%" }}>Panel A</div>,
    },
    {
      type: "split",
      direction: "vertical",
      size: 1,
      children: [
        {
          type: "panel",
          id: "panel-b",
          size: 1,
          component: <div style={{ padding: 16, background: "#dcfce7", height: "100%" }}>Panel B</div>,
        },
        {
          type: "panel",
          id: "panel-c",
          size: 1,
          component: <div style={{ padding: 16, background: "#ffedd5", height: "100%" }}>Panel C</div>,
        },
      ],
    },
  ],
};

const App = () => {
  const { tree, resizeBorder, movePanel } = useLayoutTree(initialTree);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <TreeLayout tree={tree} onResizeBorder={resizeBorder} onMovePanel={movePanel} />
    </div>
  );
};
```

> `TreeLayout` fills its parent by default (`width: 100%`, `height: 100%`). Use a sized parent as above, or pass `width`/`height` props to set explicit dimensions.

---

## Recipes

### Toggle panel visibility

```tsx
const { panelIds, removePanel, insertPanel } = useLayoutTree(initialTree);

const togglePanel = (id: string, component: ReactNode) => {
  if (panelIds.includes(id)) {
    removePanel(id);
  } else {
    insertPanel({ panel: { id, component } });
  }
};
```

---

## Drag & Drop

Drag any panel to reorder. A translucent preview of the drop target follows the cursor, and dropping near different regions produces different placements:

<img width="1280" height="735" alt="ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/6d2ae844-8c40-4c7a-a879-a856741b3160" />

- Drop on the **panel center** → split the hovered panel
- Drop near the **enclosing split's edge** → place as a sibling of the parent split
- Drop near the **root's edge** → place at the top level

### Restrict to a single axis

By default `TreeLayout` uses 4-edge classification (`direction="complex"`). Pass `direction` to lock the layout to one axis:

```tsx
<TreeLayout
  tree={tree}
  direction="vertical"
  onResizeBorder={resizeBorder}
  onMovePanel={movePanel}
/>
```

- `"vertical"` — drops classified by the Y midline (top/bottom only); only vertical splits are produced
- `"horizontal"` — drops classified by the X midline (left/right only); only horizontal splits are produced
- `"complex"` *(default)* — 4-edge classification with both axes

If the input `tree` contains splits whose direction conflicts with the prop, they are auto-normalized and a dev-mode console warning is emitted. `useLayoutTree.splitPanel(...)` direct calls are not constrained.

See [API Reference → `direction`](./doc/API.md#props).

Wire it up with `useLayoutTree`'s `movePanel`:

```tsx
<TreeLayout tree={tree} onResizeBorder={resizeBorder} onMovePanel={movePanel} />
```

See [API Reference → Drag & Drop](./doc/API.md#drag--drop) for the full placement rules and the `depth` parameter.

---

## Documentation

- **[API Reference](./doc/API.md)** — full props, hook return values, tree utilities, types
- **[CHANGELOG](./CHANGELOG.md)**

---

## License

ISC
