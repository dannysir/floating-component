# floating-components TODO

## 진행 방식

- 변경 작업 시 플랜 모드 → 구현 → 커밋 분리 (`<type>:` 코드 / `docs:` 문서)
- 매 단계 끝에 `npm run type-check`, `npm run build` 통과
- 브라우저 검증은 `floating-demo`에서 수행
- 커밋은 항상 사용자 사전 허락 후 진행

---

## 1. 트리 직렬화 / persistence — ComponentStore + componentKey  ✅ 완료

> 구현 완료 (브랜치 `feat/component-store-serialization`). 플랜 전문: `memory/project_serialization_plan.md`

### 배경

`PanelNode.component`가 React 엘리먼트라 `JSON.stringify(tree)` 시 깨짐 → 레이아웃을 localStorage에 저장·복원 불가. 구조(`id`/`size`/`direction`/중첩)는 직렬화되나 "어떤 컴포넌트가 들어가는지"가 사라짐.

### 핵심 설계 (확정)

- 라이브러리가 **ComponentStore**(key ↔ ReactNode 레지스트리) 제공, **TreeLayout prop으로 주입**
- `PanelNode.component` → **`componentKey: string`로 교체** (공존 X, **breaking change**)
- 트리가 전부 원시값 → `JSON.stringify`/`JSON.parse`만으로 persistence 성립, **별도 serialize 헬퍼 불필요**

### 변경 대상

- [src/tree/componentStore.ts](../src/tree/componentStore.ts) — **신규**. `createComponentStore(initial?)` + `ComponentStore` 타입 (`register`/`unregister`/`get`/`has`)
- [src/tree/types.ts](../src/tree/types.ts) — `PanelNode`·`InsertPanelInit`: `component` → `componentKey`
- [src/components/TreeLayout.tsx](../src/components/TreeLayout.tsx) — `components: ComponentStore` prop 추가·전달
- [src/components/LayoutNodeRenderer.tsx](../src/components/LayoutNodeRenderer.tsx) — `components` 스레딩
- [src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx) — `{node.component}` → `{components.get(node.componentKey)}`, 미등록 키 `devWarn` 후 null
- [src/hooks/useLayoutTree.ts](../src/hooks/useLayoutTree.ts) — `splitPanel`·`insertPanel`: `componentKey`
- [src/tree/move.ts](../src/tree/move.ts) — ghost `componentKey: ""`
- [src/index.ts](../src/index.ts) — `createComponentStore` / `ComponentStore` export
- 문서: README(.ko)·doc/API(.ko)·CHANGELOG(.ko) — `component`→`componentKey` 전면 교체 + persistence 섹션

### 커밋 분리

1. `feat:` ComponentStore + componentKey 교체 (store/types/렌더러/훅/move/index)
2. `docs:` README·API·CHANGELOG 업데이트

### 검증

- [x] `npm run type-check` 통과
- [x] `npm run build` 통과
- [ ] 데모 레포: 저장→새로고침→복원 시 레이아웃+컴포넌트 복구 / 미등록 키 시 경고+빈 패널 / DnD·split·insert 후 정상

---

## 2. PanelNode CSS sizing constraint

> 작업 브랜치: `feat/sizing-and-panel-lock`

### 배경

사용자가 컴포넌트를 직접 만들어 주입하는 모델에서, 컴포넌트가 자체 CSS로 표현한 `min-width`/`min-height`/`max-*`가 라이브러리에 의해 깔아뭉개지고 있음.

[src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx)의 wrapper div가 `minWidth: 0`, `minHeight: 0`을 강제해 flex item이 자식의 min-content를 무시함. 결과:

- 윈도우 리사이즈 시 사이드바가 의도한 240px 이하로 줄어듦
- DnD로 패널 추가/이동 후 자식 CSS 보호 안 됨
- `setTree`로 직접 조작 시 동일

목표: **사용자 컴포넌트의 CSS 의도를 라이브러리가 그대로 전달**해, 윈도우 리사이즈·DnD·setTree 등 모든 트리 변경 경로에서 브라우저 flex 알고리즘이 자동 보호하게 만듦.

### 변경 내용

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

### 변경 대상

- [src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx) — wrapper의 `minWidth: 0`/`minHeight: 0` 강제를 부모 direction에 따라 분기
- [src/components/LayoutNodeRenderer.tsx](../src/components/LayoutNodeRenderer.tsx) — 자식 PanelNodeRenderer에 `parentDirection` prop 전달

### 트레이드오프 (수용)

- **드래그 데드존**: 자식 CSS의 min 미만으로 드래그 시 시각적으로는 자식 CSS가 막지만 ratio 데이터는 더 작아짐. 정확한 드래그 보장이 필요하면 `PanelNode.minSize` 병행 (`clampSplitResize`가 데이터까지 보호).
- **컴포넌트 컨벤션**: 자식은 `width: 100%`, `height: 100%`로 부모를 채우도록 권장.

