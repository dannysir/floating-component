# @dannysir/floating-components

[한국어 README](./README.ko.md) · [Live Demo](https://dannysir-labs.vercel.app/en/libraries/floating-components) · [API Reference](./doc/API.md)

Tree-based resizable and reorderable panel layout for React. Split panels horizontally or vertically, resize borders by dragging, and reorder panels via drag and drop — just like VS Code or any modern IDE.

<img src="doc/assets/layout-overview.png" alt="Layout overview" width="640" />

---

## What's New (0.5.0)

- Border resize migrated to Pointer Events — a single path for mouse, touch, and pen
- Touch panel drag — start from a handle or long-press (450ms), with a floating ghost tracking the finger
- Resizers always shown on touch devices (`@media (hover: none)`)

See the full history in the [changelog](./CHANGELOG.md).

---

## Features

- **N-ary tree structure** — `SplitNode` can hold two or more children, keeping the tree flat without unnecessary nesting
- **Border drag resize** — drag panel borders to resize (Pointer Events based, requestAnimationFrame optimized)
- **Panel size constraints** — set min/max with `minWidth`/`minHeight`/`maxWidth`/`maxHeight` (px); content scrolls when it overflows
- **Drag-and-drop panel move** — reorder panels via HTML5 Drag & Drop on desktop, and a long-press-based path on touch
- **Touch & pen support** — both border resize and panel drag work with touch and pen input (Pointer Events + a touch drag path)
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
import {
  TreeLayout,
  useLayoutTree,
  createComponentStore,
  type LayoutNode,
} from "@dannysir/floating-components";

// 1. Map string keys to the React nodes they render.
const store = createComponentStore({
  "panel-a": <div style={{ padding: 16, background: "#dbeafe", height: "100%" }}>Panel A</div>,
  "panel-b": <div style={{ padding: 16, background: "#dcfce7", height: "100%" }}>Panel B</div>,
  "panel-c": <div style={{ padding: 16, background: "#ffedd5", height: "100%" }}>Panel C</div>,
});

// 2. The tree stores only string componentKeys — no React elements.
const initialTree: LayoutNode = {
  type: "split",
  direction: "horizontal",
  size: 1,
  children: [
    { type: "panel", id: "panel-a", size: 1, componentKey: "panel-a" },
    {
      type: "split",
      direction: "vertical",
      size: 1,
      children: [
        { type: "panel", id: "panel-b", size: 1, componentKey: "panel-b" },
        { type: "panel", id: "panel-c", size: 1, componentKey: "panel-c" },
      ],
    },
  ],
};

const App = () => {
  const { tree, resizeBorder, movePanel } = useLayoutTree(initialTree);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <TreeLayout tree={tree} components={store} onResizeBorder={resizeBorder} onMovePanel={movePanel} />
    </div>
  );
};
```

> `TreeLayout` fills its parent by default (`width: 100%`, `height: 100%`). Use a sized parent as above, or pass `width`/`height` props to set explicit dimensions.

> The tree holds only primitive values (`id`, `size`, `direction`, `componentKey`), so `JSON.stringify(tree)` round-trips cleanly. See [Persistence](#persistence) below.

---

## Recipes

### Toggle panel visibility

```tsx
const { panelIds, removePanel, insertPanel } = useLayoutTree(initialTree);

const togglePanel = (id: string, componentKey: string) => {
  if (panelIds.includes(id)) {
    removePanel(id);
  } else {
    insertPanel({ panel: { id, componentKey } });
  }
};
```

### Panel min/max size

```tsx
// min/max width for a sidebar (child of a horizontal split)
{ type: "panel", id: "sidebar", size: 1, componentKey: "sidebar", minWidth: 240, maxWidth: 400 }
```

`minWidth`/`minHeight`/`maxWidth`/`maxHeight` (px) apply **only on the panel's split-direction axis** (horizontal split → width, vertical split → height). When content is larger than the panel it scrolls instead of being clipped. See [API → Panel size constraints](./doc/API.md#panel-size-constraints).

---

## Persistence

Because the tree contains only primitive values, you can save and restore the layout with plain `JSON.stringify` / `JSON.parse` — no custom serializer needed. The `ComponentStore` (the key → React node mapping) lives separately in your code, so it never needs to be serialized.

```tsx
const store = createComponentStore({
  sidebar: <Sidebar />,
  editor: <Editor />,
});

const STORAGE_KEY = "my-layout";

const load = (): LayoutNode => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? (JSON.parse(saved) as LayoutNode) : defaultTree;
};

const App = () => {
  const { tree, resizeBorder, movePanel } = useLayoutTree(load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  }, [tree]);

  return <TreeLayout tree={tree} components={store} onResizeBorder={resizeBorder} onMovePanel={movePanel} />;
};
```

On restore, the tree's `componentKey`s are looked up in the store. If a key isn't registered, the panel renders empty and a dev-mode console warning is emitted — so keep your store keys stable across releases.

> Create the store once and keep a stable reference (module-level or `useMemo`). Calling `register`/`unregister` mutates the internal `Map` but does **not** trigger a re-render — to change what's on screen dynamically, swap the tree (e.g. `setTree`) rather than relying on store mutation.

---

## Drag & Drop

Drag any panel to reorder. A translucent preview of the drop target follows the cursor, and dropping near different regions produces different placements:

<img width="1280" height="735" alt="ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/6d2ae844-8c40-4c7a-a879-a856741b3160" />

- Drop on the **panel center** → split the hovered panel
- Drop near the **enclosing split's edge** → place as a sibling of the parent split
- Drop near the **root's edge** → place at the top level

### Touch devices

On touch, start a drag by **long-pressing (~0.45s)** a panel or pressing the handle set via `dragHandleSelector`. A translucent ghost follows your finger and the panel under the release point becomes the drop target. Border resize is Pointer Events based too, so it works with touch and pen.

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
