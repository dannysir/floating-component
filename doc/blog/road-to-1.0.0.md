# 1.0.0까지: 합성 이벤트의 함정에서 실입력 검수 랩, 그리고 첫 안정 버전

> **이 문서는**
> - `@dannysir/floating-components`가 0.5.1에서 1.0.0으로 가는 동안 한 일을 블로그 글로 옮기기 위한 원고 겸 기록이다.
> - 사실은 저장소 기록(커밋, `doc/qa/` 문서, CHANGELOG)에서 옮겼다. 확인하지 못한 것은 "미확인"으로 적었다.
> - 작성: 2026-10-07. 1.0.0은 같은 날 05:52(UTC)에 npm에 배포됐다(GitHub Release 발행 → Trusted Publishing, provenance 포함).
> - 검수 랩과 상세 기록은 `qa/mfa-lab` 브랜치에 있다(main에는 없다). 아래에서 `doc/qa/...` 경로는 그 브랜치 기준이다.

---

## 제목 후보

- 합성 이벤트는 거짓말을 한다 — 패널 레이아웃 라이브러리를 실입력으로 검수하기까지
- 마이크로 프론트엔드 랩을 직접 만들어 내 라이브러리를 부숴 봤다
- 이벤트가 오지 않는 버그를 이벤트로 고칠 수는 없다 — 포인터 캡처와 `user-select` 누수
- React 레이아웃 라이브러리 1.0.0 회고

## 한 줄 요약

패널 잠금 기능을 검증하다가 "합성 이벤트로는 버그가 가려진다"는 것을 겪었다. 그래서 실제 브라우저·실제 입력으로 라이브러리를 검수하는 마이크로 프론트엔드 랩을 만들었고, 거기서 찾은 가장 심각한 버그(FC-QA-008)를 고친 뒤 1.0.0을 준비했다.

---

## 1. 배경: 어떤 라이브러리인가

- VS Code처럼 패널을 나누고, 경계선을 끌어 크기를 바꾸고, 패널을 끌어 다른 자리로 옮기는 React 레이아웃 라이브러리다.
- 레이아웃은 N-ary 트리다. split 노드는 ID 없이 경로(`number[]`)로 식별하고, 자식이 하나 남은 split은 자동으로 풀린다.
- 패널 이동은 데스크톱에서 HTML5 Drag & Drop, 터치에서는 롱프레스 + floating ghost라는 별도 경로를 쓴다. 경계선 리사이즈는 Pointer Events(`setPointerCapture`)로 마우스·터치·펜을 한 경로로 처리한다.
- 외부 의존성은 React peer dependency뿐이다.

| 버전 | 날짜 | 주요 내용 |
|---|---|---|
| 0.1.0 | 2026-04-14 | `TreeLayout`, `useLayoutTree`, 경로 기반 리사이즈, 드래그 앤 드롭 |
| 0.2.x | 2026-04-19 ~ 05-21 | `insertPanel`·패널 조회 API, 스타일 API 정리, `direction`·`width`/`height` props, Resizer 디자인, 라이브 데모 |
| 0.3.0 | 2026-05-26 | 트리 직렬화(`ComponentStore` + `componentKey`) |
| 0.4.0 | 2026-06-17 | 패널 크기 제약(`minWidth`/`maxWidth`/`minHeight`/`maxHeight`) |
| 0.5.0 | 2026-06-24 | 터치 지원, 리사이즈를 Pointer Events로 전환 |
| 0.5.1 | 2026-08-11 | npm Trusted Publishing(OIDC) + provenance |
| **1.0.0** | 2026-10-07 | 패널 잠금, 리사이즈 캡처 정리, 첫 안정 버전 |

---

## 2. 발단: 합성 이벤트가 가린 버그 (2026-10-01)

### 패널 잠금 기능

`PanelNode`에 `draggable`/`droppable`/`resizable` 옵션을 넣었다. 고정 사이드바처럼 "옮기지 못하는 패널", "위에 놓을 수 없는 패널"을 만들기 위해서다. 드롭할 수 없는 패널 위에서는 직전 미리보기를 유지한 채 불가 표시를 하고, 거기서 놓으면 `drop` 없이 `dragend`로 끝나 이동이 취소되도록 설계했다.

