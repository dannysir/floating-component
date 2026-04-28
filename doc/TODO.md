# floating-components TODO

## 진행 방식

- 변경 작업 시 플랜 모드 → 구현 → 커밋 분리 (`<type>:` 코드 / `docs:` 문서)
- 매 단계 끝에 `npm run type-check`, `npm run build` 통과
- 브라우저 검증은 `floating-demo`에서 수행
- 커밋은 항상 사용자 사전 허락 후 진행

---

## 현재 작업: TreeLayout sizing & PanelNode lock

> 작업 브랜치: `feat/sizing-and-panel-lock`
> 두 작업은 **독립적**이며 별도 세션에서 진행 가능합니다.
> 각 작업 완료 후 별도 커밋으로 분리하는 것을 권장합니다.

### 배경

현재 `TreeLayout`의 루트 div는 `display: flex`만 갖고 있어 외곽 크기를 자체적으로 잡지 않습니다. 이로 인해 두 가지 사용성 문제가 있습니다.

1. **TreeLayout 크기 메커니즘 부재** — 사용자가 매번 외부 wrapper를 두고 부모를 flex/grid로 만들어 추가로 `flex: 1`을 주거나 명시 크기를 잡아야 동작합니다.
2. **트리 내부에서 위치 고정 불가** — 모든 패널이 드래그/드롭/리사이즈 가능합니다. 특정 패널을 "고정 위치"로 두고 싶은 케이스(예: 좌측 사이드바)를 표현할 수 없습니다.

이 두 문제를 같은 브랜치 `feat/sizing-and-panel-lock`에서 두 개의 독립 커밋으로 해결합니다.

---

### 작업 1: TreeLayout sizing (A + C)

#### 목표

- **A**: TreeLayout이 기본적으로 부모 컨테이너를 가득 채움 (`width: 100%`, `height: 100%`)
- **C**: 사용자가 `width`/`height` props로 명시적 오버라이드 가능

이 변경으로 1번(크기 메커니즘 부재)과 2번(드래그 시 외곽 흔들림 우려)을 동시에 해결합니다. 자식 패널이 `flex: ratio` 기반이므로 외곽이 결정되면 내부 변동은 외곽에 새어나가지 않습니다.

#### 변경 대상

**파일**: [src/components/TreeLayout.tsx](../src/components/TreeLayout.tsx)

#### 변경 내용

1. `TreeLayoutProps`에 다음 props 추가:
   ```ts
   width?: number | string;
   height?: number | string;
   ```

2. 루트 div의 `style`에 다음 기본값 적용 + props로 오버라이드:
   ```jsx
   style={{
     display: "flex",
     width: width ?? "100%",
     height: height ?? "100%",
     minWidth: 0,
     minHeight: 0,
     boxSizing: "border-box",
     backgroundColor,
     margin,
     padding,
   }}
   ```

   - `width/height: "100%"` — 부모가 명시 크기를 가지면 채움
   - `minWidth/Height: 0` — 중첩 flex에서 자식이 부모를 비집고 늘어나지 않게
   - `boxSizing: border-box` — 사용자가 `padding`을 줘도 100%가 부모를 넘지 않도록

3. props 함수 시그니처에 `width`, `height` 추가:
   ```ts
   export const TreeLayout = ({
     tree,
     // ...
     width,
     height,
     backgroundColor,
     margin,
     padding,
     // ...
   }: TreeLayoutProps) => { ... }
   ```

#### 사용자 영향 / 마이그레이션

- **Breaking 가능성**: 기존 사용자가 부모를 `display: block` + 콘텐츠 크기로 두고 TreeLayout 내부가 자체 콘텐츠 크기로 결정되길 기대하는 케이스가 있다면 깨집니다. 다만 자식이 `flex: ratio`라 사실상 동작 안 하던 케이스이므로 실질적 영향은 적을 것으로 예상됩니다.
- 부모가 콘텐츠 크기인 경우(예: 그냥 `<body>` 직속) `height: 100%`는 0이 됩니다 — 이건 일반 CSS 동작이며 README 예시에서 안내 필요.

#### 검증

- [ ] `npm run type-check` 통과
- [ ] `npm run build` 통과
- [ ] dev 서버 (`npm run dev`)에서 직접 확인:
  - props 없이 부모만 `width: 800, height: 600` 잡아도 TreeLayout이 채워지는지
  - `width={500}` 등 명시했을 때 그 크기로 고정되는지
  - 드래그 앤 드롭으로 패널 이동/추가/삭제 시 외곽이 흔들리지 않는지
  - 부모가 `display: flex`인 경우에도 정상 동작하는지

#### 문서 업데이트

- [README.md](../README.md), [README.ko.md](../README.ko.md) — TreeLayout props 섹션에 `width`, `height` 추가 + 부모 크기 가정 안내
- [doc/API.md](./API.md), [doc/API.ko.md](./API.ko.md) — TreeLayout props 표 갱신

#### 커밋 메시지 (제안)

```
feat: TreeLayout이 부모를 채우도록 기본 sizing 추가

- width/height props 추가 (기본 100%)
- minWidth/Height: 0, boxSizing: border-box 적용
- 외부 wrapper 없이 부모 크기에 맞춰 동작
```

---

### 작업 2: PanelNode lock options

#### 목표

