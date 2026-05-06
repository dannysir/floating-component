# floating-components TODO

## 진행 방식

- 변경 작업 시 플랜 모드 → 구현 → 커밋 분리 (`<type>:` 코드 / `docs:` 문서)
- 매 단계 끝에 `npm run type-check`, `npm run build` 통과
- 브라우저 검증은 `floating-demo`에서 수행
- 커밋은 항상 사용자 사전 허락 후 진행

---

## 현재 작업: PanelNode CSS sizing constraint

> 작업 브랜치: `feat/sizing-and-panel-lock`

### 배경

사용자가 컴포넌트를 직접 만들어 `PanelNode.component`로 주입하는 모델에서, 컴포넌트가 자체 CSS로 표현한 `min-width`/`min-height`/`max-*`가 라이브러리에 의해 깔아뭉개지고 있습니다.

[`src/components/PanelNodeRenderer.tsx`](../src/components/PanelNodeRenderer.tsx)의 wrapper div가 `minWidth: 0`, `minHeight: 0`을 강제해 flex item이 자식의 min-content를 무시하도록 명시하고 있습니다. 결과:

- 윈도우 리사이즈 시 사이드바가 의도한 240px 이하로 줄어듦
- DnD로 패널 추가/이동 후 자식 CSS 보호 안 됨
- `setTree`로 직접 조작 시 동일

목표: **사용자 컴포넌트의 CSS 의도를 라이브러리가 그대로 전달**해, 윈도우 리사이즈·DnD·setTree 등 모든 트리 변경 경로에서 브라우저 flex 알고리즘이 자동 보호하게 만듭니다.

### 사용자 사용 그림

```tsx
const Sidebar = () => (
  <aside style={{
    width: "100%",
    height: "100%",
    minWidth: 240,        // ← 사용자가 신경 쓰는 유일한 곳
  }}>
    <FileTree />
  </aside>
);

const tree: LayoutNode = {
  type: "split", direction: "horizontal", size: 1,
  children: [
    { type: "panel", id: "sidebar", size: 0.2, component: <Sidebar /> },
    { type: "panel", id: "editor",  size: 0.8, component: <Editor /> },
  ],
};
```

이 상태로 윈도우/DnD/setTree에서 240px 자동 보장.

### 변경 대상

- [src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx) — wrapper의 `minWidth: 0`/`minHeight: 0` 강제를 부모 direction에 따라 분기
- [src/components/LayoutNodeRenderer.tsx](../src/components/LayoutNodeRenderer.tsx) — 자식 PanelNodeRenderer에 `parentDirection` prop 전달

### 변경 내용

**1. PanelNodeRenderer prop 추가**

```ts
interface PanelNodeRendererProps {
  // ... 기존 props
  parentDirection?: SplitDirection;
}
```

**2. wrapper style 분기**

main-axis는 자식 따라가게 두고 (undefined → CSS 기본값 `auto`), cross-axis만 `0`으로 막음:

```tsx
const isHorizontal = parentDirection === HORIZONTAL;
style={{
  flex: node.size,
  minWidth:  isHorizontal ? undefined : 0,
  minHeight: isHorizontal ? 0 : undefined,
  overflow: "hidden",
}}
```

`parentDirection` 미정 시(루트가 단일 패널 등) 안전을 위해 둘 다 `0` 유지.

**3. LayoutNodeRenderer가 자식에게 direction 전달**

split 노드 렌더 시 자식이 패널이면 자기 direction을 prop으로 넘김.

### 트레이드오프 (수용)

- **드래그 데드존**: 자식 CSS의 min 미만으로 드래그 시도하면 시각적으로는 자식 CSS가 막지만 ratio 데이터는 더 작아짐. 짧은 데드존 발생. 정확한 드래그 보장이 필요한 패널은 `PanelNode.minSize` prop을 같이 주면 `clampSplitResize`가 데이터까지 보호.
- **컴포넌트 컨벤션**: 자식 컴포넌트는 `width: 100%`, `height: 100%`로 부모를 채우도록 권장. 명시 안 하면 main-axis에서 콘텐츠 크기로 부풀 수 있음.

### 변경 안 함

- `PanelNode.minSize`/`maxSize` prop은 그대로 유지 — 드래그 데이터 보호용 보조 수단으로 위치 변경
- `clampSplitResize` 시그니처/로직 변경 없음
- `resizeBorder` 인터페이스 변경 없음
- public API 변경 0

### 검증

- [ ] `npm run type-check` 통과
- [ ] `npm run build` 통과
- [ ] floating-demo에서 확인:
  - 자식 컴포넌트에 `min-width: 240px`만 주고 윈도우 리사이즈 → 240 이하로 안 줄어드는지
  - DnD로 패널 이동 후에도 보호되는지
  - `width: 100%` 안 준 컴포넌트가 여전히 정상 동작하는지
  - 드래그 시 데드존이 견딜 만한 수준인지 (UX 판단)
