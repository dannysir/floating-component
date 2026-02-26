# react-tree-layout

Tree-based resizable and reorderable panel layout for React.

VS Code나 IDE처럼 패널을 수평/수직으로 분할하고, 크기 조절 및 제거할 수 있는 레이아웃을 트리 자료구조로 관리하는 React 라이브러리입니다.

---

## 설계 개요

### 핵심 아이디어

레이아웃 상태를 **N-ary 트리**로 표현합니다.

- **Leaf 노드 (`PanelNode`)**: 실제 콘텐츠가 렌더링되는 패널
- **Branch 노드 (`SplitNode`)**: 자식 노드들을 수평 또는 수직으로 분할하는 컨테이너 (자식 수 제한 없음)

```
root (SplitNode, horizontal)
├── panel-a (PanelNode, size: 1)
├── panel-b (PanelNode, size: 1)   ← 같은 방향으로 분할 시 형제로 추가
└── right (SplitNode, vertical)
    ├── panel-c (PanelNode, size: 1)
    └── panel-d (PanelNode, size: 1)
```

SplitNode는 2개 이상의 자식을 가질 수 있어 불필요한 중첩 없이 트리를 **flat하게** 유지합니다. 트리 구조이므로 **재귀적 렌더링**과 **불변(immutable) 상태 업데이트**가 자연스럽게 동작합니다.

### 아키텍처

```
src/
├── types.ts              # LayoutNode, PanelNode, SplitNode 타입 정의
├── components/
│   └── TreeLayout.tsx    # 트리를 재귀적으로 렌더링하는 컴포넌트
├── hooks/
│   └── useLayoutTree.ts  # 트리 상태 관리 훅 (split / resize / remove)
└── index.ts              # public API export
```

**`TreeLayout` (View)** 와 **`useLayoutTree` (State)** 를 분리해서, 레이아웃 상태 관리와 렌더링을 독립적으로 사용할 수 있습니다.

---

## 설치

```bash
npm install react-tree-layout
```

> **Peer dependencies**: `react >= 17`, `react-dom >= 17`

---

## 빠른 시작

```tsx
import { TreeLayout, useLayoutTree } from "react-tree-layout";

const initialTree = {
  root: {
    id: "split-root",
    type: "split",
    direction: "horizontal",
    children: [
      { id: "panel-left",  type: "panel", size: 0.5 },
      { id: "panel-right", type: "panel", size: 0.5 },
    ],
  },
};

export default function App() {
  const { tree, splitPanel, removePanel } = useLayoutTree(initialTree);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <TreeLayout
        node={tree.root}
        renderPanel={(id) => (
          <div style={{ padding: 16, height: "100%" }}>
            <h3>{id}</h3>
            <button onClick={() => splitPanel(id, "vertical")}>Split ↕</button>
            <button onClick={() => removePanel(id)}>Close</button>
          </div>
        )}
      />
    </div>
  );
}
```

---

## API

### `<TreeLayout />`

레이아웃 트리를 재귀적으로 렌더링하는 컴포넌트입니다. flexbox 기반으로 패널을 배치합니다.

| Prop | Type | 필수 | 설명 |
|------|------|------|------|
| `node` | `LayoutNode` | ✓ | 렌더링할 트리 노드 (루트부터 전달) |
| `renderPanel` | `(id: string) => ReactNode` | ✓ | 패널 id를 받아 콘텐츠를 반환하는 렌더 함수 |
| `className` | `string` | | 최상위 div의 className |
| `style` | `CSSProperties` | | 최상위 div의 인라인 스타일 |

### `useLayoutTree(initialTree)`

레이아웃 트리 상태를 관리하는 훅입니다.

```ts
const { tree, resizePanel, splitPanel, removePanel } = useLayoutTree(initialTree);
```

| 반환값 | 타입 | 설명 |
|--------|------|------|
| `tree` | `LayoutTree` | 현재 레이아웃 트리 상태 |
| `resizePanel` | `(panelId: string, newSize: number) => void` | 패널 크기 변경 (0~1 사이로 클램핑) |
| `splitPanel` | `(panelId: string, direction: SplitDirection) => void` | 패널을 수평/수직으로 분할 |
| `removePanel` | `(panelId: string) => void` | 패널 제거 (부모 split이 자식 1개만 남으면 자동 언래핑) |

---

## 타입

```ts
type SplitDirection = "horizontal" | "vertical";

interface PanelNode {
  id: string;
  type: "panel";
  size: number; // 0~1 비율 (flex 값으로 사용)
}

interface SplitNode {
  id: string;
  type: "split";
  direction: SplitDirection;
  children: LayoutNode[];
}

type LayoutNode = PanelNode | SplitNode;

interface LayoutTree {
  root: LayoutNode;
}
```

---

## 동작 원리

### `splitPanel`

부모 SplitNode의 방향에 따라 두 가지로 동작합니다.

**① 부모와 같은 방향으로 분할** — 새 패널을 형제로 삽입 (트리 깊이 증가 없음)

```
Before:
split-1 (horizontal)
├── panel-a
└── panel-b

After splitPanel("panel-a", "horizontal"):
split-1 (horizontal)
├── panel-a
├── panel-new  ← 형제로 삽입
└── panel-b
```

**② 부모와 다른 방향으로 분할** — 대상 패널만 새 SplitNode로 감쌈

```
Before:
split-1 (horizontal)
├── panel-a
└── panel-b

After splitPanel("panel-a", "vertical"):
split-1 (horizontal)
├── split-2 (vertical)   ← panel-a만 감쌈
│   ├── panel-a
│   └── panel-new
└── panel-b
```

### `removePanel`

대상 패널을 트리에서 제거합니다. 부모 `SplitNode`의 자식이 1개만 남으면, 해당 split을 남은 자식으로 대체합니다(언래핑).

### `resizePanel`

대상 패널의 `size` 값을 업데이트합니다. 0 미만 또는 1 초과의 값은 자동으로 클램핑됩니다.

모든 상태 업데이트는 **immutable 트리 순회**(`findAndUpdate`)를 통해 처리되므로 React의 불변성 원칙을 준수합니다.

---

## 빌드

```bash
npm run build     # dist/ 생성 (ESM + CJS + .d.ts)
npm run dev       # Vite 개발 서버
npm run type-check
```

### 출력물

| 파일 | 용도 |
|------|------|
| `dist/index.js` | ESM 번들 |
| `dist/index.cjs` | CommonJS 번들 |
| `dist/index.d.ts` | TypeScript 타입 선언 |

---

## 향후 계획

- [ ] 드래그로 패널 크기 조절 (Resizer 핸들)
- [ ] 드래그 앤 드롭으로 패널 순서 변경
- [ ] 최소/최대 크기 제약 옵션
- [ ] 레이아웃 직렬화 / 복원 유틸리티
- [ ] 키보드 접근성 지원