특정 패널을 "고정 위치"로 만들 수 있는 옵션을 `PanelNode`에 추가합니다. 세 가지 독립 축으로 제어:

| 옵션 | 의미 | 기본값 |
|---|---|---|
| `draggable` | 이 패널을 드래그로 들어올릴 수 있는가 | `true` |
| `droppable` | 다른 패널이 이 패널로 드롭될 수 있는가 | `true` |
| `resizable` | 인접 경계선의 resize에 참여하는가 | `true` |

`locked: true`는 위 세 가지를 모두 false로 만드는 단축키로 제공할지 검토 (선택사항 — 일단은 세 옵션만으로 시작 권장).

#### 변경 대상

**핵심 파일**:
- [src/tree/types.ts](../src/tree/types.ts) — `PanelNode` 타입 확장
- [src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx) — drag/drop 분기
- [src/components/LayoutNodeRenderer.tsx](../src/components/LayoutNodeRenderer.tsx) — Resizer 활성화 분기 (인접 패널 중 하나라도 `resizable: false`면 비활성)

**참고 파일**:
- [src/dnd/dropTarget.ts](../src/dnd/dropTarget.ts) — 변경 불필요 (renderer에서 막음)
- [src/tree/move.ts](../src/tree/move.ts) — 변경 불필요 (UI 레벨에서 차단)

#### 변경 내용

**2-1. 타입 확장**

[src/tree/types.ts](../src/tree/types.ts):

```ts
export interface PanelNode {
  type: "panel";
  id: string;
  size: number;
  component: ReactNode;
  minSize?: number;
  maxSize?: number;
  draggable?: boolean;   // default true
  droppable?: boolean;   // default true
  resizable?: boolean;   // default true
}
```

**2-2. PanelNodeRenderer 분기**

[src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx):

- `draggable === false`인 경우:
  - `dragHandleSelector` 없을 때 기본 `draggable={true}` 대신 `false`
  - `handleDragStart` 자체를 막아야 함 (또는 div의 draggable을 false로)
- `droppable === false`인 경우:
  - `handleDragOver`에서 early return → preview/drop 모두 차단
  - `handleDrop`에서도 early return

```tsx
draggable={node.draggable === false ? false : !dragHandleSelector}
// handleDragOver/handleDrop 시작부에:
if (node.droppable === false) return;
```

**2-3. Resizer 활성화 분기**

[src/components/LayoutNodeRenderer.tsx](../src/components/LayoutNodeRenderer.tsx) 의 `elements.push(<Resizer ...>)` 부분:

- 인접한 두 자식 중 하나라도 `resizable === false`인 PanelNode이면 Resizer를 렌더링하지 않음 (또는 disabled).
- SplitNode인 경우는 자식에 lock된 패널이 있다고 해서 자동 전파하지 않음 (사용자가 panel 단위에서 명시적으로 지정).

```tsx
const isResizableBoundary = (a: LayoutNode, b: LayoutNode) => {
  const aOk = a.type !== "panel" || a.resizable !== false;
  const bOk = b.type !== "panel" || b.resizable !== false;
  return aOk && bOk;
};
// elements.push(<Resizer ...>) 전에:
if (isResizableBoundary(child, node.children[i + 1])) { ... }
```

#### 검증

- [ ] `npm run type-check` 통과
- [ ] `npm run build` 통과
- [ ] dev 서버에서 직접 확인:
  - `draggable: false` 패널을 드래그 시도 → 안 들림
  - `droppable: false` 패널 위로 다른 패널 드래그 → preview/drop 안 됨
  - `resizable: false` 패널의 양 옆 경계 → Resizer 안 보임
  - 세 옵션을 조합한 사이드바 케이스 (`draggable: false, droppable: false, resizable: false`) 시각 확인
- [ ] 기존 동작 회귀 없음 — 옵션 안 준 패널은 이전과 동일하게 동작

#### 문서 업데이트

- [README.md](../README.md), [README.ko.md](../README.ko.md) — PanelNode 타입에 새 필드 + 사이드바 예제
- [doc/API.md](./API.md), [doc/API.ko.md](./API.ko.md) — PanelNode 인터페이스 갱신

#### 커밋 메시지 (제안)

```
feat: PanelNode에 draggable/droppable/resizable 옵션 추가

- 특정 패널을 위치 고정(사이드바 등)으로 만들 수 있도록 함
- 모두 옵셔널, 기본값 true (기존 동작 유지)
- LayoutNodeRenderer에서 인접 패널이 resizable: false면 Resizer 숨김
```

---

### 작업 순서 권장

두 작업은 독립적이지만, **작업 1을 먼저 진행하면 작업 2의 시각 확인이 더 편합니다** (TreeLayout sizing이 잡혀있어야 lock된 패널 동작 검증이 자연스러움). 다만 강제는 아닙니다.

---

## 차후 작업 (미정)

### 리팩토링 (범위 미정)

사용자가 곧 범위 지정 예정. 착수 시 별도 플랜 모드로 진입.

### 테스트 추가

- 도구 선택부터 합의 (Vitest vs Jest). devDependencies 추가는 사용자 확인 필요.
- 1차 대상 후보: `src/utils/` 순수 함수들 — `treeInsert`, `treeSplit`, `treeResize`, `treeQuery`, `treeHelpers`, `treeDirection`. 입출력이 명확해 단위 테스트 비용이 낮음.
- 렌더·드래그 테스트는 후순위.
