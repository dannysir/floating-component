# REPORT — run01-tier1

> **이 문서는**
> - 한 run의 결과 요약이다: 환경, 커버리지 표, 발견 목록, 가설 판정, 수정 대기열, 통합 가이드 후보, `doc/TODO.md` 대응, 환경 한계, 2차 범위 권고.
> - 읽는 사람: 사용자(무엇을 어떤 순서로 고칠지 결정)와 수정 세션([../FIXING.md](../FIXING.md)).
> - 판정 규칙은 [../README.md](../README.md), 시나리오 정의와 사전 등록한 기대·예측은 [../mfa/BRIEF-2-inspect.md](../mfa/BRIEF-2-inspect.md)가 기준이다. 발견의 상태는 각 발견 파일의 front matter가 기준이고, 이 문서의 표는 작성 시점의 사본이다.



---

## 0. 요약

<세 줄 이내. 실행한 행 수, 발견 수(class별), 가장 심각한 발견, 실행하지 못한 것.>

| 항목 | 수 |
|---|---|
| 커버리지 행: pass / fail / blocked / not-run | <n> / <n> / <n> / <n> |
| 발견: library-bug / fixture-bug / harness-artifact / spec-question / env-limit | <n> / <n> / <n> / <n> / <n> |
| 심각도: sev-1 / sev-2 / sev-3 / sev-4 | <n> / <n> / <n> / <n> |

---

## 1. 환경

값은 `doc/qa/<run>/env.json`과 `mfa-lab/e2e/lane.json`에서 옮긴다.

| 항목 | 값 |
|---|---|
| run / 날짜(UTC) | run01-tier1 / 2026-10-07 (시작) |
| 작업 브랜치 | `qa/mfa-lab` |
| 라이브러리 트리 (`git rev-parse HEAD:src`) | `c1da6c9dc03a4811eea42c220be309e5e73b0a4a` |
| 라이브러리 커밋 (`git rev-list -1 HEAD -- src`) | `ea25ff79f24009137315938e5e2b840b1ab678cd` |
| 라이브러리 소스 (`window.__fc.lib.source`) | `src` |
| 레인 | B |
| Playwright | 1.63.0 |
| Chromium 빌드 | 153.0.8010.12 headless-shell (실행 인자 `--no-proxy-server --site-per-process`) |
| 네이티브 터치 드래그 | on (레인 규칙. S7b에서는 네이티브 드래그 미관찰) |
| Module Federation | on (`shareStrategy: 'loaded-first'`) |
| 실행 모드 | prod: 모든 앱 `vite build` + `vite preview`. 기준선: npm 0.5.1 빌드, `http://127.0.0.1:4390` |
| 뷰포트 / 병렬 | 1280x800, 배율 1 / workers 1 |
| Node | v22.22.0 |
| 사용자 GO 줄 (검수 프롬프트에서 그대로 옮김) | SPIKE.md를 읽었고 GO(caveat: 없음. 참고: cross-origin iframe 위 CDP 마우스 드래그 이벤트 미전달, OOPIF는 --site-per-process 기준)로 결정했다. |
| GO caveat 때문에 `blocked`가 된 행 | 없음 (STATE.md 환경 사실도 MF on·터치 ok·telemetry-x 로드·blocked 변형 없음) |
| 사전 점검 결과 | 스모크 통과(19 passed, 1 skipped), S1 통과, S3 통과, S5 **요구대로 실패**(I1·I2 실패 확인), S6 통과, S7a 통과. 기준선 이벤트 로그 동일 |

---

## 2. 커버리지 표

- 한 행 = 시나리오 x 변형(슬롯) x 입력. 시나리오의 정의(레이아웃, 동작)는 [BRIEF-2](../mfa/BRIEF-2-inspect.md) "시나리오 표"가 기준이다. 브리프와 행이 다르면 브리프에 맞춰 **행을 추가**한다. 행은 지우지 않는다.
- 상태는 넷 중 하나: `pass`(기대대로) / `fail(FC-QA-NNN)`(기대와 다름, 발견 있음) / `blocked(사유)`(실행할 수 없음) / `not-run(사유)`. 처음에는 전부 `not-run`이다.
- "기대 대비"는 [BRIEF-2](../mfa/BRIEF-2-inspect.md) "기대와 예측"의 판정을 적는다: `as-ideal` / `as-predicted` / `deviates`.
- 대조 사다리로 추가 실행한 변형(twin, `control-iframe`, `control-mount`, `bare-*`)은 해당 시나리오 아래에 행을 추가한다.
- Module Federation이 저하 모드면 R16과 remote 대 twin 비교 행은 `blocked(MF degraded)`다.