- [ ] 기존 `PanelNode.minSize` prop을 사용하는 코드 회귀 없음

### 문서 업데이트

- [README.md](../README.md), [README.ko.md](../README.ko.md) — "컴포넌트 CSS로 min/max 표현 가능, `width: 100%`/`height: 100%` 권장" 섹션 추가
- [doc/API.md](./API.md), [doc/API.ko.md](./API.ko.md) — `PanelNode.minSize`/`maxSize` 설명에 "드래그 데이터까지 보호하는 보조 수단"임을 명시

### 커밋 메시지 (제안)

```
feat: PanelNode wrapper가 자식 CSS의 min을 가로막지 않게 변경

- main-axis는 자식 따라감, cross-axis만 minWidth/Height 0 유지
- 사용자 컴포넌트의 min-width/min-height가 자동으로 보호됨
- 드래그 데이터 정확성은 PanelNode.minSize prop으로 보조
```

---

## 후순위 작업

### PanelNode lock options

특정 패널을 "고정 위치"로 만들 수 있는 옵션을 `PanelNode`에 추가합니다. 세 가지 독립 축으로 제어:

| 옵션 | 의미 | 기본값 |
|---|---|---|
| `draggable` | 이 패널을 드래그로 들어올릴 수 있는가 | `true` |
| `droppable` | 다른 패널이 이 패널로 드롭될 수 있는가 | `true` |
| `resizable` | 인접 경계선의 resize에 참여하는가 | `true` |

#### 변경 대상

- [src/tree/types.ts](../src/tree/types.ts) — `PanelNode` 타입 확장
- [src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx) — drag/drop 분기
- [src/components/LayoutNodeRenderer.tsx](../src/components/LayoutNodeRenderer.tsx) — Resizer 활성화 분기

#### 변경 내용

**타입 확장**

```ts
export interface PanelNode {
  type: "panel";
  id: string;
  size: number;
  component: ReactNode;
  minSize?: number;
  maxSize?: number;
  draggable?: boolean;
  droppable?: boolean;
  resizable?: boolean;
}
```

**PanelNodeRenderer 분기**

- `draggable === false`: div의 `draggable`을 false로
- `droppable === false`: `handleDragOver`/`handleDrop` 시작에서 early return

**Resizer 활성화 분기**

`elements.push(<Resizer ...>)` 부분에서 인접한 두 자식 중 하나라도 `resizable === false`인 PanelNode이면 Resizer를 렌더링하지 않음.

#### 검증

- floating-demo에서 직접 확인:
  - `draggable: false` 패널을 드래그 시도 → 안 들림
  - `droppable: false` 패널 위로 다른 패널 드래그 → preview/drop 안 됨
  - `resizable: false` 패널의 양 옆 경계 → Resizer 안 보임
  - 사이드바 케이스 (`draggable: false, droppable: false, resizable: false`) 시각 확인

#### 커밋 메시지 (제안)

```
feat: PanelNode에 draggable/droppable/resizable 옵션 추가

- 특정 패널을 위치 고정(사이드바 등)으로 만들 수 있도록 함
- 모두 옵셔널, 기본값 true (기존 동작 유지)
- LayoutNodeRenderer에서 인접 패널이 resizable: false면 Resizer 숨김
```

---

## 차후 작업 (미정)

### 리팩토링 (범위 미정)

사용자가 곧 범위 지정 예정. 착수 시 별도 플랜 모드로 진입.

### 테스트 추가

- 도구 선택부터 합의 (Vitest vs Jest). devDependencies 추가는 사용자 확인 필요
- 1차 대상 후보: `src/utils/` 순수 함수들 — `treeInsert`, `treeSplit`, `treeResize`, `treeQuery`, `treeHelpers`, `treeDirection`. 입출력이 명확해 단위 테스트 비용이 낮음
- 렌더·드래그 테스트는 후순위

### 트리 직렬화 / persistence

`PanelNode.component: ReactNode`는 JSON 직렬화 불가 (함수 컴포넌트 type/Symbol/함수 prop이 사라짐). localStorage 저장 시 사용자가 외부 registry 패턴(`componentKey` + 매핑 테이블)을 적용해야 함.

향후 옵션:
- README/예제에 registry 패턴 예제 박기 (옵션 C — 표면 0 증가)
- `serializeTree`/`deserializeTree` 헬퍼 제공 (옵션 A — 작은 표면)
- `PanelNode.componentKey` 1급 지원 (옵션 B — 표면 ↑)

지금은 사용자 피드백 쌓기 전 단계라 옵션 C부터 진행 권장.
