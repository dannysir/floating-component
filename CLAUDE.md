# CLAUDE.md

## 프로젝트

`@dannysir/floating-components` — VS Code 스타일 트리 기반 패널 레이아웃 React 라이브러리.

## 빌드

- `npm run dev` — Vite 개발 서버
- `npm run build` — tsc && vite build
- `npm run type-check` — 타입 검사

## 코딩 규칙

- arrow function만 사용. `function` 선언 금지. 단일 JSX 반환 시 `=> ()` 사용
- named export만 사용. default export 금지
- 타입은 `import type { ... }`으로 분리
- 불변 업데이트 — spread로 새 객체 생성, 직접 mutation 금지
- 외부 라이브러리 추가 금지 (React peer dep만 허용)

## 설계 원칙

- SplitNode에 ID 추가하지 않음 — path(number[])로 식별
- 경계선 resize는 인접 두 노드만 조정
- 단일 자식 SplitNode는 자동 언래핑
- 패널 드래그: 데스크톱은 HTML5 Drag & Drop, 터치는 별도 경로(`useTouchDrag` — 롱프레스 + floating ghost) 병행
- 경계선 resize는 Pointer Events(`setPointerCapture`)로 마우스·터치·펜 단일 처리

## 검증

- 코드 변경 후 `npm run type-check` 실행
- 빌드 확인: `npm run build`
- UI 변경 시 dev 서버에서 브라우저로 직접 확인

## 작업 방식

- 구현 작업 시 계획 모드로 먼저 시작 → 승인 후 구현
- 개발 서버 기존 서버 확인 후 재사용. 새로 띄웠으면 작업 후 반드시 종료