### 버그

드래그 중 라이브 미리보기가 소스 패널을 **다른 부모 split으로 옮기면** React가 소스 패널 DOM을 새로 마운트한다. 원래 요소는 문서에서 떨어진다(`isConnected === false`).

```
원래 트리                         미리보기 (Terminal → Editor 왼쪽)
root(H)                           root(H)
├ Sidebar                         ├ Sidebar
├ Editor                          ├ Terminal  ← 부모가 바뀌어 리마운트
└ split(V)                        ├ Editor
  ├ Terminal  ← 드래그 시작        └ Output   (단일 자식 split 언래핑)
  └ Output
```

브라우저는 `dragend`, `touchmove`/`touchend`를 **드래그를 시작한 원래 요소**로 보낸다. 그 요소가 문서에서 떨어져 있으면 이벤트가 `document`나 React 루트까지 올라가지 않는다. 그래서:

- 마우스: 잠긴 패널 위에서 놓아도 루트의 `onDragEnd`가 불리지 않아 미리보기가 남는다.
- 터치: ghost가 멈추고, 모듈 전역 세션이 정리되지 않아 새로고침 전까지 모든 터치 드래그가 막힌다(0.5.0부터 있던 문제로 추정).

### 왜 처음 검증에서 못 찾았나

처음에는 임시 플레이그라운드에서 합성 이벤트로 검증했다. 그런데 마우스 취소용 `dragend`는 **새로 마운트된** 소스 요소에, 터치 이동·종료는 `document`에 직접 dispatch했다. 실제 브라우저가 이벤트를 보내는 대상과 달랐기 때문에 버그가 그대로 통과했다.

### 수정

종료 이벤트는 항상 원래 요소로 온다. 그래서 리스너를 원래 요소 자체에 건다.

- 마우스: 루트 `onDragStart`에서 실제 소스 노드(`e.target`)에 `dragend` 리스너(`once`)를 건다.
- 터치: `touchmove`/`touchend`/`touchcancel`을 `document`가 아니라 `touchstart`의 대상 노드에 건다.

**교훈: 합성 이벤트로 검증하려면 실제 브라우저와 같은 노드에 보내야 한다. 더 나은 방법은 합성 이벤트를 쓰지 않는 것이다.** 이 교훈이 다음 단계의 출발점이 됐다.

---

## 3. 실입력 검수 랩 만들기

### 목표

1. 이 라이브러리가 실제로 쓰일 법한 환경, 즉 여러 팀이 따로 만든 화면을 한 페이지에 붙이는 **마이크로 프론트엔드(MFA)** 환경을 저장소 안에 처음부터 만든다.
2. 실제 브라우저에서 **실제 입력**(마우스 드래그, 경계선 리사이즈, 터치)으로 검수한다.
3. 문제 1건당 문서 1개로 남기고, 이후 하나씩 고친다.

### 일을 나눈 방식

| 단계 | 누가 | 한 일 |
|---|---|---|
| 0. 설계 문서 | 로컬 세션 (2026-10-02~06) | 랩 설계, 판정 규칙, 시나리오, 작업 지시서만 작성. 코드는 만들지 않음 |
| 1. 구축 | 클라우드 세션 1 (2026-10-07, 약 40분) | `mfa-lab/` 구축, 하네스 스파이크(S0~S10), GO 권고 |
| (사이) | 사람 | 스파이크 결과를 읽고 GO 결정 |
| 2. 검수 | 클라우드 세션 2 (같은 날, 약 1시간 30분) | 시나리오 R01~R19 실행, 발견 12건 기록, 회귀 스펙 작성 |
| 3. 수정 | 로컬 Windows PC 세션 | 발견을 1건씩 수정(이번에는 FC-QA-008) |

긴 자율 작업이 중간에 끊겨도 이어갈 수 있게 몇 가지를 정해 두었다.

- 진행 상태는 체크포인트 문서(`doc/qa/mfa/STATE.md`) 하나만 기준으로 삼는다.
- 단계마다 커밋하고 푸시한다.
- 미리 정한 "중단 조건"에 걸리면 `BLOCKED.md`를 쓰고 멈춘다.

### 랩 구성: Harbor Workbench

