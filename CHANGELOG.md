# Changelog

[한국어 CHANGELOG](./CHANGELOG.ko.md) · [← Back to README](./README.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