### 2-1. 필수 묶음 (이 순서로 실행)

| ID | 변형 (레이아웃 / 슬롯) | 케이스 | 입력 | 상태 | 기대 대비 | 관찰 기록 |
|---|---|---|---|---|---|---|
| R01 | census / 전부 control | hover | mouse | not-run | | |
| R01 | census / 전부 control | Esc | mouse | not-run | | |
| R02 | census / 전부 control | hover 후 drop (overShadow) | mouse | not-run | | |
| R03 | census / b=orders | hover + Esc, hover + drop | mouse | not-run | | |
| R03 | census / b=billing | hover + Esc, hover + drop | mouse | not-run | | |
| R03 | census / b=telemetry | hover + Esc, hover + drop | mouse | not-run | | |
| R03 | census / b=telemetry-x | hover + Esc, hover + drop | mouse | not-run | | |
| R05 | census / a=orders, b=billing, c=telemetry, d=control | 루트 가장자리(top) hover, Esc | mouse | not-run | | |
| R07 | locks / terminal=control | 소스 리마운트 후 Esc | mouse | not-run | | |
| R07 | locks / terminal=control | 잠긴 nav 위에서 놓기 | mouse | not-run | | |
| R07 | locks / output=telemetry | iframe 본문 위에서 놓기 | mouse | not-run | | |
| R07 | locks / terminal=control | workspace 여백에서 놓기 | mouse | not-run | | |
| R07 | locks / terminal=telemetry | 소스 리마운트 후 Esc | mouse | not-run | | |
| R09 | row3 / a=board | 카드를 board 안에서 열 이동 | mouse | not-run | | |
| R09 | row3 / a=board-local | 같은 동작 | mouse | not-run | | |
| R09 | board 단독 페이지 (`http://127.0.0.1:4302/`) | 같은 동작 | mouse | not-run | | |
| R10 | row3 / a=board, b=control-b | 카드를 옆 패널로: hover, drop | mouse | not-run | | |
| R10 | row3 / a=board, b=control-b | `<img>`를 옆 패널로: hover, drop | mouse | not-run | | |
| R10 | row3 / a=board-local, b=control-b | 카드, `<img>` | mouse | not-run | | |
| R12 | row3 / control-a, telemetry, telemetry-x (`iframeShield=0`) | telemetry 위 hover, 놓기 | mouse | not-run | | |
| R12 | row3 / 같은 배치 (`iframeShield=0`) | telemetry-x 위 hover, 놓기 | mouse | not-run | | |
| R12 | row3 / 같은 배치 (`iframeShield=1`) | telemetry, telemetry-x 위 hover, 놓기 | mouse | not-run | | |
| R14 | locks | terminal 터치 드래그 → editor 왼쪽 → nav 위(차단 ghost) → 놓기 | touch-cdp-handle | not-run | | |
| R14 | locks | 이어서 두 번째 드래그 | touch-cdp-handle | not-run | | |
| R16 | workbench / orders origin 차단 | 로드 | mouse | not-run | | |
| R16 | workbench / orders origin 차단 | 다른 패널 드래그·리사이즈 | mouse | not-run | | |
| R16 | workbench / orders origin 차단 | 죽은 패널을 핸들로 드래그 | mouse | not-run | | |
| R17 | workbench | 드래그 가능한 패널을 하나씩 핸들로 이동 | mouse | not-run | | |
| R17 | workbench | 모든 경계선 리사이즈 | mouse | not-run | | |
| R17 | workbench | Nav에서 board 닫기·다시 열기 (`removePanel`/`insertPanel`) | mouse | not-run | | |
| R17 | workbench | 전·후 PNG 시각 점검 (잘림, 넘침·스크롤바, 리사이저, shadow, ghost, 에러 카드) | — | not-run | | |
| R18 | workbench | 탐색 동작 약 30회 | mouse | not-run | | |
| R18 | workbench | 탐색 동작 (터치) | touch-cdp-handle | not-run | | |
| R19 | control 패널 (`persist=1`) | 저장 → 새로고침 → 복원 | mouse | not-run | | |
| R19 | control 패널 (`persist=1`) | 미등록 키 → 빈 패널 | mouse | not-run | | |
| R19 | control 패널 (`persist=1`) | 복원 후 드래그 앤 드롭 | mouse | not-run | | |
| R19 | control 패널 / 폭 1280 | min/max px: 창 크기 변경, 경계선 드래그 | mouse | not-run | | |
| R19 | control 패널 / 폭 800 | min/max px: 창 크기 변경, 경계선 드래그 | mouse | not-run | | |
| R19 | control 패널 | 패널보다 큰 내용의 스크롤 | mouse | not-run | | |