가상의 운영 대시보드를 만들었다. 각 화면은 따로 빌드·배포되는 앱이다.

| 앱 | 붙는 방식 | 무엇을 시험하나 |
|---|---|---|
| `shell` | host. 라이브러리의 유일한 소비자 | 레이아웃 전체 |
| `mfe-orders` | Module Federation remote(같은 React 트리) | 리마운트 시 상태 유실 |
| `mfe-board` | Module Federation remote, 자체 HTML5 DnD 칸반 | 패널 내부 드래그와 패널 드래그의 충돌 |
| `mfe-billing` | `mount`/`unmount` 방식, 자기 React | React 트리가 다른 remote |
| `mfe-telemetry` | iframe. `127.0.0.1`(same-site)과 `localhost`(cross-site) 두 가지 | iframe 재로드, cross-origin iframe(OOPIF) 위 입력 |

- 기준선으로 npm에 배포된 0.5.1 빌드를 따로 띄운다(포트 4390).
- 판정은 prod 빌드(`vite build` + `vite preview`)로만 한다.

### 하네스: "진짜 입력"을 지키는 규칙

- Playwright 1.63.0 + Chromium 153 headless shell. 레인(브라우저·Playwright 버전 조합)을 파일로 고정하고 조용히 바꾸지 않는다.
- 마우스는 `page.mouse`(CDP 입력), 터치는 CDP `Input.dispatchTouchEvent`로 보낸다. **합성 `dispatchEvent`와 `locator.dragTo`는 금지**했다.
- cross-site iframe을 실제 Chrome처럼 별도 프로세스(OOPIF)로 만들려고 `--site-per-process`를 켰다. headless shell은 기본으로 사이트 격리를 하지 않는다.
- 페이지에 프로브를 심어 이벤트, 마운트 수, iframe 로드 수를 기록한다. 매 동작 뒤에는 불변식 I1~I7을 검사한다(미리보기 잔존 없음, `userSelect` 복원 등).
- **양성 대조(S5):** 하네스가 버그를 "잡을 수 있는지"부터 확인했다. 이미 알고 있는 버그(위 2절)가 있는 npm 0.5.1에 같은 시나리오를 돌려 불변식이 **실패해야** 통과로 쳤다. 실패를 못 잡는 하네스는 통과를 보증하지 못하기 때문이다.
- 대조 사다리: 같은 시나리오를 remote 대신 단순한 대조 패널(로컬 twin, 대조 mount, 대조 iframe, 빈 패널)로도 돌린다. 문제가 라이브러리 탓인지 픽스처 탓인지 가르기 위해서다.

### 회귀 스펙과 `test.fail()`

발견마다 회귀 스펙을 하나씩 만들었다. 스펙은 **이상적인 동작**을 단언하고 `test.fail()`로 감싼다.

| 스펙 본문 | `test.fail()`이 있을 때 | 뜻 |
|---|---|---|
| 단언 실패 | 통과로 집계 ("예상대로 실패") | 버그가 아직 있다 |
| 통과 | 실패로 보고 ("Expected to fail, but passed") | 버그가 사라졌다 |

이렇게 하면 전체 회귀 스위트가 늘 초록이면서도, 어떤 버그가 남아 있는지를 그대로 기록한다. 고치는 쪽 절차는 이렇다.

1. 고치기 전에 "예상대로 실패"를 2번 본다(이 환경에서 재현된다는 증거).
2. 고친 뒤 "예상과 달리 통과"를 본다.
3. 그다음 `test.fail()` 한 줄만 지운다.

"예상대로 실패"는 이유를 가리지 않으므로, 실패가 오라클 단언에서 났는지도 꼭 확인한다.

---

## 4. 검수 결과 (run 01)

- 커버리지 79행: pass 16, fail 59, blocked 0, not-run 4
- 발견 12건: 라이브러리 버그 7, 사양 질문 4(사용자 결정 대기), 하네스 부작용 1

