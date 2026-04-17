# API 레퍼런스

[English API doc](./API.md) · [← README로 돌아가기](../README.ko.md)

`react-tree-layout`의 전체 API 레퍼런스입니다. 개요와 Quick Start는 [README](../README.ko.md)를 참고하세요.

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
| `onResizeBorder` | `(path: number[], borderIndex: number, delta: number, totalPixels?: number) => void` | | — | 경계선 리사이즈 콜백 |
| `onMovePanel` | `(sourceId: string, anchorId: string, position: DropPosition, depth: number) => void` | | — | 드래그 앤 드롭 이동 콜백 |
| `dragHandleSelector` | `string` | | — | 드래그 핸들 CSS 선택자. 미지정 시 패널 전체가 드래그 가능 |
| `backgroundColor` | `string` | | — | 루트 컨테이너 배경색 |
| `margin` | `number \| string` | | — | 루트 컨테이너 마진 |
| `padding` | `number \| string` | | — | 루트 컨테이너 패딩 |
| `resizerThickness` | `number \| string` | | `4` | 리사이저 두께 (패널 간 gap) |
| `resizerLength` | `number \| string` | | `"100%"` | 리사이저 교차축 길이 |
| `resizerColor` | `string` | | `"#e0e0e0"` | 리사이저 색상 |
| `resizerHoverOnly` | `boolean` | | `false` | hover 시에만 표시 (평소 투명) |

### 스타일 커스터마이징

`resizer*` props와 루트 컨테이너 props로 외관을 제어합니다.

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

| Prop | 기본값 | 설명 |
|------|--------|------|
| `resizerThickness` | `4` | 두께 (px 숫자 또는 `"0.5rem"` 같은 CSS 단위 문자열) |
| `resizerLength` | `"100%"` | 교차축 길이 — 짧게 설정하면 중앙 핸들 느낌 |
| `resizerColor` | `"#e0e0e0"` | 경계선 색상 |
| `resizerHoverOnly` | `false` | hover 시에만 표시 |

<img src="./assets/resize-demo.png" alt="경계선 리사이즈" width="640" />

---

## `useLayoutTree(initialTree)`

레이아웃 트리 상태를 관리하는 훅. 현재 트리와 셀렉터, 조작 헬퍼를 반환합니다.

```ts
const {
  tree, setTree,
  rootPanelId, panelIds, hasPanel,
  resizeBorder, splitPanel, removePanel, movePanel, insertPanel,
} = useLayoutTree(initialTree);
```

### 반환값

| 반환값 | 타입 | 설명 |
|--------|------|------|
| `tree` | `LayoutNode` | 현재 레이아웃 트리 상태 |
| `setTree` | `(tree: LayoutNode) => void` | 트리 직접 설정 |
| `rootPanelId` | `string \| null` | 트리에서 pre-order로 처음 만나는 패널 id |
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
// 자동 생성 id + 빈 component

splitPanel("editor", "horizontal", {
  newPanel: { id: "preview", component: <Preview /> },
});
// => "preview"
```

- 부모 split이 이미 같은 `direction`이면 형제로 삽입
- 다르면 대상 패널을 새 split으로 감싸서 기존 + 새 패널을 담음
- `newPanel.id` 생략 시 `crypto.randomUUID()`로 자동 생성
- `newPanel.size` 기본값 `0.5`
- `newPanel.component` 기본값 `null`

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
insertPanel({ panel: { component: <Editor /> } });

// 기존 패널의 형제로 삽입
insertPanel({
  panel: { id: "preview", component: <Preview /> },
  at: { anchorId: "editor", position: "right" },
});
```

- `panel.component`는 **필수**
- `panel.id` 생략 시 자동 생성
- `panel.size` 기본값 `1`
- `at` 생략 시 루트에 append (규칙은 [트리 유틸](#트리-유틸) 참조)

#### `resizeBorder(path, borderIndex, delta, totalPixels?)`

`path`의 split 내부에서 인접한 두 자식 사이의 경계선을 리사이즈. 인접 자식의 `minSize`/`maxSize`를 준수합니다. 보통 `<TreeLayout onResizeBorder={resizeBorder} />`에 연결.

#### 셀렉터 팁

- `rootPanelId` — "첫 패널 포커스", "상단 근처 삽입" 같은 용도
- `panelIds` — `panelIds.includes(id)`로 토글 UI의 표시 여부 체크
- `hasPanel(id)` — 위와 동일한 체크. Set/배열을 매 렌더마다 새로 만들지 않아도 됨

---

## 트리 유틸

훅 없이 트리를 조회/변환하는 순수 함수. 이미 Redux/Zustand/`setTree`로 트리 상태를 직접 관리할 때 유용합니다.

```ts
import {
  getRootPanelId,
  getPanelIds,
  insertPanelIntoTree,
} from "react-tree-layout";
```

### `getRootPanelId(tree): string | null`

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
  size: number;          // flex 비율
  component: ReactNode;  // 렌더링할 콘텐츠
  minSize?: number;      // 픽셀 최소값 (resizeBorder 클램핑용)
  maxSize?: number;      // 픽셀 최대값
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
  component: ReactNode;  // 필수
  id?: string;           // 미지정 시 자동 생성
  size?: number;
  minSize?: number;
  maxSize?: number;
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
