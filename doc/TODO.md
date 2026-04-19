# TODO — 리팩토링 계획

## 1. `dev/` 디렉토리 제거

로컬 데모용 코드는 라이브러리 배포에 불필요. 모두 제거한다.

- [x] `dev/demo/`, `dev/testComponents/` 디렉토리 삭제
- [x] `index.html` 삭제 (`/dev/demo/main.tsx`만 참조)
- [x] `package.json` scripts에서 `"dev"`, `"preview"` 제거
- [x] `tsconfig.json` `include`에서 `"dev"` 제거 → `["src"]`만 남김
- [x] 라이브러리 `files`/publish 영향 없음 확인 (이미 `dist`만 포함)

## 2. props 타입 선언 방식 통일

모든 컴포넌트에서 **파일 상단에 `interface XxxProps`** 로 선언하고, 함수 시그니처에서는 `({ ... }: XxxProps) =>` 형태로 사용한다.

- [x] `src/renderers/LayoutNodeRenderer.tsx` — 인라인 타입(L94-104)을 상단 `interface LayoutNodeRendererProps`로 추출
- [x] `src/renderers/TreeLayout.tsx` — 이미 준수 (확인만)
- [x] `src/renderers/Resizer.tsx` — 이미 준수 (확인만)
- [x] `DropPreview`, `ResizerTheme`(LayoutNodeRenderer.tsx L15-27)은 props가 아닌 재사용 타입 — 현 위치 유지

## 3. 검증

- [x] `npm run type-check`
- [x] `npm run build`
