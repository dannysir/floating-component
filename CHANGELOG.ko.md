# 변경 이력

[English CHANGELOG](./CHANGELOG.md) · [← README로 돌아가기](./README.ko.md)

이 프로젝트의 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따릅니다.

## [0.2.4] - 2026-05-06

### 추가

- `TreeLayout`에 `width` / `height` props 추가 (`number | string`) — 루트 컨테이너 크기를 명시적으로 지정하며 기본 채움 동작을 오버라이드

### 변경

- `TreeLayout` 루트 컨테이너가 기본적으로 부모를 가득 채우도록 변경 (`width: 100%`, `height: 100%`, `min-width: 0`, `min-height: 0`, `box-sizing: border-box`) — flex/grid 부모 안에서 자연스럽게 합성됨

### 마이그레이션 노트

- 부모에 명시 크기가 이미 지정되어 있던 경우: 영향 없음
- `TreeLayout`이 콘텐츠 크기로 무너지길 기대했던 경우: `width` / `height` props로 명시 지정 필요

---

## [0.2.3] - 2026-04-28

### 추가

- `TreeLayout`에 `direction` prop 추가 (`"vertical" | "horizontal" | "complex"`, 기본 `"complex"`) — 드래그·드롭을 단일 축으로 제한. `"vertical"`은 패널 전체를 Y 중앙선 기준 상/하 두 영역으로 분할, `"horizontal"`은 X 중앙선 기준 좌/우 분할. `"complex"`는 기본 4-edge 분류 유지. 입력 트리에 prop과 충돌하는 split이 있으면 자동 정규화되고 dev 모드에서 콘솔 경고 출력. `useLayoutTree.splitPanel(...)` 직접 호출은 제약하지 않음.
- 패키지 엔트리에 `LayoutDirection` 타입 export.

---

## [0.2.2] - 2026-04-24

### 추가

- `TreeLayout`에 `resizerHoverColor` prop, `Resizer`에 `--ftl-resizer-hover-color` CSS 변수 추가 — hover 상태 색상을 기본 색과 별도로 지정 가능

### 변경

- `Resizer` 기본 스타일을 모던한 hover-reveal 디자인으로 재설계:
  - `resizerThickness` 기본값: `4` → `8` (히트 영역; 실제 보이는 바는 중앙 4px, 교차축 양쪽 2px는 투명 inset)
  - `resizerColor` 기본값: `#e0e0e0` → `#0078d4` (VS Code 스타일 블루)
  - `resizerHoverOnly` 기본값: `false` → `true` (평소 숨김, hover 시 200ms 페이드인)
  - 내부 CSS: `padding` + `background-clip: content-box`로 교차축 inset, `mask-image` 그라데이션 (transparent → #000 50% → transparent)으로 길이축 페이드, hover 시 `opacity` transition
- 드래그 preview shadow outline 색상을 새 resizer 블루와 통일: `rgba(59, 130, 246, 0.6)` → `rgba(0, 120, 212, 0.6)`

### 마이그레이션 안내

- v0.2.1의 flat-line 느낌을 유지하려면 `resizerHoverOnly={false}`, `resizerThickness={4}` 지정
- 기존에 지정된 `resizerColor`는 그대로 유효 — 중앙 4px 바 색상에 적용됨

---

## [0.2.1] - 2026-04-19

### 수정

- 드래그 중 커서가 `TreeLayout` 밖으로 나갔다 재진입하면 drop preview가 복원되지 않던 문제 수정. `clearPreview`(시각 preview만 초기화)와 `finishDrag`(preview 초기화 + `draggingPanelId` 삭제)를 분리하여 재진입 시 shadow가 다시 표시됩니다.

---

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
