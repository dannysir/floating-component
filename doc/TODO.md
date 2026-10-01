# floating-components TODO

## 진행 방식

- 변경 작업 시 플랜 모드 → 구현 → 커밋 분리 (`<type>:` 코드 / `docs:` 문서)
- 매 단계 끝에 `npm run type-check`, `npm run build` 통과
- 브라우저 검증은 `floating-demo`에서 수행
- 커밋은 항상 사용자 사전 허락 후 진행

---

## 진행 중

### PanelNode lock options (브랜치 `feat/panel-lock`)

> 구현 완료 `8872ff7` (푸시됨), 문서 반영 완료. **릴리스 전 아래 [알려진 문제](#알려진-문제-드래그-중-소스-dom-교체로-종료-이벤트-유실)를 먼저 해결.**
> 동작 명세는 [API → 패널 잠금](./API.ko.md#패널-잠금) 참고.

| 옵션 | `false`일 때 |
|---|---|
| `draggable` | 드래그로 들어올릴 수 없음 (HTML5 DnD·핸들 모드·터치 롱프레스) |
| `droppable` | 다른 패널을 이 위에 놓을 수 없음. 드래그 중엔 직전 미리보기 유지 + 불가 표시(마우스 `not-allowed` 커서 / 터치 ghost 빨간 테두리), 놓으면 취소 |
| `resizable` | 인접 Resizer 미렌더 |

#### 구현 요약

- [src/tree/lock.ts](../src/tree/lock.ts) — `isPanelDraggable`/`isPanelDroppable`/`canResizeBetween` (기본값 true 해석 일원화)
- [src/components/PanelNodeRenderer.tsx](../src/components/PanelNodeRenderer.tsx)
  - `draggable` 속성·핸들 모드·`dragStart` 차단
  - 잠긴 패널 `dragover`는 `dropEffect="none"` 후 return (미리보기 유지)
  - 잠긴 패널에 `data-panel-droppable="false"` 부여
- [src/hooks/useTouchDrag.ts](../src/hooks/useTouchDrag.ts) — `draggable` 옵션, `session.blocked` + ghost 스타일 토글, blocked 상태에서 `touchend` 시 취소
- [src/components/LayoutNodeRenderer.tsx](../src/components/LayoutNodeRenderer.tsx) — `canResizeBetween`일 때만 Resizer 렌더
- [src/hooks/useLayoutTree.ts](../src/hooks/useLayoutTree.ts)
  - `movePanel`/`resizeBorder`가 잠금 준수 (무시 + devWarn)
  - `insertPanel` 잠금 필드 전달
  - `splitPanel`의 `newPanel` spread로 min/max 누락도 수정

#### 남은 일

- [ ] 아래 알려진 문제 수정 (플랜 모드로 착수)
- [ ] 실제 마우스로 `not-allowed` 커서 표시 확인
  - 합성 `DataTransfer`는 `dropEffect` 쓰기가 무시돼 스크립트로는 검증 불가
- [ ] 실기기(또는 DevTools 모바일 에뮬레이션 실입력)로 터치 경로 확인
- [ ] PR → 머지 → 버전 bump(0.6.0) 시 CHANGELOG `[Unreleased]` 확정, README "최근 변경" 갱신

#### 검증 기록 (2026-10-01, 임시 플레이그라운드 + 합성 이벤트)

레이아웃 `[Sidebar(셋 다 false) | Editor | V[Terminal, Output]]`

- ✅ Sidebar `draggable=false`, Sidebar 양옆 Resizer 없음, 나머지 Resizer 정상
- ✅ 마우스: Editor 위 미리보기 → Sidebar 위에서 미리보기 유지 / 강제 `drop` 이벤트도 커밋 안 됨 / 일반 드롭 정상 커밋
- ✅ 터치: Sidebar 롱프레스 시 ghost 미생성 / Sidebar 위에서 ghost 빨간 테두리·opacity 0.4, 벗어나면 복원 / 놓으면 취소 / 일반 드롭 정상 커밋
- ✅ API: `movePanel`(source·anchor 잠금)·`resizeBorder` 모두 무시 + devWarn 3건
- ⚠️ 마우스 취소는 `dragend`를 새로 마운트된 소스 요소에, 터치 이동·종료는 `document`에 직접 dispatch해서 검증함. 실제 브라우저의 이벤트 대상과 달라, 아래 문제가 검증에서 가려졌음

---

## 알려진 문제: 드래그 중 소스 DOM 교체로 종료 이벤트 유실

> 2026-10-01 잠금 기능 검증 중 발견. 터치 쪽은 0.5.0부터 있던 문제로 추정되며, 실기기 재현은 아직 안 함.

### 현상

드래그 중 라이브 미리보기(`TreeLayout`의 `previewTree`)가 소스 패널을 **다른 부모 split으로 옮기면**, React가 소스 패널 DOM을 새로 마운트하고 원본 요소는 문서에서 떨어진다(`isConnected === false`). 예:

```
원래 트리                         미리보기 (Terminal → Editor 왼쪽)
root(H)                           root(H)
├ Sidebar                         ├ Sidebar
├ Editor                          ├ Terminal  ← 부모가 바뀌어 리마운트
└ split(V)                        ├ Editor
  ├ Terminal  ← 드래그 시작        └ Output   (단일 자식 split 언래핑)
  └ Output
```

### 원인

- 브라우저는 드래그·터치 시퀀스의 이벤트를 **시작한 원본 요소**에 계속 보낸다.
  - 터치: `touchmove`/`touchend`/`touchcancel`
  - HTML5 DnD: `dragend`
- 원본 요소가 문서에서 떨어져 있으면 이벤트 전파 경로에 `document`나 React 루트가 없다.
  - 그래서 리스너가 살아 있어도 이벤트가 닿지 않는다.
  - [useTouchDrag.ts](../src/hooks/useTouchDrag.ts) 주석("document 리스너가 살아남아 드래그가 끊기지 않는다")의 전제가 성립하지 않는다.

### 영향

- **터치**
  - `document`의 `touchmove`/`touchend`가 오지 않아 ghost가 멈추고 미리보기가 남는다.
  - 모듈 전역 `session`이 정리되지 않는다. 이후 `touchstart`가 `if (session) return`에 걸려, 새로고침 전까지 모든 터치 드래그가 막힐 수 있다.
- **마우스 (잠금 기능과 직접 관련)**
  - 잠긴 패널 위에서 놓으면 `drop` 없이 `dragend` → 루트 `onDragEnd` → `finishDrag`로 취소되도록 설계했다.
  - 그런데 `dragend`가 떨어진 원본 요소에서 발생하면 루트까지 오지 않아 미리보기가 남을 수 있다.
  - 잠금 이전에는 루트 안 어디서 놓아도 `drop`이 발생해 Esc 취소 정도에서만 드러났다. 잠금 기능으로 이 경로가 흔해졌다.

### 확실성

- 소스 DOM 교체: 플레이그라운드에서 직접 확인 (`isConnected === false`)
- 떨어진 요소의 이벤트가 `document`까지 전파되지 않음: DOM 표준 동작. 합성 이벤트로도 재현됨
- 브라우저가 떨어진 원본 요소로 `dragend`/`touchend`를 보냄: 표준 동작이라 가능성 높음. **실제 마우스·실기기 터치로는 미재현**

### 수정 방향

드래그를 시작할 때 **원본 요소 자체에도** 종료 리스너를 직접 붙인다. 떨어진 요소도 자기 자신에게 온 이벤트는 받는다.

- 마우스: `handleDragStart`에서 `e.currentTarget`에 `dragend` 리스너(`once`)를 붙여 루트의 `finishDrag`를 호출한다.
  - 루트 정리 콜백을 prop으로 내려주거나, 루트 요소에 커스텀 이벤트를 dispatch한다.
- 터치: `touchstart` 대상 요소에도 `touchmove`/`touchend`/`touchcancel`를 붙인다.
  - `document` 리스너와 병행하되, 같은 이벤트가 두 번 처리되지 않게 막는다.
- 검증은 반드시 실제 이벤트 대상 기준으로 한다.
  - 합성 이벤트를 쓴다면 **원본(분리된) 요소**에 dispatch한다.

---

## 남은 검증

코드는 머지·배포됐으나 데모 레포 브라우저 검증이 체크되지 않은 항목.

- [ ] **직렬화 (0.3.0)** — 저장→새로고침→복원 시 레이아웃+컴포넌트 복구 / 미등록 키 시 dev 경고+빈 패널 / DnD·split·insert 후 정상
- [ ] **패널 크기 제약 (0.4.0)** — `minWidth`/`maxWidth`(가로 split), `minHeight`/`maxHeight`(세로 split)가 윈도우 리사이즈·경계선 드래그 모두에서 같은 px로 지켜지는지 / 패널보다 큰 콘텐츠가 `overflow:auto`로 스크롤되는지

---

## 완료 기록

상세 내용은 [CHANGELOG](../CHANGELOG.ko.md)·[API 문서](./API.ko.md) 참고.

| 항목 | 버전 | 브랜치 | 요약 |
|---|---|---|---|
| 트리 직렬화 / persistence | 0.3.0 | `feat/component-store-serialization` | `ComponentStore` + `componentKey`로 교체 → 트리가 원시값만 담아 `JSON.stringify`/`parse`로 persistence |
| 패널 크기 제약 | 0.4.0 | `feat/panel-sizing` | `minSize`/`maxSize` → main-axis 전용 `minWidth`/`minHeight`/`maxWidth`/`maxHeight`(px) + wrapper `overflow:auto`. 초기 플랜(자식 CSS min 자동 보호)은 폐기 |
| 터치 지원 | 0.5.0 | `feat/touch-support` | 경계선 resize를 Pointer Events로 전환 + `useTouchDrag`(롱프레스 450ms·floating ghost·`elementFromPoint` 드롭) 하이브리드 경로 |
