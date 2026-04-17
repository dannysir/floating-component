# react-tree-layout

[English README](./README.md)

Tree 기반으로 크기 조절과 패널 이동이 가능한 React 레이아웃 라이브러리입니다. VS Code나 IDE처럼 패널을 수평/수직으로 분할하고, 경계선 드래그로 크기를 조절하고, 드래그 앤 드롭으로 패널을 이동할 수 있습니다.

<img src="doc/assets/layout-overview.png" alt="기본 레이아웃" width="640" />

---

## 특징

- **N-ary 트리 구조** — SplitNode가 2개 이상의 자식을 가질 수 있어 불필요한 중첩 없이 flat한 트리 유지
- **경계선 드래그 리사이즈** — 패널 사이 경계선을 드래그해서 크기 조절 (requestAnimationFrame 최적화)
- **드래그 앤 드롭 패널 이동** — HTML5 Drag & Drop API로 패널을 다른 위치로 이동
- **다단계 드롭 타겟 감지** — 패널 가장자리, 부모 split 가장자리, 루트 가장자리를 구분하여 depth 기반 배치
- **불변 상태 관리** — 모든 트리 업데이트가 immutable하게 처리
- **View / State 분리** — `TreeLayout` (렌더링)과 `useLayoutTree` (상태 관리)를 독립적으로 사용 가능
- **TypeScript 지원** — 모든 타입 선언 포함
- **ESM + CJS** — 듀얼 포맷 번들 출력

---

## 설치

```bash
npm install react-tree-layout
```

> **Peer dependencies**: `react >= 17`, `react-dom >= 17`

---

## 빠른 시작

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

## 설계 개요

레이아웃 상태를 **N-ary 트리**로 표현합니다.

- **Leaf 노드 (`PanelNode`)** — 실제 콘텐츠가 렌더링되는 패널. `id`와 `component`를 가짐
- **Branch 노드 (`SplitNode`)** — 자식 노드들을 수평 또는 수직으로 분할하는 컨테이너. `id` 없음

```
root (SplitNode, horizontal)
├── panel-a (PanelNode, size: 1)
├── panel-b (PanelNode, size: 1)
└── (SplitNode, vertical)
    ├── panel-c (PanelNode, size: 1)
    └── panel-d (PanelNode, size: 1)
```

### 아키텍처

```
src/
├── types.ts                    # LayoutNode, PanelNode, SplitNode 타입
├── hooks/
│   └── useLayoutTree.ts        # 트리 상태 관리 훅
├── renderers/
│   ├── TreeLayout.tsx           # 루트 레이아웃 컴포넌트
│   ├── LayoutNodeRenderer.tsx   # 재귀 노드 렌더러 + 드래그 앤 드롭
│   └── Resizer.tsx              # 경계선 리사이즈 핸들
└── index.ts                    # public API export
```

---

## API

### `<TreeLayout />`

레이아웃 트리를 재귀적으로 렌더링하는 컴포넌트입니다. flexbox 기반으로 패널을 배치합니다.

| Prop | Type | 필수 | 설명 |
|------|------|:----:|------|
| `tree` | `LayoutNode` | O | 렌더링할 트리 루트 노드 |
| `onResizeBorder` | `(path, borderIndex, delta) => void` | | 경계선 리사이즈 콜백 |
| `onMovePanel` | `(sourceId, anchorId, position, depth) => void` | | 드래그 앤 드롭 이동 콜백 |
| `dragHandleSelector` | `string` | | 드래그 핸들 CSS 선택자 (미지정 시 패널 전체) |
| `backgroundColor` | `string` | | 루트 컨테이너 배경색 |
| `margin` | `number \| string` | | 루트 컨테이너 마진 |
| `padding` | `number \| string` | | 루트 컨테이너 패딩 |
| `resizerThickness` | `number \| string` | | 리사이저 두께 (패널 간 gap). 기본값 `4` |
| `resizerLength` | `number \| string` | | 리사이저 교차축 길이. 기본값 `"100%"` |
| `resizerColor` | `string` | | 리사이저 색상. 기본값 `"#e0e0e0"` |
| `resizerHoverOnly` | `boolean` | | hover 시에만 표시 (평소 투명). 기본값 `false` |

### `useLayoutTree(initialTree)`

레이아웃 트리 상태를 관리하는 훅입니다.