### 변경 안 함

- `PanelNode.minSize`/`maxSize` prop 유지 (드래그 데이터 보호용 보조 수단)
- `clampSplitResize`·`resizeBorder` 인터페이스 불변, public API 변경 0

### 검증

- [ ] `npm run type-check` / `npm run build` 통과
- [ ] 데모: 자식에 `min-width: 240px`만 주고 윈도우 리사이즈/DnD → 240 이하로 안 줄어드는지, `width: 100%` 없는 컴포넌트도 정상인지, 드래그 데드존 견딜 만한지

### 문서 업데이트

- README(.ko) — "컴포넌트 CSS로 min/max 표현 가능, `width/height: 100%` 권장" 섹션
- doc/API(.ko) — `minSize`/`maxSize`는 "드래그 데이터까지 보호하는 보조 수단"임을 명시

---

## 3. PanelNode lock options

특정 패널을 "고정 위치"(사이드바 등)로 만드는 옵션. 세 가지 독립 축:

| 옵션 | 의미 | 기본값 |
|---|---|---|
| `draggable` | 이 패널을 드래그로 들어올릴 수 있는가 | `true` |
| `droppable` | 다른 패널이 이 패널로 드롭될 수 있는가 | `true` |
| `resizable` | 인접 경계선의 resize에 참여하는가 | `true` |

### 변경 대상

- [src/tree/types.ts](../src/tree/types.ts) — `PanelNode` 타입 확장 (모두 옵셔널, 기본 true)
- [src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx) — `draggable === false`면 div `draggable=false`, `droppable === false`면 `handleDragOver`/`handleDrop` early return
- [src/components/LayoutNodeRenderer.tsx](../src/components/LayoutNodeRenderer.tsx) — 인접 두 자식 중 하나라도 `resizable === false`인 PanelNode이면 Resizer 미렌더

### 검증

- 데모: `draggable:false` 안 들림 / `droppable:false` preview·drop 안 됨 / `resizable:false` 양 옆 Resizer 안 보임 / 사이드바 케이스(셋 다 false) 시각 확인

### 커밋 메시지 (제안)

```
feat: PanelNode에 draggable/droppable/resizable 옵션 추가
```

---

## 4. 휴대폰 사용자를 위한 이벤트 추가

### 배경

라이브러리는 패널 드래그에 HTML5 Drag & Drop API만, 경계선 resize에 mouse 이벤트만 사용. **터치 기기(휴대폰/태블릿)에선 둘 다 동작하지 않음**:

- 패널 이동: HTML5 DnD(`draggable`/`dragstart`/`dragover`/`drop`, [PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx))는 터치로 발화하지 않음
- 경계선 resize: [useDragResize.ts](../src/hooks/useDragResize.ts)가 `mousedown`/`mousemove`/`mouseup`만 등록 → 터치 미동작

목표: **터치 기기에서도 패널 이동·경계선 resize가 가능**하게 만듦.

### 접근 (착수 시 결정)

- **(a) Pointer Events로 통합** — `pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`로 mouse·touch·pen 단일 경로 처리. resize(useDragResize)는 이 방식이 깔끔.
- **(b) touch 이벤트 별도 추가** — 기존 mouse/HTML5 경로 유지하고 touch 핸들러 병행.

resize는 (a) Pointer Events 전환이 유력. **패널 드래그**는 HTML5 DnD를 터치로 못 살리므로, pointer 기반 커스텀 드래그로 재작성하거나 touch 전용 경로 병행이 필요 — 범위가 커서 별도 플랜 권장.

### 검토 포인트

- 설계 원칙 "HTML5 Drag & Drop API만 사용"과 충돌 → **원칙 갱신 필요**
- 외부 라이브러리 금지 원칙 유지 → 직접 구현
- 드롭 좌표 계산([dropTarget.ts](../src/dnd/dropTarget.ts))은 `clientX`/`clientY` 기반이라 touch에서도 재사용 가능
- 스크롤 제스처와 드래그 구분 (touch-action CSS, threshold)
- 모바일 UX: 작은 화면에서 4-edge 드롭 존·Resizer 히트 영역 재고

### 변경 대상 (예상)

- [src/hooks/useDragResize.ts](../src/hooks/useDragResize.ts) — Pointer Events 전환
- [src/components/Resizer.tsx](../src/components/Resizer.tsx) — `onPointerDown` 연결
- [src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx) — 터치 드래그 경로 추가/재작성

### 검증

- 실기기/모바일 에뮬레이션: 터치로 패널 드래그 이동, 경계선 resize 동작 / 데스크톱 mouse 회귀 없음 / 스크롤과 충돌 없음
