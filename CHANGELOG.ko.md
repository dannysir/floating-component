# 변경 이력

[English CHANGELOG](./CHANGELOG.md) · [← README로 돌아가기](./README.ko.md)

이 프로젝트의 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따릅니다.

## [0.2.0] - 2026-04-19

### 추가

- `useLayoutTree` 반환값: `firstPanelId`, `panelIds`, `hasPanel`, `insertPanel`
- 공개 트리 유틸 함수: `getFirstPanelId`, `getPanelIds`, `insertPanelIntoTree`
- 공개 타입: `InsertPanelInit`, `InsertAt`

### 변경

- `TreeLayout` 스타일 API 제한: `className`, `style`, `resizerClassName`, `resizerStyle`, `classNames`, `shadowClassName`, `shadowStyle` props 제거
- `TreeLayout`에 제어된 스타일 props 추가: `backgroundColor`, `margin`, `padding`, `resizerThickness`, `resizerLength`, `resizerColor`, `resizerHoverOnly`
- `resizerThickness`가 `number | string` 허용 (예: `4`, `"4px"`, `"0.5rem"`)
- 드래그 shadow 스타일을 내장 고정값으로 변경 (opacity 0.5 + 파란 dashed outline)
- `LayoutClassNames` 타입을 public API에서 제거
- `getRootPanelId` → `getFirstPanelId`, `useLayoutTree().rootPanelId` → `firstPanelId` (실제 동작이 DFS 첫 패널 반환이라 이름을 맞춤)

### 호환성 깨짐

- `TreeLayout`: `className`, `style`, `resizerClassName`, `resizerStyle`, `classNames`, `shadowClassName`, `shadowStyle` 제거
- `LayoutClassNames` 타입 export 제거
- `getRootPanelId` 제거 — `getFirstPanelId` 사용
- `useLayoutTree` 반환 키 `rootPanelId` 제거 — `firstPanelId` 사용

### 수정

- README/API 문서의 패키지명 오표기 수정: `react-tree-layout` → 실제 배포명 `@dannysir/floating-components`
- peer dependency 표기 수정: `react >= 17, react-dom >= 17` → `react >= 18` (`package.json` 기준)

---

## [0.1.0] - 2026-04-14

### 추가

- `TreeLayout` 컴포넌트와 `useLayoutTree` 훅
- path 기반 경계선 리사이즈 (`resizeBorder`)
- `splitPanel` / `removePanel` / `movePanel` API
- 드래그 앤 드롭 패널 이동 (HTML5 Drag & Drop API, depth 기반 드롭 타겟)
- `resizerClassName` prop으로 resizer 커스텀 스타일링
- ESM + CJS 듀얼 포맷 번들 + TypeScript 선언 파일 포함
