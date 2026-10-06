# floating-components TODO

## 진행 방식

- 변경 작업 시 플랜 모드 → 구현 → 커밋 분리 (`<type>:` 코드 / `docs:` 문서)
- 매 단계 끝에 `npm run type-check`, `npm run build` 통과
- 브라우저 검증은 `floating-demo`에서 수행
- 커밋은 항상 사용자 사전 허락 후 진행

---

## 진행 중

### PanelNode lock options (브랜치 `feat/panel-lock`)

> 구현 완료 `8872ff7`, 문서 반영 완료. 검증 중 발견한 [소스 DOM 교체 이벤트 유실 문제](#해결-드래그-중-소스-dom-교체로-종료-이벤트-유실)도 수정 완료.
> 남은 것은 실제 입력(마우스 커서·실기기 터치) 확인과 릴리스.
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

- [x] 소스 DOM 교체로 종료 이벤트가 유실되는 문제 수정 (아래 섹션)
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
  - → 수정 후 **원본(분리된) 요소에 dispatch**하는 방식으로 재검증 (아래 섹션 검증 표)

---

## 해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실

> 2026-10-01 잠금 기능 검증 중 발견, 같은 날 `feat/panel-lock`에서 수정. 터치 쪽은 0.5.0부터 있던 문제로 추정된다.
> 수정 전 재현과 수정 후 통과는 합성 이벤트로 확인했다. 실제 마우스·실기기 터치 확인은 잠금 "남은 일"에 포함.

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

### 수정 내용

종료 이벤트는 항상 원본 요소로 오므로, **리스너를 원본 요소 자체에 건다**. 떨어진 요소도 자기 자신에게 온 이벤트는 받는다.

- 마우스 — [TreeLayout.tsx](../src/components/TreeLayout.tsx)
  - 루트 `onDragStart`에서 패널 드래그(`draggingPanelId` 설정됨)인 경우에만, `e.target`(실제 소스 노드)에 `dragend` → `finishDrag` 네이티브 리스너(`once`)를 건다.
  - 루트의 React `onDragEnd`는 제거했다(중복). `finishDrag`는 멱등이라 `drop` 뒤 `dragend`로 다시 불려도 안전하다.
- 터치 — [useTouchDrag.ts](../src/hooks/useTouchDrag.ts)
  - `touchmove`/`touchend`/`touchcancel` 리스너를 `document`가 아니라 **`touchstart`의 `e.target` 노드**에 건다(`session.target`). `endSession`에서 해제한다.
  - 터치 이벤트는 시작 대상으로 고정 전달되고, 대상이 문서에 붙어 있으면 거기서 버블링되므로 `document` 리스너는 불필요하다. 중복 처리 방지 로직도 필요 없다.
- 교훈: 합성 이벤트로 검증할 때는 실제 브라우저처럼 **원본(분리된) 요소**에 dispatch해야 한다.

### 검증 (2026-10-01, 합성 이벤트를 원본 요소에 dispatch)

| 시나리오 | 원본 분리 | 수정 전 | 수정 후 |
|---|---|---|---|
| 마우스: Terminal → Editor 미리보기 → 잠긴 Sidebar에서 놓기(`dragend`만) | 예 | ❌ 미리보기·`draggingPanelId` 잔존 | ✅ 원래 배치 복귀 |
| 마우스: 같은 경우 일반 드롭 | 예 | ✅ 커밋 | ✅ 커밋 |
| 터치: 같은 경우 Sidebar(빨간 테두리)에서 놓기 | 예 | ❌ ghost·미리보기 잔존, 세션 미해제 | ✅ 취소, 다음 드래그 새 세션으로 정상 커밋 |
| 마우스·터치: Editor → 루트 오른쪽 끝(같은 부모, 리마운트 없음), 취소·커밋 | 아니오 | — | ✅ |

---

## 남은 검증

코드는 머지·배포됐으나 데모 레포 브라우저 검증이 체크되지 않은 항목.

- [ ] **직렬화 (0.3.0)** — 저장→새로고침→복원 시 레이아웃+컴포넌트 복구 / 미등록 키 시 dev 경고+빈 패널 / DnD·split·insert 후 정상
- [ ] **패널 크기 제약 (0.4.0)** — `minWidth`/`maxWidth`(가로 split), `minHeight`/`maxHeight`(세로 split)가 윈도우 리사이즈·경계선 드래그 모두에서 같은 px로 지켜지는지 / 패널보다 큰 콘텐츠가 `overflow:auto`로 스크롤되는지
- MFA 픽스처로 실입력 검수하는 계획과 결과는 [doc/qa/](./qa/README.md) 참고 (위 두 항목은 run 01의 R19에서 확인)

---

## 완료 기록

상세 내용은 [CHANGELOG](../CHANGELOG.ko.md)·[API 문서](./API.ko.md) 참고.

| 항목 | 버전 | 브랜치 | 요약 |
|---|---|---|---|
| 트리 직렬화 / persistence | 0.3.0 | `feat/component-store-serialization` | `ComponentStore` + `componentKey`로 교체 → 트리가 원시값만 담아 `JSON.stringify`/`parse`로 persistence |
| 패널 크기 제약 | 0.4.0 | `feat/panel-sizing` | `minSize`/`maxSize` → main-axis 전용 `minWidth`/`minHeight`/`maxWidth`/`maxHeight`(px) + wrapper `overflow:auto`. 초기 플랜(자식 CSS min 자동 보호)은 폐기 |
| 터치 지원 | 0.5.0 | `feat/touch-support` | 경계선 resize를 Pointer Events로 전환 + `useTouchDrag`(롱프레스 450ms·floating ghost·`elementFromPoint` 드롭) 하이브리드 경로 |
