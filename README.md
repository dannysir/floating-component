# react-tree-layout

[한국어 README](./README.ko.md)

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
npm install react-tree-layout
```

> **Peer dependencies**: `react >= 17`, `react-dom >= 17`

---

## Quick Start

```tsx
import { TreeLayout, useLayoutTree, type LayoutNode } from "react-tree-layout";

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

---

## API

### `<TreeLayout />`

Recursively renders the layout tree using flexbox.

| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| `tree` | `LayoutNode` | Yes | Root node of the layout tree |
| `onResizeBorder` | `(path, borderIndex, delta) => void` | | Border resize callback |
| `onMovePanel` | `(sourceId, anchorId, position, depth) => void` | | Drag-and-drop move callback |
| `dragHandleSelector` | `string` | | CSS selector for drag handle (omit to make entire panel draggable) |
| `backgroundColor` | `string` | | Background color of the root container |
| `margin` | `number \| string` | | Margin of the root container |
| `padding` | `number \| string` | | Padding of the root container |
| `resizerThickness` | `number \| string` | | Resizer width (horizontal) or height (vertical). Also acts as gap between panels. Default `4` |
| `resizerLength` | `number \| string` | | Resizer cross-axis size (height when horizontal, width when vertical). Default `"100%"` |
| `resizerColor` | `string` | | Resizer background color. Default `"#e0e0e0"` |
| `resizerHoverOnly` | `boolean` | | Show resizer only on hover (transparent otherwise). Default `false` |

### `useLayoutTree(initialTree)`

Hook for managing layout tree state.

```ts
const {
  tree, setTree,
  rootPanelId, panelIds, hasPanel,
  resizeBorder, splitPanel, removePanel, movePanel, insertPanel,
} = useLayoutTree(initialTree);
```

| Return | Type | Description |
|--------|------|-------------|
| `tree` | `LayoutNode` | Current layout tree state |
| `setTree` | `(tree: LayoutNode) => void` | Directly set the tree |
| `rootPanelId` | `string \| null` | First panel id found in the tree (pre-order) |
| `panelIds` | `string[]` | All panel ids in the tree (pre-order) |
| `hasPanel` | `(panelId: string) => boolean` | Whether a panel exists in the tree |
| `resizeBorder` | `(path, borderIndex, delta) => void` | Resize by border index |
| `splitPanel` | `(panelId, direction) => string` | Split a panel; returns the new panel id |
| `removePanel` | `(panelId) => void` | Remove a panel |
| `movePanel` | `(sourceId, anchorId, position, depth?) => void` | Move a panel |
| `insertPanel` | `(options: { panel: InsertPanelInit; at?: InsertAt }) => string` | Insert a panel; returns the new panel id |

### Tree utilities (pure functions)

Available as standalone imports for when you manage the tree outside the hook (e.g. with `setTree`).

```ts
import { getRootPanelId, getPanelIds, insertPanelIntoTree } from "react-tree-layout";

getRootPanelId(tree);        // => string | null
getPanelIds(tree);           // => string[]

// Append to root
insertPanelIntoTree(tree, panelNode);

// Insert as sibling of an anchor
insertPanelIntoTree(tree, panelNode, { anchorId: "editor", position: "right" });
```

`insertPanelIntoTree` takes a full `PanelNode`. Root append rules:
- Split root → appended to end of `children` (bottom for vertical, right for horizontal)
- Panel root → wrapped in a horizontal split with the new panel on the right

---

## Types

```ts
type SplitDirection = "horizontal" | "vertical";

interface PanelNode {
  type: "panel";
  id: string;
  size: number;          // flex ratio
  component: ReactNode;  // content to render
}

interface SplitNode {
  type: "split";
  direction: SplitDirection;
  size: number;            // flex ratio
  children: LayoutNode[];  // two or more children
}

type LayoutNode = PanelNode | SplitNode;

type DropPosition = "top" | "bottom" | "left" | "right";

// insertPanel / insertPanelIntoTree helpers
interface InsertPanelInit {
  component: ReactNode;  // required
  id?: string;           // auto-generated if omitted
  size?: number;
  minSize?: number;
  maxSize?: number;
}

interface InsertAt {
  anchorId: string;
  position: DropPosition;
}
```

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

## Customization

### Resizer style

Use the `resizer*` props to control the border appearance:

```tsx
<TreeLayout
  tree={tree}
  onResizeBorder={resizeBorder}
  backgroundColor="#1e1e1e"
  padding={4}
  resizerThickness={6}
  resizerColor="#3b82f6"
  resizerHoverOnly
/>
```

| Prop | Default | Description |
|------|---------|-------------|
| `resizerThickness` | `4` | Border width/height in px or CSS unit string (e.g. `"0.5rem"`) |
| `resizerLength` | `"100%"` | Cross-axis size — shorter values produce a centered handle look |
| `resizerColor` | `"#e0e0e0"` | Border color |
| `resizerHoverOnly` | `false` | Transparent until hovered |

<img src="doc/assets/resize-demo.png" alt="Border resize" width="640" />

### Drag-and-drop

<img src="doc/assets/drag-drop-demo.png" alt="Drag and drop" width="640" />

`movePanel(sourceId, anchorId, position, depth)` — moves a panel to another location.

- `position`: drop side relative to the anchor panel (`top` / `bottom` / `left` / `right`)
- `depth`: 0 = panel level, 1 = parent split level, higher = ancestor split level

**Drop target priority:**
1. Root edge (outer 5%) — places at the top level
2. Parent split edge (outer 15%) — places at the enclosing split level
3. Panel center — splits at the panel level

---

## License

ISC
