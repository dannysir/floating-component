# TODO

## 개선 제안 (API / UX)

`floating-demo` 프로젝트로 실제 사용해보며 드러난 개선 포인트. 우선순위 순.

### 1. 패널 ID ↔ 컴포넌트 매핑을 앱이 직접 관리해야 함

`splitPanel(id, direction, { newPanel: { component } })` 사용 시 component를 매번 다시 넘겨야 하므로,
앱에서 id → component 매핑 배열/맵을 별도로 들고 있어야 한다.

```ts
// 데모에서 실제로 필요했던 코드
const PANEL_DEFS = [
  { id: "explorer", component: <ExplorerPanel /> },
  // ...
];
const def = PANEL_DEFS.find((p) => p.id === id);
splitPanel(anchorId, "horizontal", { newPanel: { id, component: def.component } });
```

**검토**: panel registry (`registerPanel(id, component)`) 또는 팩토리 패턴 도입.

---

### 2. 초기 트리 정의가 verbose함

```ts
{ type: "panel", id: "a", size: 1, component: <A /> }
```
매번 `type`, `size`를 반복. 빌더 헬퍼로 간결화 가능.

**검토**:
```ts
panel("a", <A />)
split("horizontal", [panel("a", <A />), panel("b", <B />)])
```

