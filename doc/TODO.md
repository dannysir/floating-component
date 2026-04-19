# 가독성·유지보수성 리팩토링 계획

## Context

코드는 동작하지만 시간이 지나면서 읽기 어려운 구간이 쌓였다. 특히:
- `LayoutNodeRenderer.tsx` 한 컴포넌트에 panel/split 렌더링 + 드래그 + resize가 전부 인라인
- `useLayoutTree.ts`에 순수 트리 변환 로직과 상태 관리가 섞여 있음
- `treeInsert.ts`의 `insertAtAnchorDepth`(102줄)에 3가지 분기가 얽혀 있음
- `Resizer`와 `LayoutNodeRenderer`에 rAF 배치 로직이 중복
- `TreeLayout`은 같은 preview 개념을 state 1개 + ref 2개로 삼중 관리

목표: **동작·API 불변**, 내부만 정리. 각 단계는 독립적으로 커밋 가능해야 하고, 단계마다 `type-check + build` 통과해야 한다.

## 단계 구성

단계는 **의존 방향을 따라 아래→위**로 진행. 하위 레이어부터 정리해야 상위 레이어 리팩터링이 편함.

---

### Phase A — 트리 유틸 경계 정리 (`src/utils/`) ✅ 완료 (2026-04-19)

**Why**: 가장 많이 재사용되는 순수 함수. 여기가 정리되면 `useLayoutTree`와 렌더러가 자동으로 깔끔해진다.

- [x] `findPanelWithAncestors` — closure mutate 제거, 불변 누적 패턴으로 재작성 + `treeQuery.ts`로 이동.
- [x] `insertAtAnchorDepth` — 3 분기(root/target/ancestor)를 module-level `const` 헬퍼 3개로 분리, 본체는 디스패처만 남김.
- [ ] 공통 재귀 primitive 추출(insertAtTarget ↔ findAndUpdate) — **사용자 결정으로 이번에 스킵**.
- [x] 파일 경계 재정립:
  - `treeHelpers.ts` → path 기반 원시 연산(`getNodeAtPath`, `updateAtPath`, `findAndUpdate`)
  - `treeQuery.ts` → 읽기 전용 조회(`getFirstPanelId`, `getPanelIds`, `findPanelWithAncestors`)
  - `treeInsert.ts` → 구조 변환(`insertPanelIntoTree`, `insertAtAnchorDepth` + 3 private helpers)
- [x] `getRootPanelId` → `getFirstPanelId` 리네임 + 훅 반환 키 `rootPanelId` → `firstPanelId` (사용자 승인, breaking change).

**검증**: `npm run type-check` ✅ · `npm run build` ✅ · 외부 동작 불변.

---

### Phase B — `useLayoutTree` 얇게 만들기 ✅ 완료 (2026-04-19)

**Why**: 훅은 "상태 + 검증 + 디스패치"만 해야 함. 지금은 트리 변환 로직이 섞여 있어 테스트·재사용이 어렵다.

- [x] `splitPanel` 내부의 `findAndUpdate` + `insertSibling` 2단계를 **순수 함수 `splitPanelAtId`** (단일 재귀)로 추출 → `src/utils/treeSplit.ts` 신규.
- [x] `resizeBorder`의 min/max clamp 계산을 **순수 함수 `clampSplitResize`** 로 추출 → `src/utils/treeResize.ts` 신규.
- [x] 반복되는 `findPanelWithAncestors + devWarn + return prev` 패턴을 훅 내부 `withPanelCheck(prev, id, label, fn)` 헬퍼로 통일 (splitPanel/removePanel/movePanel 3곳).
- [x] `computeMoveResult` 내부 자체 `findPanel` 재귀 제거, `findPanelWithAncestors` 재사용.
- [x] `GHOST_ID` 파일 전역 상수 → `computeMoveResult` 지역 상수(후속 상수 중앙화에서 `MOVE_GHOST_ID`로 이동).

**추가 작업 (Phase B 세션에 포함)**: 흩어진 매직 넘버를 `src/constants/` 도메인별 3파일(`tree.ts`, `dropTarget.ts`, `resizer.ts`)로 중앙화. 값·동작 불변.

**검증**: `npm run type-check` ✅ · `npm run build` ✅ · 공개 API 불변.

---

### Phase C — `LayoutNodeRenderer` 컴포넌트 분리 ✅ 완료 (2026-04-19)

**Why**: 240줄 한 컴포넌트에 panel/split 두 가지 완전히 다른 렌더링 분기가 있다. `node.type` 분기는 컴포넌트 경계로 더 적합.

