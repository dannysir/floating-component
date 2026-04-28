# Changelog

[한국어 CHANGELOG](./CHANGELOG.ko.md) · [← Back to README](./README.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.3] - 2026-04-28

### Added

- `direction` prop on `TreeLayout` (`"vertical" | "horizontal" | "complex"`, default `"complex"`) — restricts drag-drop to a single axis. In `"vertical"` mode the entire panel is split into top/bottom drop zones by the Y midline; `"horizontal"` divides left/right by the X midline. `"complex"` keeps the default 4-edge classification. When the input tree contains splits whose direction conflicts with the prop, those splits are auto-normalized and a dev-mode console warning is emitted. `useLayoutTree.splitPanel(...)` direct calls are not constrained.
- `LayoutDirection` type exported from the package entry point.

---

## [0.2.2] - 2026-04-24

### Added

- `resizerHoverColor` prop on `TreeLayout` and `--ftl-resizer-hover-color` CSS variable on `Resizer` — customize the hover-state color independently from the base color

### Changed

- Default `Resizer` visual redesigned for a modern hover-reveal look:
  - `resizerThickness` default: `4` → `8` (hit area; visible bar is a 4px strip centered inside, with 2px transparent inset on each cross-axis side)
  - `resizerColor` default: `#e0e0e0` → `#0078d4` (VS Code-style blue)
  - `resizerHoverOnly` default: `false` → `true` (bar is hidden by default, fades in on hover over 200ms)
  - Internal CSS: cross-axis inset via `padding` + `background-clip: content-box`, length-axis fade via `mask-image` gradient (transparent → opaque 50% → transparent), `opacity` transition on hover
- Drag-preview shadow outline color aligned with new resizer blue: `rgba(59, 130, 246, 0.6)` → `rgba(0, 120, 212, 0.6)`

### Migration notes

- To keep the v0.2.1 flat-line look, set `resizerHoverOnly={false}` and `resizerThickness={4}`
- Existing `resizerColor` overrides still work — the color is applied to the visible 4px center bar

---

## [0.2.1] - 2026-04-19

### Fixed

- Drop preview no longer disappears permanently when the cursor leaves and re-enters the `TreeLayout` boundary mid-drag. `clearPreview` (visual-only) and `finishDrag` (visual + `draggingPanelId` cleanup) are now separated so re-entry can restore the shadow.

---

## [0.2.0] - 2026-04-19

### Added

- `useLayoutTree` returns: `firstPanelId`, `panelIds`, `hasPanel`, `insertPanel`
- Public tree utility functions: `getFirstPanelId`, `getPanelIds`, `insertPanelIntoTree`
- Public types: `InsertPanelInit`, `InsertAt`

### Changed

- `TreeLayout` style API restricted: removed `className`, `style`, `resizerClassName`, `resizerStyle`, `classNames`, `shadowClassName`, `shadowStyle` props
- Added controlled styling props to `TreeLayout`: `backgroundColor`, `margin`, `padding`, `resizerThickness`, `resizerLength`, `resizerColor`, `resizerHoverOnly`
- `resizerThickness` accepts `number | string` (e.g. `4`, `"4px"`, `"0.5rem"`)
- Drag shadow style is now a fixed built-in (opacity 0.5 + dashed blue outline)
- Removed `LayoutClassNames` type from public API
- `getRootPanelId` → `getFirstPanelId`, `useLayoutTree().rootPanelId` → `firstPanelId` (renamed to reflect actual DFS-first behavior)

### Breaking Changes

- `TreeLayout`: `className`, `style`, `resizerClassName`, `resizerStyle`, `classNames`, `shadowClassName`, `shadowStyle` removed
- `LayoutClassNames` type no longer exported
- `getRootPanelId` removed — use `getFirstPanelId`
- `useLayoutTree` return key `rootPanelId` removed — use `firstPanelId`

### Fixed

- Fixed package name in README/API docs: `react-tree-layout` → actual published name `@dannysir/floating-components`
- Fixed peer dependency docs: `react >= 17, react-dom >= 17` → `react >= 18` (aligned with `package.json`)

---

## [0.1.0] - 2026-04-14

### Added

- `TreeLayout` component and `useLayoutTree` hook
- Path-based border resize (`resizeBorder`)
- `splitPanel` / `removePanel` / `movePanel` API
- Drag-and-drop panel reordering (HTML5 Drag & Drop API, depth-aware drop target)
- `resizerClassName` prop for custom resizer styling
- ESM + CJS dual-format bundle with TypeScript declarations