```ts
const {
  tree, setTree,
  rootPanelId, panelIds, hasPanel,
  resizeBorder, splitPanel, removePanel, movePanel, insertPanel,
} = useLayoutTree(initialTree);
```

| 반환값 | 타입 | 설명 |
|--------|------|------|
| `tree` | `LayoutNode` | 현재 레이아웃 트리 상태 |
| `setTree` | `(tree: LayoutNode) => void` | 트리 직접 설정 |
| `rootPanelId` | `string \| null` | 트리에서 pre-order로 처음 만나는 패널의 id |
| `panelIds` | `string[]` | 트리 내 모든 패널 id 배열 (pre-order) |
| `hasPanel` | `(panelId: string) => boolean` | 특정 패널 존재 여부 |
| `resizeBorder` | `(path, borderIndex, delta) => void` | 경계선 기반 리사이즈 |
| `splitPanel` | `(panelId, direction) => string` | 패널 분할, 새 패널 id 반환 |
| `removePanel` | `(panelId) => void` | 패널 제거 |
| `movePanel` | `(sourceId, anchorId, position, depth?) => void` | 패널 이동 |
| `insertPanel` | `(options: { panel: InsertPanelInit; at?: InsertAt }) => string` | 패널 삽입, 새 패널 id 반환 |

### 트리 유틸 (순수 함수)

훅 바깥에서 트리를 직접 조작할 때(`setTree`와 함께) 사용할 수 있는 순수 함수들.

```ts
import { getRootPanelId, getPanelIds, insertPanelIntoTree } from "react-tree-layout";

getRootPanelId(tree);        // => string | null
getPanelIds(tree);           // => string[]

// 루트에 append
insertPanelIntoTree(tree, panelNode);

// anchor 형제로 삽입
insertPanelIntoTree(tree, panelNode, { anchorId: "editor", position: "right" });
```

`insertPanelIntoTree`는 완전한 `PanelNode`를 받습니다. 루트 append 규칙:
- 루트가 `split` → `children` 끝에 추가 (vertical이면 맨 아래, horizontal이면 맨 오른쪽)
- 루트가 `panel` → horizontal split으로 감싸고 새 패널을 오른쪽에

---

## 타입

```ts
type SplitDirection = "horizontal" | "vertical";

interface PanelNode {
  type: "panel";
  id: string;
  size: number;         // flex 비율
  component: ReactNode; // 렌더링할 콘텐츠
}

interface SplitNode {
  type: "split";
  direction: SplitDirection;
  size: number;             // flex 비율
  children: LayoutNode[];   // 2개 이상의 자식
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

---

## 레시피

### 패널 표시/숨김 토글

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

## 커스터마이징

### 리사이저 스타일

`resizer*` props로 경계선 외관을 제어합니다.

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
| `resizerLength` | `"100%"` | 교차축 길이 — 짧게 설정하면 중앙 핸들 느낌을 줄 수 있음 |
| `resizerColor` | `"#e0e0e0"` | 경계선 색상 |
| `resizerHoverOnly` | `false` | hover 시에만 표시 |

<img src="doc/assets/resize-demo.png" alt="경계선 리사이즈" width="640" />

### 드래그 앤 드롭

<img src="doc/assets/drag-drop-demo.png" alt="드래그 앤 드롭" width="640" />

`movePanel(sourceId, anchorId, position, depth)` — 패널을 다른 위치로 이동합니다.

- `position`: 앵커 패널 기준 드롭 위치 (`top` / `bottom` / `left` / `right`)
- `depth`: 드롭 깊이 (0 = 패널 레벨, 1 = 부모 split 레벨, ...)

**드롭 타겟 감지 우선순위:**
1. 루트 가장자리 (외곽 5%) — 최상위 레벨에 배치
2. 부모 split 가장자리 (외곽 15%) — 상위 split에 배치
3. 패널 중앙 — 패널 레벨에서 분할

---

## 빌드

```bash
npm run build       # dist/ 생성 (ESM + CJS + .d.ts)
npm run dev         # Vite 개발 서버
npm run type-check  # 타입 검사
```

### 출력물

| 파일 | 용도 |
|------|------|
| `dist/index.js` | ESM 번들 |
| `dist/index.cjs` | CommonJS 번들 |
| `dist/index.d.ts` | TypeScript 타입 선언 |

---

## 라이선스

ISC