- [x] panel 분기 → **`src/renderers/PanelNodeRenderer.tsx`** 신규 파일로 추출. `SHADOW_STYLE`, `panelRef`, `rafRef`, 핸들러 4개(mouseDown/dragStart/dragOver/drop) 모두 이 컴포넌트로 이동. `onDragOver` 40줄 핸들러는 `useCallback` 함수로 추출해 JSX 얇게.
- [x] split 분기 → `LayoutNodeRenderer`에 현상 유지 (이름 교체는 파장이 크고 재귀 엔트리 이름으로 `LayoutNodeRenderer`가 자연스러움).
- [x] 드롭 타겟 DOM 탐색 `getNearestEdge` + `getDropTarget` → **`src/utils/dropTarget.ts`** 신규 파일로 이동 (순수 DOM 유틸). `getNearestEdge`는 내부 전용이라 export 안 함.
- [x] `ROOT_EDGE_RATIO`, `SPLIT_EDGE_RATIO`는 Phase B에서 이미 `src/constants/dropTarget.ts`로 중앙화되어 있어 중복 이동 생략, 신규 util에서 그대로 import.
- 공통 rAF 유틸화는 Phase D(`rafBatch`)로 미룸.

**검증**: `npm run type-check` ✅ · `npm run build` ✅ · 브라우저 UI 확인은 사용자가 `floating-demo`에서 수행 필요 (preview MCP는 프로젝트 루트 밖이라 자동 실행 불가).

---

### Phase D — `Resizer` 드래그 로직 훅화 + rAF 유틸 공유

**Why**: `Resizer`의 mouseDown/move/up + rAF 배치(L34-71)와 `LayoutNodeRenderer`의 onDragOver rAF(L164-169)가 같은 패턴의 중복.

- **`src/utils/rafBatch.ts`** (또는 `useRafBatch` 훅) 신규 — rAF 한 프레임당 한 번 콜백 실행하는 헬퍼.
- `Resizer.tsx:34-71` `onMouseDown` → **`useDragResize({ direction, onResize })`** 훅으로 추출.
- `Resizer.tsx:76` `style as Record<...>` 캐스트 → `setCssVar(style, name, value)` 작은 헬퍼로 정리.

**검증**: type-check + build + resize/drag 동작 확인 (Phase C와 묶어서 브라우저 확인 권장).

---

### Phase E — `TreeLayout` preview 상태 단순화

**Why**: 같은 `DropPreview` 개념을 `dropPreview`(state) + `prevPreviewRef` + `previewRef` 세 군데에서 관리 → 동기화 버그 여지.

- `TreeLayout.tsx:59-83` 세 저장소를 **단일 훅 `useDropPreview`** 로 통합. 내부에서 state + 최신값 ref 한 쌍만 관리.
- `TreeLayout.tsx:63-76` equality 체크 → 작은 helper `areDropPreviewsEqual(a, b)`.
- `resizerTheme` 객체 재생성(L96-101) → `useMemo`.

**검증**: type-check + build + 드롭 프리뷰 동작 확인.

---

### Phase F — 공개 API 점검 (`src/index.ts`)

**Why**: 훅과 util이 모두 export되어 있어 사용자가 뭘 써야 할지 모호. 변경 수반 가능 → 마지막에.

- `index.ts` 전체 export 목록을 **사용 시나리오별로 분류**하고 정말 공개할 것만 남김.
- 네이밍 일관성 리뷰 (`getRootPanelId` 등 Phase A에서 언급).
- **API 변경은 사용자 승인 후에만** 진행. 변경 시 `CHANGELOG.md` 업데이트.

**검증**: 외부 사용자 관점에서 `README.md`/`doc/library-api.md` 예제가 여전히 유효한지 확인.

---

## 진행 방식

- **단계별로 플랜 모드 → 구현 → 커밋 2개(코드/문서) 루틴**.
- 각 단계는 독립 커밋 가능. 중간에 멈춰도 트리가 깨지지 않는다.
- 시작 권장 순서: **A → B → C → D → E → F**. 사용자가 우선순위를 바꾸면 그에 맞춤.
- `doc/TODO.md`는 이번에 한 번에 업데이트하지 말고 단계마다 갱신.

## 대상 파일 요약

| Phase | 주요 파일 |
|---|---|
| A | `src/utils/treeHelpers.ts`, `src/utils/treeInsert.ts`, `src/utils/treeQuery.ts` |
| B | `src/hooks/useLayoutTree.ts` (+ A의 utils) |
| C | `src/renderers/LayoutNodeRenderer.tsx`, 신규 `src/utils/dropTarget.ts`, 신규 `src/renderers/PanelNodeRenderer.tsx` |
| D | `src/renderers/Resizer.tsx`, 신규 `src/utils/rafBatch.ts` (또는 훅) |
| E | `src/renderers/TreeLayout.tsx`, 신규 `useDropPreview` |
| F | `src/index.ts`, `CHANGELOG.md`, `README*.md` |

## 공통 검증

매 단계 끝에:
1. `npm run type-check`
2. `npm run build`
3. 관련 문서 업데이트 후 커밋 분리 (`refactor:` / `docs:`)