### 2-2. 둘째 묶음 (시간이 부족하면 **끝에서부터** `not-run` 가능. 이 묶음에서만 허용)

| ID | 변형 (레이아웃 / 슬롯) | 케이스 | 입력 | 상태 | 기대 대비 | 관찰 기록 |
|---|---|---|---|---|---|---|
| R04 | census / a=orders | hover + Esc | mouse | not-run | | |
| R04 | census / a=billing | hover + Esc | mouse | not-run | | |
| R04 | census / a=telemetry | hover + Esc | mouse | not-run | | |
| R06 | row3 / b=telemetry | (a) p-c → p-a 왼쪽: hover + Esc, hover + drop | mouse | not-run | | |
| R06 | row3 / b=telemetry | (b) 새 페이지, p-a → p-c 오른쪽: hover + Esc, hover + drop | mouse | not-run | | |
| R08 | census / bare | (a) stale preview 강제 (다른 패널 위에서 immediate 릴리스) | mouse | not-run | | |
| R08 | census / bare | (b) stale 상태에서 ext-chip을 패널에 놓기 | mouse | not-run | | |
| R08 | census / bare | (c) 새 페이지, stale 상태에서 경계선 리사이즈 | mouse | not-run | | |
| R11 | row3 / a=board | copy 소스 → copy 영역, `dragend`의 `dropEffect` | mouse | not-run | | |
| R11 | row3 / a=board (`lock=p-a:draggable`) | 같은 동작 | mouse | not-run | | |
| R11 | board 단독 페이지 | 같은 동작 | mouse | not-run | | |
| R13 | pair / 소스=control | 핸들 터치 드래그, ghost 생성 시점 스냅샷, 커밋 | touch-cdp-handle | not-run | | |
| R13 | pair / 소스=orders | 같은 동작 | touch-cdp-handle | not-run | | |
| R13 | pair / 소스=billing | 같은 동작 | touch-cdp-handle | not-run | | |
| R13 | pair / 소스=telemetry | 같은 동작 | touch-cdp-handle | not-run | | |
| R15 | row3 / control-a, telemetry, telemetry-x | telemetry 옆 경계선: 150px 쓸기, iframe 위에서 놓기 | mouse | not-run | | |
| R15 | row3 / 같은 배치 | telemetry-x 옆 경계선: 같은 동작 | mouse | not-run | | |

### 2-3. P1 (위 두 묶음의 발견을 모두 쓴 뒤에만. `not-run` 허용)

| 항목 | 관련 가설 | 입력 | 상태 | 관찰 기록 |
|---|---|---|---|---|
| 핸들 없는 모드의 상호작용, 남아 있는 `draggable` | H-HANDLE-STALE | mouse | not-run | |
| 드래그 가능한 패널 롱프레스 (레인 B에서만) | H-TOUCH-NATIVE-RACE | touch-cdp-longpress | not-run | |
| 크기·넘침 조합 | H-SIZING | mouse | not-run | |
| workbench에서 여러 지점을 지나는 드래그(glide) | H-REMOUNT | mouse | not-run | |
| dev 모드 host 콘솔 확인 | | mouse | not-run | |
| 패키징한 tarball로 확인 | | mouse | not-run | |

---

## 3. 발견 목록

작성 시점의 사본이다. 최신 상태는 각 발견 파일을 본다.

| ID | 제목 | 심각도 | class | status | 재현율 | 시나리오 | root_cause_group |
|---|---|---|---|---|---|---|---|
| <[FC-QA-NNN](../findings/FC-QA-NNN-slug.md)> | | | | | | | |

`predicted`였던 발견의 결과: <FC-QA-001 — 관찰됨(open으로 변경) \| 재현 안 됨(predicted 유지, 4절에 refuted) \| 실행 못 함>