| ID | 내용 | 심각도 |
|---|---|---|
| FC-QA-008 | 경계선 리사이즈가 포인터 캡처를 잃으면 `user-select: none`이 남고 그 경계선을 다시 잡을 수 없다 | sev-1 |
| FC-QA-001 | 드래그 미리보기가 드래그하지 않은 패널까지 리마운트한다 | sev-2 |
| FC-QA-002 | 미리보기가 다른 패널을 DOM에서 뗐다 붙여 스크롤을 잃게 하고 iframe을 다시 로드시킨다 | sev-2 |
| FC-QA-003 | 패널 내용(칸반 카드)의 네이티브 드래그가 패널 드래그로 처리된다 | sev-2 |
| FC-QA-009 | 드롭 직전 예약된 미리보기(rAF)가 드래그가 끝난 뒤 실행된다 | sev-2 |
| FC-QA-010 | 경계선 드래그의 최소·최대 한계가 설정 px과 다르다 | sev-3 |
| FC-QA-005 | iframe 패널이 마우스로는 드롭 대상이 안 되고 터치로는 된다 | sev-3 |
| FC-QA-004·007·011·012 | 사양 질문: 비패널 드래그 투명성, 핸들 터치 시작 조건, 터치 ghost 복제, 패널 모드의 내용 제스처 | 결정 대기 |
| FC-QA-006 | (하네스) OOPIF 위 CDP 드래그 릴리스에서 `dragend`가 오지 않음 | 하네스 |

글감으로 쓸 만한 관찰:

- 미리보기 렌더링이 형제 인덱스를 key로 써서, 드래그하지 않은 패널까지 리마운트·재삽입된다(FC-QA-001·002). remote 앱 입장에서는 "아무것도 안 했는데 상태가 날아가는" 버그다.
- 같은 iframe이라도 same-site냐 cross-site냐에 따라 입력이 다르게 흐른다(FC-QA-008, FC-QA-006).

---

## 5. FC-QA-008: 이벤트가 오지 않는 버그

### 증상

`telemetry`(same-site iframe)와 `telemetry-x`(cross-site, OOPIF) 사이 경계선을 OOPIF 쪽으로 끌면 다음 일이 생긴다.

- 크기가 바뀌지 않는다.
- 끝난 뒤 `body.style.userSelect`가 `none`으로 남는다. 새로고침 전까지 페이지 전체에서 텍스트 선택이 안 된다.
- 같은 경계선을 다시 잡아도 반응하지 않는다.
- 이후 **다른** 경계선의 리사이즈는 동작하지만, 끝나도 `userSelect`가 `none`이다. 시작할 때 저장한 "이전 값"이 이미 새어 나온 `none`이었기 때문이다.

### 원래 코드의 구조

```ts
// 시작: pointerdown
if (activePointerId.current !== null) return;   // 진행 중 세션이 있으면 무시
el.setPointerCapture(pointerId);
const prevUserSelect = document.body.style.userSelect;
document.body.style.userSelect = "none";
// 정리는 Resizer 요소에 온 pointerup / pointercancel에서만
el.addEventListener("pointerup", finish);
el.addEventListener("pointercancel", finish);
```

세션 상태와 전역 부작용(`userSelect`)이 **Resizer에 도착해야 하는 종료 이벤트**에만 묶여 있다. 종료 이벤트가 오지 않으면 세션이 영원히 끝나지 않는다.

### 진단: top 프레임에는 아무것도 오지 않았다

처음 가설은 흔한 처방이었다. `lostpointercapture`, `blur`, unmount 정리를 추가하자는 것이다. 하지만 고치기 전에 top 프레임이 실제로 무엇을 받는지 기록해 봤다.

| 방향 | top 프레임이 받은 이벤트 |
|---|---|
| same-site 쪽으로 끌기(정상) | `pointerdown` → (첫 이동과 함께) `gotpointercapture` → `pointermove` ×10 → `pointerup` → `lostpointercapture` |
| OOPIF 쪽으로 끌기(버그) | `pointerdown` → **끝.** `gotpointercapture`도 `lostpointercapture`도 `pointerup`도 없다. 다음 이벤트는 다시 경계선 위로 돌아왔을 때의 `pointermove`(버튼 0) |

`setPointerCapture()`는 예외 없이 끝났고 `hasPointerCapture()`도 true였다. 그런데 이후 입력은 전부 iframe 문서로 갔다.

