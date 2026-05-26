# API 레퍼런스

[English API doc](./API.md) · [← README로 돌아가기](../README.ko.md)

`@dannysir/floating-components`의 전체 API 레퍼런스입니다. 개요와 Quick Start는 [README](../README.ko.md)를 참고하세요.

---

## 개요

라이브러리는 세 가지 관심사로 나뉩니다.

| 구성요소 | 파일 | 역할 |
|---------|------|------|
| `<TreeLayout />` | 렌더러 | 패널/스플릿 트리를 flexbox로 렌더링하고 경계선 리사이즈와 HTML5 드래그 앤 드롭 제공 |
| `useLayoutTree` | 훅 | 트리 상태를 관리하고 `setTree`에 바인딩된 조작 헬퍼 반환 |
| 트리 유틸 | 순수 함수 | 훅 바깥에서 트리를 조회/변환할 때 사용 (`setTree`와 함께) |

---

## `<TreeLayout />`

레이아웃 트리를 flexbox로 재귀 렌더링합니다.

### Props

| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|:----:|--------|------|
| `tree` | `LayoutNode` | O | — | 렌더링할 트리 루트 노드 |
| `components` | `ComponentStore` | O | — | 각 패널의 `componentKey`를 실제 React 노드로 매핑하는 레지스트리. [`createComponentStore`](#createcomponentstoreinitial)로 생성 |
| `onResizeBorder` | `(path: number[], borderIndex: number, delta: number, totalPixels?: number) => void` | | — | 경계선 리사이즈 콜백 |
| `onMovePanel` | `(sourceId: string, anchorId: string, position: DropPosition, depth: number) => void` | | — | 드래그 앤 드롭 이동 콜백 |
| `dragHandleSelector` | `string` | | — | 드래그 핸들 CSS 선택자. 미지정 시 패널 전체가 드래그 가능 |
| `direction` | `"vertical" \| "horizontal" \| "complex"` | | `"complex"` | 드래그·드롭을 단일 축으로 제한. `"vertical"`은 패널 전체를 Y 중앙선 기준 상/하 두 영역으로 분할(X 무시), `"horizontal"`은 X 중앙선 기준 좌/우 분할. `"complex"`는 기본 4-edge 분류(X자 패턴) 유지. 입력 `tree`에 본 prop과 충돌하는 split이 있으면 자동으로 일치 방향으로 정규화되고 dev 모드에서 콘솔 경고 출력. `useLayoutTree.splitPanel(...)` 직접 호출은 **제약하지 않음** |
| `width` | `number \| string` | | `"100%"` | 루트 컨테이너 너비. 기본값은 부모를 가득 채움. 명시적으로 지정하면 오버라이드 |
| `height` | `number \| string` | | `"100%"` | 루트 컨테이너 높이. 기본값은 부모를 가득 채움. 명시적으로 지정하면 오버라이드 |
| `backgroundColor` | `string` | | — | 루트 컨테이너 배경색 |
| `margin` | `number \| string` | | — | 루트 컨테이너 마진 |
| `padding` | `number \| string` | | — | 루트 컨테이너 패딩 |
| `resizerThickness` | `number \| string` | | `8` | 히트 영역 두께. 실제 보이는 바는 중앙 4px (교차축 양쪽 2px는 투명 inset) |
| `resizerLength` | `number \| string` | | `"100%"` | 리사이저 교차축 길이 |
| `resizerColor` | `string` | | `"#0078d4"` | 중앙 바 색상. 기본적으로 hover 시 그라데이션 마스크와 함께 페이드인 |
| `resizerHoverColor` | `string` | | `"#0078d4"` | hover 시 색상 (150ms transition). 미지정 시 `resizerColor`로 fallback |
| `resizerHoverOnly` | `boolean` | | `true` | hover 시에만 페이드인. `false` 지정 시 항상 표시 |

### 크기

`TreeLayout`은 기본적으로 부모를 가득 채웁니다 (`width: 100%`, `height: 100%`). 부모는 명시 크기를 가져야 합니다 — 부모 높이가 콘텐츠 크기로 무너지면 레이아웃 높이는 0이 됩니다. `width`/`height` props로 직접 지정하거나, 명시 크기를 가진 부모(예: `100vw`/`100vh`)로 감싸세요.

### 스타일 커스터마이징

`resizer*` props와 루트 컨테이너 props로 외관을 제어합니다.

기본값만으로도 모던한 hover-reveal 라인이 렌더됩니다. 필요한 것만 오버라이드하세요:

```tsx
<TreeLayout
  tree={tree}
  onResizeBorder={resizeBorder}
  backgroundColor="#1e1e1e"
  padding={4}
  resizerHoverColor="#ef4444"   // hover 시 파랑 대신 빨강
  resizerHoverOnly={false}       // 항상 표시 (양 끝 그라데이션은 유지)
/>
```

| Prop | 기본값 | 설명 |
|------|--------|------|
| `resizerThickness` | `8` | 히트 영역 두께. 실제 바는 중앙 4px (양쪽 2px inset) |
| `resizerLength` | `"100%"` | 교차축 길이 — 짧게 설정하면 중앙 핸들 느낌 |
| `resizerColor` | `"#0078d4"` | 중앙 바 색상 (VS Code 스타일 블루) |
| `resizerHoverColor` | `"#0078d4"` | hover 시 색상 (150ms transition). 기본은 `resizerColor`와 동일 |
| `resizerHoverOnly` | `true` | 평소 숨김, hover 시 200ms 페이드인. `false`면 항상 표시 |

<img src="./assets/resize-demo.png" alt="경계선 리사이즈" width="640" />

---

## ComponentStore

트리는 패널마다 React 엘리먼트가 아니라 문자열 `componentKey`만 저장합니다. `ComponentStore`는 이 key를 실제 React 노드로 매핑하며, `TreeLayout`의 필수 `components` prop으로 전달됩니다. 덕분에 트리가 완전히 직렬화 가능해집니다([persistence](#persistence) 참고).

### `createComponentStore(initial?)`

store를 생성하며, `Record<string, ReactNode>`로 초기값을 지정할 수 있습니다.

```ts
const store = createComponentStore({
  sidebar: <Sidebar />,
  editor: <Editor />,
});
```

| 메서드 | 타입 | 설명 |
|--------|------|------|
| `register` | `(key: string, node: ReactNode) => void` | 매핑 추가/교체 |
| `unregister` | `(key: string) => void` | 매핑 제거 |
| `get` | `(key: string) => ReactNode \| undefined` | key에 해당하는 노드 조회 |
| `has` | `(key: string) => boolean` | key 등록 여부 |

- store는 **한 번만** 생성하고 안정적인 참조를 유지하세요(module-level 또는 `useMemo`).
- `register`/`unregister`는 내부 `Map`을 변경하지만 리렌더를 **일으키지 않습니다**. 화면을 동적으로 바꾸려면 store 변경 대신 트리를 교체(`setTree`)하세요.
- 패널의 `componentKey`가 등록되지 않으면 패널은 빈 상태(`null`)로 렌더되고 dev 모드 콘솔 경고가 출력됩니다.

### Persistence

트리의 모든 값이 원시값이므로 별도 serializer 없이 `JSON.stringify` / `JSON.parse`로 레이아웃을 왕복할 수 있습니다. store는 코드 쪽에 존재하며 직렬화되지 않습니다.

```tsx
// 저장
localStorage.setItem("layout", JSON.stringify(tree));

// 복원
const tree = JSON.parse(localStorage.getItem("layout")!) as LayoutNode;
```

복원된 트리가 컴포넌트를 찾을 수 있도록 store key는 릴리스 간 안정적으로 유지하세요.

---

## `useLayoutTree(initialTree)`

레이아웃 트리 상태를 관리하는 훅. 현재 트리와 셀렉터, 조작 헬퍼를 반환합니다.

```ts
const {
  tree, setTree,
  firstPanelId, panelIds, hasPanel,
  resizeBorder, splitPanel, removePanel, movePanel, insertPanel,
} = useLayoutTree(initialTree);
```

### 반환값

| 반환값 | 타입 | 설명 |
|--------|------|------|
| `tree` | `LayoutNode` | 현재 레이아웃 트리 상태 |
| `setTree` | `(tree: LayoutNode) => void` | 트리 직접 설정 |
| `firstPanelId` | `string \| null` | 트리에서 pre-order로 처음 만나는 패널 id |
| `panelIds` | `string[]` | 트리 내 모든 패널 id (pre-order) |
| `hasPanel` | `(panelId: string) => boolean` | 특정 패널 존재 여부 |
| `resizeBorder` | `(path, borderIndex, delta, totalPixels?) => void` | split 내부의 경계선 인덱스로 리사이즈 |
| `splitPanel` | `(panelId, direction, options?) => string` | 패널 분할, 새 패널 id 반환 |
| `removePanel` | `(panelId) => void` | 패널 제거, 단일 자식 split 자동 언래핑 |
| `movePanel` | `(sourceId, anchorId, position, depth?) => void` | 패널 이동 |
| `insertPanel` | `(options: { panel: InsertPanelInit; at?: InsertAt }) => string` | 패널 삽입, 새 패널 id 반환 |

### 메서드 상세

#### `splitPanel(panelId, direction, options?)`

지정된 방향으로 형제 패널을 추가하여 패널을 분할. 새 패널의 id를 반환합니다.

```ts
splitPanel("editor", "vertical");
// 자동 생성 id + 빈 componentKey ("")

splitPanel("editor", "horizontal", {
  newPanel: { id: "preview", componentKey: "preview" },
});
// => "preview"
```

- 부모 split이 이미 같은 `direction`이면 형제로 삽입
- 다르면 대상 패널을 새 split으로 감싸서 기존 + 새 패널을 담음
- `newPanel.id` 생략 시 `crypto.randomUUID()`로 자동 생성
- `newPanel.size` 기본값 `0.5`
- `newPanel.componentKey` 기본값 `""` (key를 지정하기 전까지 빈 패널로 렌더)

#### `removePanel(panelId)`

트리에서 패널 제거. 제거 후 단일 자식만 남은 split은 자동 언래핑됩니다.

#### `movePanel(sourceId, anchorId, position, depth?)`

기존 패널을 `anchorId` 옆으로 이동. 보통 `<TreeLayout onMovePanel={movePanel} />`에 연결하여 내장 DnD가 `position`/`depth`를 전달합니다.

- `position`: `"top" | "bottom" | "left" | "right"` — 앵커 기준 드롭 위치
- `depth`: `0` = 패널 레벨(형제), `1` = 부모 split 레벨, 이상은 상위 조상 split 레벨

#### `insertPanel({ panel, at? })`

새 패널 삽입. 새 패널 id 반환.

```ts
// 루트에 append
insertPanel({ panel: { componentKey: "editor" } });

// 기존 패널의 형제로 삽입
insertPanel({
  panel: { id: "preview", componentKey: "preview" },
  at: { anchorId: "editor", position: "right" },
});
```

- `panel.componentKey`는 **필수** (`ComponentStore`에 등록되어 있어야 함)
- `panel.id` 생략 시 자동 생성
- `panel.size` 기본값 `1`
- `at` 생략 시 루트에 append (규칙은 [트리 유틸](#트리-유틸) 참조)

#### `resizeBorder(path, borderIndex, delta, totalPixels?)`

`path`의 split 내부에서 인접한 두 자식 사이의 경계선을 리사이즈. 인접 자식의 `minSize`/`maxSize`를 준수합니다. 보통 `<TreeLayout onResizeBorder={resizeBorder} />`에 연결.

#### 셀렉터 팁

- `firstPanelId` — "첫 패널 포커스", "상단 근처 삽입" 같은 용도
- `panelIds` — `panelIds.includes(id)`로 토글 UI의 표시 여부 체크
- `hasPanel(id)` — 위와 동일한 체크. Set/배열을 매 렌더마다 새로 만들지 않아도 됨

---

## 트리 유틸

훅 없이 트리를 조회/변환하는 순수 함수. 이미 Redux/Zustand/`setTree`로 트리 상태를 직접 관리할 때 유용합니다.

```ts
import {
  getFirstPanelId,
  getPanelIds,
  insertPanelIntoTree,
} from "@dannysir/floating-components";
```

### `getFirstPanelId(tree): string | null`

Pre-order로 처음 만나는 패널의 id. 트리에 패널이 없으면 `null` (정상 트리에서는 발생 불가).

### `getPanelIds(tree): string[]`

모든 패널 id를 pre-order로 반환.

### `insertPanelIntoTree(tree, panel, at?): LayoutNode`

`panel`이 삽입된 새 트리 반환. `panel`은 완전한 `PanelNode`여야 합니다.

```ts
// 루트에 append
insertPanelIntoTree(tree, panelNode);

// 앵커의 형제로 삽입
insertPanelIntoTree(tree, panelNode, { anchorId: "editor", position: "right" });
```

**루트 append 규칙** (`at` 생략 시):
- 루트가 `split`이면 `children` 끝에 추가 (vertical → 맨 아래, horizontal → 맨 오른쪽)
- 루트가 `panel`이면 horizontal split으로 감싸고 새 패널을 오른쪽에

앵커를 찾지 못하면 dev 경고와 함께 원본 트리를 그대로 반환합니다.

---

## 드래그 앤 드롭

렌더러가 각 패널에 HTML5 드래그 앤 드롭 리스너를 등록합니다. 사용자가 패널을 드래그하면 호버한 영역으로부터 드롭 타겟을 계산한 뒤 `onMovePanel(sourceId, anchorId, position, depth)`이 호출됩니다.

<img src="./assets/drag-drop-demo.png" alt="드래그 앤 드롭" width="640" />

### 드롭 타겟 우선순위

호버한 패널 주변 영역은 다음과 같이 분할됩니다.

1. **루트 가장자리** (루트 컨테이너 외곽 ~5%) — 최상위 레벨 배치. `depth`는 조상 split 수와 같음
2. **부모 split 가장자리** (상위 split 외곽 ~15%) — 부모 split 레벨. `depth = 1`
3. **패널 내부** — 호버한 패널 레벨. `depth = 0`

각 레벨 내에서 커서 위치가 `position`을 결정합니다.
- 좌/우 1/3 → `"left"` / `"right"` (horizontal split 생성)
- 상/하 1/3 → `"top"` / `"bottom"` (vertical split 생성)

### `depth` 파라미터

`depth`는 앵커의 조상 체인을 따라 삽입 지점을 위로 올립니다.

- `0` — 앵커 패널 자체의 형제로 삽입
- `1` — 앵커의 부모 split의 형제로 삽입
- `n` — n번째 조상 split의 형제로
- `>= ancestors.length` — 루트 레벨로

덕분에 패널 가까이 드롭하면 해당 패널을 분할하고, split 가장자리에 드롭하면 더 넓은 범위의 형제가 생성됩니다.

---

## 타입

```ts
type SplitDirection = "horizontal" | "vertical";

interface PanelNode {
  type: "panel";
  id: string;
  size: number;            // flex 비율
  componentKey: string;    // ComponentStore의 key
  minSize?: number;        // 픽셀 최소값 (resizeBorder 클램핑용)
  maxSize?: number;        // 픽셀 최대값
}

interface SplitNode {
  type: "split";
  direction: SplitDirection;
  size: number;             // flex 비율
  children: LayoutNode[];   // 2개 이상의 자식
  minSize?: number;
  maxSize?: number;
}

type LayoutNode = PanelNode | SplitNode;

type DropPosition = "top" | "bottom" | "left" | "right";

// insertPanel / insertPanelIntoTree 용
interface InsertPanelInit {
  componentKey: string;  // 필수
  id?: string;           // 미지정 시 자동 생성
  size?: number;
  minSize?: number;
  maxSize?: number;
}

interface ComponentStore {
  register: (key: string, node: ReactNode) => void;
  unregister: (key: string) => void;
  get: (key: string) => ReactNode | undefined;
  has: (key: string) => boolean;
}

interface InsertAt {
  anchorId: string;
  position: DropPosition;
}
```

### 설계 노트

- `SplitNode`는 `id`가 없습니다 — 경로(`number[]`)로 식별. 구조적 경로와 중복되고, 자동 언래핑 시 깨지기 쉬워서.
- `SplitNode`의 자식이 하나만 남으면 `removePanel`/`movePanel` 이후 자동 언래핑되어 트리가 flat하게 유지됩니다.
- `size`는 픽셀이 아니라 flex 비율입니다. 형제 간 비례 분할.
