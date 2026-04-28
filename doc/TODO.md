# floating-components TODO

## 진행 방식

- 변경 작업 시 플랜 모드 → 구현 → 커밋 분리 (`<type>:` 코드 / `docs:` 문서)
- 매 단계 끝에 `npm run type-check`, `npm run build` 통과
- 브라우저 검증은 `floating-demo`에서 수행

## 다음 작업

### 리팩토링 (범위 미정)

사용자가 곧 범위 지정 예정. 착수 시 별도 플랜 모드로 진입.

### 테스트 추가

- 도구 선택부터 합의 (Vitest vs Jest). devDependencies 추가는 사용자 확인 필요.
- 1차 대상 후보: `src/utils/` 순수 함수들 — `treeInsert`, `treeSplit`, `treeResize`, `treeQuery`, `treeHelpers`, `treeDirection`. 입출력이 명확해 단위 테스트 비용이 낮음.
- 렌더·드래그 테스트는 후순위.

## 완료 기록

- **2026-04-19 — Phase A~F 리팩토링**: 트리 유틸 경계 정리(A), `useLayoutTree` 슬림화(B), `LayoutNodeRenderer` 컴포넌트 분리(C), `Resizer` 드래그 훅화 + rAF 유틸 공유(D), `TreeLayout` 프리뷰 상태 단일화(E), 공개 API 점검(F). 외부 API·동작 불변. 상세는 git log 및 `CHANGELOG.md` 참조.
- **2026-04-27 — `direction` prop + 트리 정규화 (Unreleased)**: `TreeLayout`에 `direction?: "vertical" | "horizontal" | "complex"` (기본 `"complex"`) 추가. 축-제한 분류로 단일 축 드롭, 입력 트리에 충돌 split 있으면 자동 정규화 + dev 경고. 상세는 `CHANGELOG.md` Unreleased 항목 참조.