여기서 결론이 났다. **종료 이벤트를 더 많이 듣는 방식으로는 고칠 수 없다.** 들을 이벤트가 하나도 없기 때문이다. 회귀 스펙은 첫 리사이즈 직후 `userSelect`를 바로 확인하는데, 그 사이 top 프레임에는 신호가 전혀 없다.

### 수정: 부작용을 "캡처의 수명"에 묶는다

Pointer Events 사양에서 포인터 캡처는 시작(`gotpointercapture`)과 끝(`lostpointercapture`)이 짝을 이룬다. 캡처가 실제로 유효해지면 시작 이벤트가 오고, 풀리면 반드시 끝 이벤트가 온다. 그래서 전역 부작용을 이 짝에 묶었다.

```ts
// userSelect는 캡처가 유효한 동안만 바꾼다
const onGotCapture = (ev: PointerEvent) => {
  if (ev.pointerId !== pointerId) return;
  hasCapture.current = true;
  if (prevUserSelect !== null) return;
  prevUserSelect = document.body.style.userSelect;
  document.body.style.userSelect = "none";
};
el.addEventListener("gotpointercapture", onGotCapture);
el.addEventListener("lostpointercapture", onEnd);   // 캡처가 끝나면 정리
```

- 캡처를 한 번도 얻지 못한 세션은 `userSelect`를 바꾸지 않았으니 새는 것도 없다.
- 남은 세션은 다음 신호에서 정리한다.
  - 버튼이 떼어진 `pointermove`(`buttons === 0`)
  - 새 `pointerdown`: 캡처가 유효한 세션은 지금처럼 무시하고(멀티터치 보호), 캡처를 얻지 못한 세션은 정리하고 새로 시작한다.
- `pointerup`/`pointercancel`에 더해 창 `blur`와 unmount에서도 정리한다. unmount 때는 대기 중인 리사이즈를 반영하지 않는다.

### 결과

- 수정 전: 회귀 스펙 2/2 "예상대로 실패"(`userSelect`가 `""`가 아니라 `"none"`)
- 수정 후: 첫 시도에서 "예상과 달리 통과". `test.fail()`을 지운 뒤 2/2 통과
- 전체 확인
  - 스모크 19 passed·1 skipped
  - 회귀 mouse·touch 모두 이 발견만 통과하고 나머지는 "예상대로 실패"(다른 동작을 깨뜨리지 않음)
  - 스파이크 전체 통과
- 정상 경로의 동작(리사이즈 중 `userSelect: none`, 끝나면 복원)은 스파이크 S6이 그대로 확인한다.
- **미확인:** CDP 입력이 OOPIF 위에서 host의 포인터 캡처를 따르지 않는 것이 실제 마우스를 쓰는 Chrome과 같은지는 확인하지 못했다. 다만 "종료 이벤트가 안 오면 정리가 영영 안 되는 구조"는 트리거와 상관없는 코드 문제였다(창 밖에서 떼기, 캡처를 가로채는 다른 코드 등).

---

## 6. 곁가지: Windows에서 랩 돌리기

랩은 클라우드(Linux)에서만 돌아 봤고 Windows에서는 처음이었다. 첫 명령에서 바로 멈췄다.

| 문제 | 원인 | 대처 |
|---|---|---|
| `ctl up`이 `spawn EINVAL`로 즉시 종료 | `execFile('npm.cmd')`를 `shell` 없이 실행. Node 18.20.2/20.12.2 이후 보안 수정(CVE-2024-27980)으로 Windows에서 `.cmd`를 셸 없이 실행하면 동기 예외가 난다 | win32의 `.cmd`는 `shell`로 실행하고 동기 예외도 잡는다 |
| `ctl smoke`가 `OK` 출력 뒤 종료 코드 127 | 종료 시 libuv assertion(`src\win\async.c`). `process.exit()`이 fetch 핸들이 닫히는 도중에 불린 것으로 추정 | `process.exit()` 대신 `process.exitCode`로 자연 종료 |

이 과정에서 지킨 규칙이 오히려 글감이다.

