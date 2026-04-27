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

### Phase D — `Resizer` 드래그 로직 훅화 + rAF 유틸 공유 ✅ 완료 (2026-04-19)

**Why**: `Resizer`의 mouseDown/move/up + rAF 배치와 `PanelNodeRenderer.handleDragOver`의 rAF가 같은 "프레임당 한 번 실행" 패턴의 중복.

- [x] **`src/utils/rafBatch.ts`** 신규 — `createRafScheduler()` 팩토리. `schedule/cancel/isPending` 3개 메서드로 coalesce 패턴 캡슐화.
- [x] **`src/hooks/useDragResize.ts`** 신규 — `Resizer`의 mouseDown + document mousemove/up + rAF 배치 + mouseup flush를 훅으로 추출.
- [x] `Resizer.tsx` 본체 축소 — 드래그 상태 머신 제거, `useDragResize(direction, onResize)` 호출 1줄로 대체. CSS var 대입은 module-level `setCssVar` 헬퍼로 분리.
- [x] `PanelNodeRenderer.tsx` `rafRef` → `schedulerRef.current = createRafScheduler()`로 공유 유틸 사용.

**추가 작업 (Phase D 세션에 포함)**: 유니온 리터럴 중앙화. `src/constants/layout.ts` 신규 (`HORIZONTAL`/`VERTICAL`/`LEFT`/`RIGHT`/`TOP`/`BOTTOM`). `types.ts`의 `SplitDirection`/`DropPosition`을 `typeof` 기반으로 재정의해 값·타입 단일 소스화. `as const` 없이도 `const x = "literal"`은 리터럴 타입으로 추론됨을 확인. 비교 사용처(`treeInsert.ts`, `LayoutNodeRenderer.tsx`, `Resizer.tsx`, `useDragResize.ts`) 모두 상수로 치환. `LayoutNode.type` 태그는 discriminated union narrowing을 위해 리터럴 유지.

**검증**: `npm run type-check` ✅ · `npm run build` ✅ · 공개 API 불변 · 브라우저 확인은 사용자가 `floating-demo`에서 수행.

---

### Phase E — `TreeLayout` preview 상태 단순화 ✅ 완료 (2026-04-19)

**Why**: 같은 `DropPreview` 개념을 `dropPreview`(state) + `prevPreviewRef` + `previewRef` 세 군데에서 관리 → 동기화 버그 여지.

- [x] `TreeLayout.tsx`의 세 저장소(state + 2 ref)를 **단일 훅 `useDropPreview`** 로 통합. 내부에서 state + `latestRef` 한 쌍만 관리.
- [x] equality 체크 → 훅 내부 private helper `areDropPreviewsEqual(a, b)`로 흡수(`setPreview`가 같은 값이면 자동 스킵).
- [x] `resizerTheme` 객체 재생성 → `useMemo` 안정화.
- 훅은 내부 전용. `src/index.ts` export 변경 없음.

**검증**: `npm run type-check` ✅ · `npm run build` ✅ · 브라우저 드롭 프리뷰 확인은 사용자가 `floating-demo`에서 수행.

---

### Phase F — 공개 API 점검 (`src/index.ts`) ✅ 완료 (2026-04-19)

**Why**: 훅과 util이 모두 export되어 있어 사용자가 뭘 써야 할지 모호. 변경 수반 가능 → 마지막에.

- [x] `index.ts` export 목록을 **사용 시나리오별 4구역 주석**(Types / Component / Hook / Tree utilities)으로 그룹화. 공개 대상은 `doc/API.md`와 정확히 일치하므로 항목 추가/삭제 없음.
- [x] 네이밍 일관성 리뷰 — `getRootPanelId → getFirstPanelId` 리네임은 Phase A에서 이미 완료. 나머지(`getPanelIds`, `insertPanelIntoTree`, 훅의 `insertPanel` 등)도 현 상태 유지가 적절하다고 판단(설계 근거: util은 `IntoTree` 접미사로 훅 메서드와 구분).
- [x] **공개 API 실질 변경 없음** → `CHANGELOG.md` 추가 엔트리 불필요.

**검증**: `npm run type-check` ✅ · `npm run build` ✅ · `doc/API.md` 예제 import 경로(`TreeLayout`, `useLayoutTree`, `getFirstPanelId`, `getPanelIds`, `insertPanelIntoTree`) 모두 유지됨을 수동 확인.

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

---

# 향후 기능 후보

리팩토링 Phase A~F 완료 이후 신규 기능 아이디어. 착수 시 별도 플랜 모드로 진입해 네이밍·정책을 재확정하고 진행.

## `TreeLayout` 방향 옵션 (`direction` prop) ✅ 완료 (Unreleased)

**구현 결과**:

- `TreeLayout`에 `direction?: "vertical" | "horizontal" | "complex"` prop 추가, 기본 `"complex"` (기존 동작 유지)
- 충돌 정책: **거부** — 금지 방향 drop은 preview/이동 모두 무시
- `useLayoutTree.splitPanel(...)` 직접 호출은 제약 없음 (호출자 책임)
- 필터링은 `PanelNodeRenderer`의 `handleDragOver` / `handleDrop`에서 적용 (`getDropTarget`은 순수 유틸 유지)
- Resizer 방향은 트리 노드의 `direction`을 그대로 따라가므로 본 prop이 split을 제약하면 Resizer는 자동으로 한 방향만 표시됨