---

## 4. 가설 판정

[../mfa/HYPOTHESES.md](../mfa/HYPOTHESES.md)의 모든 가설을 한 행씩 옮긴다. 아래 이름은 설계 시점의 목록이다. HYPOTHESES.md와 다르면 그쪽에 맞춘다.

- `confirmed`: 예측한 현상을 관찰함. `refuted`: 실행했고 예측과 달랐음. `untested`: 실행하지 못함(사유를 적는다).

| 가설 | 판정 | 근거 (시나리오, 관찰 기록, 발견 ID) |
|---|---|---|
| H-REMOUNT | <confirmed \| refuted \| untested> | |
| H-REINSERT | | |
| H-DRAGEND | | |
| H-RAF-STALE | | |
| H-FOREIGN-DRAG | | |
| H-DROP-HIJACK | | |
| H-IFRAME-DEAD | | |
| H-GHOST-CLONE | | |
| H-RESIZE | | |
| H-BOUNDARY | | |
| H-HANDLE-STALE (P1) | | |
| H-TOUCH-NATIVE-RACE (P1) | | |
| H-SIZING (P1) | | |
| 핸들 모드 터치 시작 조건의 문서 불일치 (사전 등록) | | |

---

## 5. 수정 대기열

`class: library-bug`이고 `status: open`인 발견만 넣는다. `root_cause_group`별로 묶는다. 같은 묶음은 한 번의 수정으로 함께 고쳐질 가능성이 크다.

권장 순서를 정하는 규칙:

1. 심각도가 높은 묶음 먼저 (묶음 안의 최고 심각도 기준).
2. `blocked_by`가 가리키는 발견이 먼저.
3. 심각도가 같으면 발견이 많이 묶인 쪽 먼저.
4. 심각도가 같으면 `harness_amplified: true`인 묶음은 뒤로 (실사용 빈도가 불확실).

| 순서 | root_cause_group | 발견 | 최고 심각도 | 추정 원인 위치 (`src` 파일:줄) | 선행 조건 (`blocked_by`) | 비고 |
|---|---|---|---|---|---|---|
| 1 | | | | | | |

### 사용자 결정 대기

`needs-user-confirmation` 또는 `spec-question`인 발견. 결정 전에는 고치지 않는다.

| ID | 물어볼 것 | 선택지 | 권고 |
|---|---|---|---|
| | | | |

### 라이브러리 수정 대상이 아닌 발견

| ID | class | 처리 |
|---|---|---|
| | <fixture-bug \| harness-artifact \| env-limit \| duplicate> | <세션에서 고침(커밋) \| HARNESS.md에 추가 \| 9절로> |

---

## 6. 통합 가이드 후보

버그가 아니라 라이브러리 사용자에게 안내할 내용이다. 발견과 섞지 않는다. 나중에 README의 재료가 된다. 아래 세 행은 설계 시점의 예상 후보(미실행)다. **관찰로 확인된 것만 남기고**, 근거 칸을 채운다.

| 후보 | 근거 (시나리오, 관찰 기록) | 권장 패턴 | 확인 여부 |
|---|---|---|---|
| iframe 내용 안에서는 패널 드래그를 시작할 수 없다 (결정 D4) | <R12, R13> | 핸들을 host가 그리고 `dragHandleSelector="[data-drag-handle]"`를 쓴다 | <확인 \| 미확인> |
| iframe 패널 위에서는 마우스 드롭 대상 판정이 되지 않는다 | <R12> | 드래그 중 `[data-dragging-panel-id] iframe { pointer-events: none }` | <확인 \| 미확인> |
| remote가 죽어도 레이아웃이 유지되려면 경계가 패널 안에 있어야 한다 | <R16> | 패널 내용마다 에러 경계·Suspense를 두고, `TreeLayout` 바깥에는 두지 않는다. 핸들은 경계 밖에 둔다 | <확인 \| 미확인> |

---

## 7. `doc/TODO.md` 대응표

[doc/TODO.md](../../TODO.md)에 남아 있는 확인 항목과 이번 run의 관계.