- 절차상 "하네스를 고쳐서 통과시키지 않는다"가 원칙이라, 바로 고치지 않고 `BLOCKED.md`를 쓰고 멈춰 사람에게 보고했다.
- 사람이 승인한 뒤 라이브러리 수정과 **별도 커밋**으로 고쳤다.
- 하네스 수정 전후로 대상 회귀 스펙의 결과가 같다는 것(같은 단언에서 "예상대로 실패")을 보였다. 환경 복구가 테스트 결과를 바꾸지 않았다는 증거다.
- 한글 경로(`C:\SSAFY\서산\...`), Windows용 optional 패키지, Module Federation 빌드는 걱정과 달리 문제가 없었다.

---

## 7. 브랜치 전략: 테스트 도구는 main에 넣지 않는다

랩은 약 500개 파일이다. npm 패키지에는 들어가지 않지만(`files`가 `dist`·README·LICENSE로 한정), 라이브러리 저장소의 main을 깔끔하게 두고 싶었다.

| 브랜치 | 내용 | 역할 |
|---|---|---|
| `main` | 라이브러리와 사용자 문서 | 배포 기준 |
| `qa/mfa-lab` | main + 랩(`mfa-lab/`, `doc/qa/`) | 테스트 전용 |

- 변경은 main → `qa/mfa-lab` 한 방향으로만 흐른다(`git merge main`).
- 랩에서 고친 라이브러리 커밋은 `src/`만 담도록 절차로 분리해 두었다. 그래서 그 커밋 하나만 main에 cherry-pick하면 된다.
- 랩은 라이브러리를 커밋 해시가 아니라 `src/` 폴더 내용의 해시(`git rev-parse HEAD:src`)로 식별한다. cherry-pick으로 커밋 해시가 달라져도, 머지 뒤에 같은 코드를 테스트하고 있는지 내용으로 확인된다.
- 자주 받는 질문: "main에는 테스트 도구가 없으니 qa에 머지하면 지워지지 않나?" 지워지지 않는다. git 머지는 갈라진 지점 이후 **각 브랜치가 한 변경**을 합친다. main은 테스트 도구를 지운 적이 없으므로(처음부터 없었다) qa의 파일은 그대로다.
  - 지워지는 경우는 qa를 main에 한 번 머지했다가 main에서 지웠을 때뿐이다.
  - `git checkout main -- .`처럼 파일을 통째로 덮어쓰는 명령을 쓸 때도 마찬가지다.

---

## 8. 1.0.0

### 왜 1.0.0인가

트리 레이아웃, 경계선 리사이즈, 드래그 앤 드롭, 직렬화, 크기 제약, 터치, 패널 잠금까지 처음 그린 핵심 기능이 모두 갖춰졌다. 그리고 실입력 검수를 한 바퀴 돌았다. 이 시점을 "큰 단계를 끝냈다"는 의미로 1.0.0으로 정했다.

- 이제부터 공개 API의 호환성을 깨는 변경은 메이저 버전에서만 한다.
- 0.5.x에서 올릴 때 코드 수정은 필요 없다.

### 릴리스에 들어간 것

- 패널 잠금 `draggable`/`droppable`/`resizable`, 잠금을 지키는 `movePanel`/`resizeBorder`
- 수정: 미리보기 리마운트 시 드래그 종료 이벤트 유실(2절), 포인터 캡처 유실 시 `user-select` 누수(5절), `splitPanel`의 `newPanel` min/max 누락

### 배포 흐름 (Trusted Publishing)

1. `release/1.0.0` → main PR 머지
2. main에서 `npm version major`로 버전 커밋과 `v1.0.0` 태그를 만들고 `git push origin main --follow-tags`
3. GitHub Release `v1.0.0` 발행. 워크플로가 `release: published`에서만 돌기 때문에, 버전 푸시만으로는 배포되지 않는다.
4. GitHub Actions가 OIDC로 npm에 인증해 provenance와 함께 게시한다. npm 토큰을 저장소에 두지 않는다.

실제 배포에서 겪은 일:

- 2026-10-07 05:52(UTC)에 게시됐다. 레지스트리의 `gitHead`가 버전 커밋(`4665387`)과 같고, SLSA v1 provenance가 붙었다.
- 게시 직후 npmjs.com 패키지 페이지는 한동안 0.5.1("11 Versions")로 남아 있었다. 레지스트리는 이미 `latest` = 1.0.0, 12개 버전이었고, 빈 프로젝트에서 `npm install`하면 1.0.0이 설치됐다. 웹 페이지는 레지스트리와 별도로 색인되어 늦게 반영된다. 이때 다시 배포하려고 하면 안 된다(같은 버전은 다시 올릴 수 없다).

