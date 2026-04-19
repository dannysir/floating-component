# react-tree-layout

[English README](./README.md) · [API 문서](./doc/API.ko.md)

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

## 드래그 앤 드롭

패널을 드래그해서 위치를 바꿀 수 있습니다. 드롭 타겟의 미리보기가 반투명 shadow로 커서를 따라다니며, 드롭 영역에 따라 배치 방식이 달라집니다.

<img src="doc/assets/drag-preview.png" alt="드래그 미리보기" width="640" />

- **패널 중앙**에 드롭 → 해당 패널을 분할
- **부모 split 가장자리**에 드롭 → 부모 split의 형제로 배치
- **루트 가장자리**에 드롭 → 최상위 레벨에 배치

`useLayoutTree`의 `movePanel`과 연결하여 사용합니다.

```tsx
<TreeLayout tree={tree} onResizeBorder={resizeBorder} onMovePanel={movePanel} />
```

전체 배치 규칙과 `depth` 파라미터는 [API 문서 → 드래그 앤 드롭](./doc/API.ko.md#드래그-앤-드롭)을 참고하세요.

---

## 문서

- **[API 레퍼런스](./doc/API.ko.md)** — 전체 props, 훅 반환값, 트리 유틸, 타입
- **[CHANGELOG](./CHANGELOG.md)**

---

## 라이선스

ISC