| TODO.md 항목 | TODO.md 위치 | 확인한 시나리오 | 결과 | 남은 수동 확인 |
|---|---|---|---|---|
| 실제 마우스로 `not-allowed` 커서 표시 확인 | "PanelNode lock options" → "남은 일" | S2, R07 (대용: `dragend`의 `dropEffect`가 `none`, `drop` 없음) | | 커서 글리프 자체 |
| 실기기로 터치 경로 확인 | 같은 곳 | S7a, R13, R14 (CDP 터치 에뮬레이션) | | 실기기 Android·iOS |
| 소스 DOM 교체 시 종료 이벤트 유실 수정을 실제 입력으로 확인 | "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실" → "확실성" | S3, S4, S5(0.5.1 양성 대조), R07, R14 | | |
| 직렬화 (0.3.0) | "남은 검증" | R19 | | |
| 패널 크기 제약 (0.4.0) | "남은 검증" | R19 | | |

---

## 8. 환경 한계와 수동 확인

이 run에서 확인할 수 없었던 것. 사용자가 직접 확인한다.

| 항목 | 클라우드에서 볼 수 없는 이유 | 수동 확인 방법 | 결과 |
|---|---|---|---|
| OS 커서 모양 (`not-allowed`) | headless 브라우저에는 커서가 없고 스크린샷에도 찍히지 않는다 | 사용자 PC에서 랩을 띄우고(`mfa-lab/README.md`) `http://127.0.0.1:4300/?layout=locks`에서 패널을 nav 위로 드래그 | <미확인> |
| 실기기 Android Chrome 터치 | CDP 에뮬레이션은 실기기가 아니다. 롱프레스 네이티브 드래그 경합은 기기에서만 확정된다 | 실기기에서 랩에 접속 (서버가 `127.0.0.1`에만 열리므로 포트 포워딩 등이 필요. 방법 미검증) | <미확인> |
| 실기기 iOS Safari 터치 | Linux의 Playwright WebKit은 iOS Safari가 아니다 | 실기기 | <미확인> |
| Firefox / WebKit 마우스 | 이번 run은 Chromium만 실행했다. Firefox에는 소스 노드가 옮겨지면 `dragend`가 오지 않는 버그 보고가 있다 ([Bugzilla 460801](https://bugzilla.mozilla.org/show_bug.cgi?id=460801)) | 사용자 PC의 Firefox에서 R07의 취소 경로 | <미확인> |
| 터치: 다른 Chromium major | 레인 하나만 실행했다. Chromium 141은 터치 롱프레스 네이티브 드래그가 꺼져 있고 153은 켜져 있다 | 다른 레인으로 S7b·R13·R14 재실행 | <미확인> |
| 브라우저 창 밖에서 놓기 | 가로챈 드래그로는 창 밖 릴리스를 만들 수 없다 | 사용자 PC에서 패널을 창 밖으로 끌고 나가 놓기 | <미확인> |
| <GO caveat 등 이번 run에서 추가된 한계> | | | |

---

## 9. 2차 범위 권고

[../mfa/ARCHITECTURE.md](../mfa/ARCHITECTURE.md) "2차 백로그"의 후보 중 무엇을 다음에 만들지 권고한다. 이번 run의 결과를 근거로 적는다.

| 후보 | 다루는 위험 | 이번 run의 근거 | 권고 (만들기 \| 보류) | 순서 |
|---|---|---|---|---|
| `mfe-alerts` (커스텀 엘리먼트 + open Shadow DOM) | | | | |
| `mfe-planner` (remote 안의 중첩 TreeLayout) | | | | |
| `mfe-audit` (React 18 mount remote) | | | | |
| 공격적 전역 CSS 플래그 | | | | |
| shadow root 안의 레이아웃 | | | | |
| 늦은 store 등록 (레이아웃이 그려진 뒤 `register`) | | | | |
| 느린 remote (지연 주입) | | | | |

---

## 10. 세션 기록

### 세션 중 고친 픽스처·하네스 결함

`mfa-lab/`을 바꾼 뒤에는 스모크와 스파이크 S1·S3·S5·S6을 다시 실행했는지 적는다.

| 무엇 | 커밋 | 재실행 결과 |
|---|---|---|
| | | |

### 브리프 변경

[BRIEF-2](../mfa/BRIEF-2-inspect.md)의 Amendments 절에 날짜와 함께 적은 변경을 여기에 요약한다. 사전 등록한 예측은 관찰 뒤에 고쳐 쓰지 않는다.

### 소요 시간과 메모

<설치·빌드·테스트 소요, 여러 세션에 걸쳤으면 세션별 범위, 다음 run에 넘길 것.>
