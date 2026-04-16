# TODO

## 버그

### [BUG] resizerStyle의 width/height가 방향별 기본값을 덮어써 반대 방향 border가 안 보이는 문제

**현상**  
`<TreeLayout resizerStyle={{ background: "#3c3c3c", width: "4px" }} />` 처럼
`resizerStyle`에 `width`를 지정하면, vertical split(패널 상하 분할)의 가로 border가
기본값인 `width: "100%"` 대신 `width: "4px"`로 렌더링되어 거의 보이지 않게 된다.  
반대로 `height`만 지정해도 horizontal split의 세로 border가 같은 이유로 깨진다.

**원인**  
`Resizer.tsx`의 `defaultInlineStyle`은 방향에 따라 다른 값을 사용한다.

```ts
width:  isHorizontal ? 4 : "100%",
height: isHorizontal ? "100%" : 4,
```

이 기본값 위에 사용자의 `style` prop이 그대로 스프레드되므로,
방향과 무관한 `width` 또는 `height` 값이 두 방향 모두에 적용되어 버린다.

**재현 방법**  
```tsx
<TreeLayout
  tree={tree}
  onResizeBorder={resizeBorder}
  resizerStyle={{ background: "#333", width: "4px" }}
/>
```
→ horizontal split 사이의 세로 border는 보이지만, vertical split 사이의 가로 border가 거의 안 보임.

**해결 방향**  
`resizerStyle`에서 `width` / `height`를 사용자가 지정한 경우, 현재 방향과 무관한 축의 값은 무시하거나,
방향별로 적용할 수 있는 `resizerStyleHorizontal` / `resizerStyleVertical` prop을 분리하는 것을 검토.

---

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

### 2. "숨김/표시 토글"이 1급 시민이 아님

실무에서 흔한 패턴인데 현재 API로는 번거롭다.
- 추가하려면 anchor 패널 ID를 찾아야 함 (`getFirstPanelId` 같은 유틸을 앱에서 작성)
- visible 여부를 알려면 트리 순회 유틸(`getVisibleIds`)을 앱에서 작성
- 제거 후 재추가 시 이전 size 비율이 소실됨

**검토**: 훅에서 셀렉터 제공.
```ts
const { visibleIds, hasPanel, togglePanel } = useLayoutTree(initialTree);
```

---

### 3. 초기 트리 정의가 verbose함

```ts
{ type: "panel", id: "a", size: 1, component: <A /> }
```
매번 `type`, `size`를 반복. 빌더 헬퍼로 간결화 가능.

**검토**:
```ts
panel("a", <A />)
split("horizontal", [panel("a", <A />), panel("b", <B />)])
```

---

### 4. resizerStyle 방향 이슈

위 [BUG] 섹션 참조.

---

### 5. 패널 언마운트/재마운트로 인한 내부 상태 소실

`removePanel` 후 재추가 시 컴포넌트가 다시 마운트되어 스크롤 위치, 입력값, 폼 상태 등이 전부 초기화된다.

**검토**: "hidden" 상태를 트리에 유지한 채 `display: none` 처리하거나, 외부 상태 보존을 위한 가이드라인/헬퍼 제공.