---

## 9. 배운 것

1. **합성 이벤트는 이벤트의 "대상"까지 흉내 내지 못하면 거짓 통과를 만든다.** 가능하면 실제 입력(CDP)을 쓴다.
2. **하네스가 실패를 잡을 수 있는지부터 증명한다.** 알려진 버그가 있는 버전(양성 대조)에서 실패하지 않는 테스트는 믿지 않는다.
3. **`test.fail()` 회귀 스펙은 "남은 버그 장부"다.** 스위트는 초록을 유지하면서 버그가 사라지는 순간을 정확히 알려 준다.
4. **고치기 전에 신호를 관찰한다.** FC-QA-008은 "정리 이벤트를 더 듣자"라는 처방이 통하지 않는 버그였다. top 프레임이 받는 이벤트를 먼저 기록하고 나서야 부작용을 캡처 수명에 묶는다는 방향이 나왔다.
5. **환경 문제는 라이브러리 수정과 섞지 않는다.** 멈추고, 보고하고, 승인받고, 따로 커밋하고, 전후 결과가 같다는 것을 보인다.
6. **긴 자율 작업에는 체크포인트 문서와 중단 조건이 필요하다.** 세션이 끊기거나 예상 밖 상황이 와도 어디서 왜 멈췄는지 남는다.

---

## 10. 남은 일 (2026-10-07 기준)

- 라이브러리 버그 6건 open: FC-QA-001·002·003·009(sev-2), 010·005(sev-3). 수정 대기열은 `qa/mfa-lab`의 `doc/qa/run01-tier1/REPORT.md` 5절.
- 사용자 결정 대기 4건: FC-QA-004·007·011·012.
- 수동 확인
  - 실제 Chrome에서 OOPIF 쪽 리사이즈
  - 패널 잠금의 `not-allowed` 커서와 실기기 터치
- Windows PC에서 기록용 스파이크 S8(rAF 경합 비율)의 한 칸이 클라우드와 달랐다(settled × other-droppable 6/10 → 2/10). 리사이즈와 무관한 드래그 앤 드롭 타이밍 차이로 보이며, 미확인이다.

---

## 부록: 참고 기록

| 항목 | 위치 |
|---|---|
| 검수 절차·판정 규칙 | `qa/mfa-lab`: `doc/qa/README.md`, `doc/qa/FIXING.md` |
| 랩 설계 | `qa/mfa-lab`: `doc/qa/mfa/ARCHITECTURE.md`, `doc/qa/mfa/HARNESS.md` |
| 스파이크·검수 결과 | `qa/mfa-lab`: `doc/qa/run00-spike/SPIKE.md`, `doc/qa/run01-tier1/REPORT.md` |
| 발견 문서 | `qa/mfa-lab`: `doc/qa/findings/FC-QA-001`~`012` |
| 진행 체크포인트 | `qa/mfa-lab`: `doc/qa/mfa/STATE.md` |
| Windows 중단 기록 | `qa/mfa-lab`: `doc/qa/BLOCKED.md`(해소됨) |

| 커밋 | 내용 | 브랜치 |
|---|---|---|
| `8872ff7` | 패널 잠금 옵션 | `feat/panel-lock` |
| `ea25ff7` | 드래그 중 소스 패널 리마운트 시 종료 이벤트 유실 수정 | `feat/panel-lock` |
| `5ab2a06` | Windows에서 `ctl up`·`smoke` 실패 수정(하네스) | `fix/fc-qa-008-resize-capture-cleanup` |
| `caa911f` | FC-QA-008 수정(검수 쪽 원본) | `fix/fc-qa-008-resize-capture-cleanup` |
| `2decb5f` | FC-QA-008 수정(cherry-pick) | `release/1.0.0` |
| `00fbf78` | FC-QA-008 회귀 스펙 `test.fail()` 제거 | `fix/fc-qa-008-resize-capture-cleanup` |
| `7fc519f` | `release/1.0.0` 머지 (PR #15) | `main` |
| `4665387` | 버전 1.0.0 (`npm version major`, 태그 `v1.0.0`) | `main` |
