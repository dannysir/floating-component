# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
- `getRootPanelId` → `getFirstPanelId`, `useLayoutTree().rootPanelId` → `firstPanelId` (실제 동작은 DFS 첫 패널 반환이라 이름을 맞춤)

### Breaking Changes

- `TreeLayout`: `className`, `style`, `resizerClassName`, `resizerStyle`, `classNames`, `shadowClassName`, `shadowStyle` removed
- `LayoutClassNames` type no longer exported
- `getRootPanelId` 제거 — `getFirstPanelId` 사용
- `useLayoutTree` 반환 키 `rootPanelId` 제거 — `firstPanelId` 사용

---

## [0.1.0] - 2026-04-14

### Added

- `TreeLayout` component and `useLayoutTree` hook
- Path-based border resize (`resizeBorder`)
- `splitPanel` / `removePanel` / `movePanel` API
- Drag-and-drop panel reordering (HTML5 Drag & Drop API, depth-aware drop target)
- `resizerClassName` prop for custom resizer styling
- ESM + CJS dual-format bundle with TypeScript declarations
