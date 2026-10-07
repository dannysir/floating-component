# SPIKE — run 00 하네스 스파이크 (세션 1)

> 이 문서는
> - 클라우드 세션 1([BRIEF-1-build.md](../mfa/BRIEF-1-build.md))이 하네스 스파이크 S0~S10의 결과, 이벤트 로그 기준선, HANDOFF, GO/NO-GO 권고를 적는 곳이다.
> - 관찰한 것만 사실로 쓴다. 실행하지 않은 것은 "미실행", 추정은 "추정"으로 표시한다. 결과마다 실행 커밋(short hash)을 적는다.
> - 읽는 사람: 사용자(GO 결정), 세션 2(B2-00 사전 점검).

## 1. 환경

`env.json` 요약(B1-00, 커밋 `e89991c`의 `doctor --write`).

| 항목 | 값 |
|---|---|
| OS / arch | Linux 6.18.44-fc-v77 / x64 |
| Node / npm | v22.22.0 / 10.9.4 |
| 프록시 | `HTTPS_PROXY`·`https_proxy` = 127.0.0.1:37367, `NO_PROXY` 설정됨(`registry.npmjs.org` 포함), `HTTP_PROXY` 없음 |
| root / sudo -n | uid 0 / 가능 |
| shallow clone | yes |
| 작업 브랜치 | `qa/mfa-lab` |
| 시작 커밋 | `e8e2d8f5bea60f800a83a095ae05d652ad114ea3` |
| 라이브러리 트리 / 커밋 | `c1da6c9dc03a4811eea42c220be309e5e73b0a4a` / `ea25ff79f24009137315938e5e2b840b1ab678cd` (문서 값과 일치) |
| 네트워크 (curl http_code) | registry.npmjs.org 200, cdn.playwright.dev 400, playwright.download.prss.microsoft.com 404, storage.googleapis.com 400, `npm ping` ok |
| `/opt/pw-browsers` | `chromium`, `chromium-1194`, `chromium_headless_shell-1194`, `ffmpeg-1011` (env `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`) |
| 포트 4300~4304, 4390 | 모두 비어 있음 |

## 2. 레인

| 항목 | 값 |
|---|---|
| 선택 | **B** (B1-01, 시도 1회에 성공) |
| 이유 | `cdn.playwright.dev`가 000이 아닌 400을 돌려줘 후보 B. `playwright install chromium`이 1차 시도에 성공 |
| Playwright | `@playwright/test@1.63.0` |
| Chromium | 153.0.8010.12 (리비전 1243), 바이너리 headless shell (`chromium_headless_shell-1243`). 풀 바이너리 `chromium-1243`도 같은 설치로 받아졌다(S10용) |
| 설치 방법 | `env -u PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD PLAYWRIGHT_BROWSERS_PATH=<repo>/mfa-lab/.run/pw-browsers node mfa-lab/e2e/node_modules/@playwright/test/cli.js install chromium`. 다운로드 URL은 `https://cdn.playwright.dev/builds/cft/153.0.8010.12/linux64/chrome-headless-shell-linux64.zip` |
| 시도한 레인 | B만 (A, C는 시도하지 않음) |
| `install-deps` | 필요 없었다(공유 라이브러리 오류 없음) |
| `native_touch_drag` 라벨 | `on` (153) |

## 3. 검사별 결과

| ID | 결과 | 시도 | 커밋 | 메모 |
|---|---|---|---|---|
| S0 | 통과 | 1 | 78f858f | `HeadlessChrome/153.0.8010.12`. rAF 실측 mouse 62/s, touch 61/s. CDP `Browser.getVersion` 성공. CDP `touchStart` → `isTrusted === true` touchstart: touch 프로젝트 `[true]`, mouse 프로젝트(`hasTouch` 없음)도 `[true]`, 오류 없음 → `hasTouch`가 trusted 여부에 필요하지 않다. 스크린샷 [evidence/s00-page.png](./evidence/s00-page.png)를 Read로 열어 "Harbor S0" 글자와 파란 상자를 확인 |
| S1 | 통과 | 2 (+B1-03b I1~I7 재실행 통과) | e032a1c | 1회차 실패: hover 중 `domTree`가 `H[p-a,V[p-b,p-c],p-d]`(미리보기 없음). 프로브 로그상 teleport 한 번이 `dragenter(p-a)`·`dragleave(p-d)`만 만들고 `dragover`가 없었다 — Blink는 대상 요소가 바뀌는 갱신에서 dragover를 다음 갱신으로 미룬다. 수정: `teleport`가 이동 직후 프로브에 dragover가 없으면 같은 점으로 한 번 더 이동(그래도 teleport당 dragover 1회). 2회차 통과: trusted `dragstart→dragenter→dragover→drop→dragend`, hover `H[p-d,p-a,V[p-b,p-c]]` + p-d shadow, `onMovePanel(p-d,p-a,left,1)` 1건, 커밋 트리 = 미리보기, `dragend.dropEffect = move` |
| S2 | 통과 | 1 | 97d303d | hover `H[nav,V[terminal,output],editor]` + editor shadow. nav 위로 teleport 뒤 `settled` 릴리스: nav의 bubble dragover `dropEffect: none`, `drop` 없음, `dragleave(nav)` + `dragend(editor, dropEffect none)`. `onMovePanel` 0건, 트리·`treeVersion` 불변, I1~I7 통과 |
| S3 | 통과 | 1 | 97d303d | hover `H[nav,terminal,editor,output]`, 미리보기가 소스 `terminal`을 리마운트(`domLog` remounted). Esc 뒤 `dragend`는 window에 없고 원본 노드에 건 리스너에만 `phase: target, isConnected: false, isTrusted: true`로 찍혔다. `onMovePanel` 0건, 트리 불변, I1~I7 통과 |
| S4 | 통과 | 1 | 97d303d | S3의 hover 뒤 nav 위 `settled` 릴리스: `drop` 없음, `dragend`는 분리된 원본에만(`isConnected: false`). 트리 불변, I1~I7 통과 |
| S5 | 요구대로 실패 | 1 | 69e663b | `:4390` `lib.source = npm051`. `fc-051/dist/index.js`를 직접 열어 루트의 `onDragEnd: () => L()`가 있고 원본 노드 리스너가 없음을 확인. 전제: hover `H[nav,terminal,editor,output]`, 소스 `terminal` 리마운트, 드래그 중 I1·I2 선택자가 상태를 잡음. Esc 뒤 `dragend`는 분리된 원본에만(`isConnected: false`) → **I1 실패(`data-dragging-panel-id=terminal` 잔존), I2 실패(terminal shadow 잔존)**, I5도 실패. I3·I4·I6·I7 통과 |
| S6 | 통과 | 1 | 3930df3 | `row3` p-a|p-b 경계 +150 px / 10 step: resizer에 `gotpointercapture`·`lostpointercapture`. p-a 413.3→561.4(+148.1), p-b 413.3→265.3(−148.1), 오차 1.9 px ≤ 3. 리사이즈 중 `body.style.userSelect = none`, 뒤에 로드 직후 값(`''`)으로 복원. `onResizeBorder` 10건. 리사이즈 시작 전 hover 이동의 mousemove 2건 외에 드래그 구간 mousemove 없음. I1~I7 통과 |
| S7a | 통과 | 2 | 831126e | touch 프로젝트. 1회차 실패: 핸들에서 12 px `touchMove` 한 번은 `pointermove`만 만들고 `touchmove`가 페이지에 오지 않아(Chromium의 touch slop 억제) ghost가 생기지 않았다. 수정(사다리 2): 첫 이동을 12 px → 24 px 두 번으로 나눔. 2회차 통과: (1) `pair` p-a → p-b 오른쪽 커밋, touch 이벤트 전부 trusted, 드래그 중 ghost 정확히 1개·끝난 뒤 0, `onMovePanel` 1건, 트리 `H[p-b,p-a]` (2) `locks` editor → terminal 위 → nav 위: ghost `opacity 0.4` + `rgba(232, 17, 35, 0.8) solid 2px`, 떼면 `onMovePanel` 0건·트리 불변, 이어서 두 번째 드래그(control-b)가 시작되고 취소됨. 모두 I1~I7 통과. 롱프레스 없이 시작함을 확인(오라클 = 코드) |
| S7b | 기록 | 1 | 831126e | 7절 참고. 레인 B(153) headless shell에서 네이티브 `dragstart`·`touchcancel` 없음, 롱프레스 드래그가 커밋됨 |
| S8 | 기록 (게이트 충족) | 1 | 2b7fd5c | 5절 표. `overShadow` 0/10 |
| S9 | 기록 | 2 | c6c78c7 | 6절 참고. 1회차: 렌더러 1개, iframe 타깃 없음(OOPIF no) → 사다리 telemetry-x 3: `--site-per-process` 추가 후 telemetry-x가 별도 CDP 타깃·렌더러(OOPIF yes) |
| S10 | 통과 (선택) | 2 | 2b7fd5c | 프로젝트 `mouse-full`(`channel: 'chromium'`, 풀 바이너리 `chromium-1243`, 새 headless). 1회차: 풀 바이너리는 `/favicon.ico`를 요청해 404 콘솔 에러로 I6 실패(headless shell은 요청하지 않음) → shell `index.html`에 `<link rel="icon" href="data:,">` 추가(픽스처 수정). 2회차 S1·S2·S3 통과, 축소 이벤트 로그가 headless shell 기준선과 **완전히 같다**(파일 diff 없음) |

## 4. 이벤트 로그 기준선

축소 형식 `{ type, phase, panelId, isTrusted, top }` 배열. 파일은 `evidence/baseline/<spike>.events.json`.

| 스파이크 | 파일 | 드래그 이벤트 순서 (`type/phase/panelId`, pointer·mouse 생략) |
|---|---|---|
| S1 | [s01.events.json](./evidence/baseline/s01.events.json) | dragstart(p-d) → pointercancel(p-d) → dragenter(p-d) → [teleport] dragenter(p-a), dragleave(p-d), dragover(p-a) → [overShadow 이동] dragenter(p-d), dragleave(p-a) → [mouse.up] dragover(p-d) → drop(p-d) → dragend capture(p-d) / target(p-d, connected) / bubble(p-d). 모두 `isTrusted: true`, 메인 프레임 |
| S2 | [s02.events.json](./evidence/baseline/s02.events.json) | dragstart(editor) → dragenter(editor) → [teleport] dragenter(output), dragleave(editor), dragover(output) → [nav로 teleport] dragenter(nav), dragover(nav; bubble `none`) → [mouse.up] dragover(nav; bubble `none`) → dragleave(nav) → dragend capture/target/bubble(editor, `none`, connected). `drop` 없음 |
| S3 | [s03.events.json](./evidence/baseline/s03.events.json) | dragstart(terminal) → dragenter(terminal) → [teleport] dragenter(editor), dragleave(terminal), dragover(editor) → [Esc] dragend **target만**(terminal, `none`, `isConnected: false`). `dragleave` 없음(하네스 부작용 #1) |
| S4 | [s04.events.json](./evidence/baseline/s04.events.json) | S3의 hover → [nav로 teleport] dragenter(nav), dragleave(editor), dragover(nav; `none`) → [mouse.up] dragover(nav; `none`) → dragleave(nav) → dragend **target만**(terminal, `none`, `isConnected: false`). `drop` 없음 |

## 5. S8 비율 표

`census` bare, p-d를 (p-a, left, 1)로 hover(`H[p-d,p-a,V[p-b,p-c]]`)한 뒤 칸마다 10회, 드롭마다 새 페이지. stale preview = 릴리스·settle 뒤 I1 통과 + (I2 또는 I5 실패). 릴리스 지점: `source` = 소스 shadow 헤더, `other-droppable` = 미리보기 안 p-a 중앙(같은 미리보기를 다시 만든다). 원자료 [evidence/s08-ratio.json](./evidence/s08-ratio.json), 커밋 2b7fd5c.

| 릴리스 모드 | 커서 아래 | stale preview | 마지막 dragover 대상 |
|---|---|---|---|
| `overShadow` | `source` | **0/10** | p-d |
| `settled` | `source` | 0/10 | p-d |
| `settled` | `other-droppable` | 6/10 | p-a |
| `immediate` | `source` | 0/10 | p-d |
| `immediate` | `other-droppable` | 8/10 | p-a |

- `overShadow` × `other-droppable` 칸은 없다(정의상 소스 shadow 헤더에서 놓으므로 만들 수 없는 조합).
- `immediate`의 비율은 하네스가 만든 값이다(CDP `mouse.up`이 dragover + drop + dragend를 연달아 보낸다). **사용자 체감 빈도가 아니다.** `settled`도 마지막 dragover가 소스가 아닌 droppable 패널이면 경합이 남는다는 점이 예측(H-RAF-STALE: 결정 변수는 릴리스 순간 커서 아래)과 맞다.
- 기본 릴리스 `overShadow`는 경합에서 자유롭다(0/10). 세션 2의 커밋 측정은 `overShadow`를 쓴다.

## 6. S9 iframe 사실

레이아웃 `?layout=census&a=telemetry&b=telemetry-x&c=control-iframe&d=bare-3`, 레인 B 153 headless shell, 커밋 c6c78c7.

| 항목 | 결과 |
|---|---|
| 사용한 호스트 이름 | `localhost` (`http://localhost:4304`가 브라우저 안에서 열림. `crosssite.test` 대안 불필요) |
| OOPIF | **기본 실행 인자에서는 no**: 렌더러 프로세스 1개, `Target.getTargets`에 iframe 타깃 없음(headless shell은 기본으로 사이트 격리를 하지 않는다). **`--site-per-process`를 켠 뒤 yes**: `telemetry-x`가 type `iframe` 타깃이고 렌더러가 3개. `telemetry`(127.0.0.1:4304, same-site)는 별도 타깃이 아니다. 이 인자를 `playwright.config.ts`의 기본 `launchOptions.args`에 넣었다(아래 결정) |
| cross-site iframe의 `sessionStorage` | 가능 (`telemetry-x` 안에서 set/get 성공). same-site `telemetry`도 가능 |
| 드래그 중 iframe 위 dragover | 마우스 패널 드래그(bare-3)의 커서를 `telemetry`·`telemetry-x` iframe 본문 위로 teleport + nudge 했을 때 **어느 프레임의 프로브에도 드래그 이벤트가 찍히지 않았다**(host 패널도, iframe 문서도, telemetry 자신의 `seen` 카운터도 0). `--site-per-process` 유무와 무관. 반면 `control-iframe`(srcdoc, same-origin) 위에서는 dragenter/dragover가 **iframe 문서의 프로브**(`about:srcdoc`)에 찍히고 host 패널에는 찍히지 않았다 |
| 해석 | cross-origin iframe 위의 CDP 드래그(`Input.dispatchDragEvent`)는 이 환경에서 어느 문서에도 전달되지 않는다(관찰). 실제 브라우저는 iframe 문서로 dragover를 보낼 것으로 추정한다. 따라서 `telemetry`·`telemetry-x` 위의 마우스 드래그 관찰은 하네스 충실도 단서(HARNESS 부작용 #7)를 붙여야 하고, same-origin `control-iframe`과 결과가 다를 수 있다 |
| 릴리스 | 이후 소스 shadow 헤더 위 `overShadow` 릴리스: drop + dragend(`move`), 미리보기가 없었으므로 트리 불변. I1~I7 통과 |

## 7. S7b 관찰

- 레인 B, `HeadlessChrome/153.0.8010.12` (headless shell), touch 프로젝트(`hasTouch: true`), 새 컨텍스트. `?layout=pair&drag=panel`.
- 절차: p-a 위 `touchStart` → 550 ms 유지 → p-b 오른쪽으로 `touchMove` 3회 → `touchEnd`.
- 관찰(커밋 831126e): 유지 직후 ghost 1개(`opacity 0.7`) = 라이브러리의 450 ms 롱프레스 타이머로 드래그 시작. **네이티브 `dragstart` 없음, `touchcancel` 없음, `contextmenu`·`selectstart` 없음.** 루트 `data-dragging-panel-id` 없음. 떼면 `onMovePanel` 1건, 트리 `H[p-b,p-a]`, I1~I7 통과.
- 프로브 발췌: `touchstart(p-a) → gotpointercapture → touchmove → lostpointercapture → touchmove → touchmove → touchend(capture/target(connected)/bubble)`.
- 해석(추정): `kTouchDragAndDrop`이 153 Linux에서 기본 on이라도 headless shell + CDP 터치 에뮬레이션에서는 롱프레스 제스처가 네이티브 드래그를 시작하지 않았다. H-TOUCH-NATIVE-RACE는 이 환경에서 관찰되지 않았다(반증이 아니라 미관찰). `native_touch_drag` 라벨은 레인 규칙대로 `on`이지만 실제 동작은 위와 같다.

## 8. 라이브러리 버그 의심 메모

판단은 세션 2로 넘긴다. 발견 ID는 붙이지 않는다.

- **workbench Nav 토글 전후 `getTree()` size 차이** (B1-07, 관찰): 토글 전 `V[ H[board,billing](size 2), H[telemetry,telemetry-x](size 1) ]`. `removePanel('board')` 뒤 `H[board,billing]`이 billing 하나로 풀리면서 그 자리의 size가 split의 2가 아니라 **billing의 1**이 된다. `insertPanel({ board, at: billing/left })`로 다시 만든 `H[board,billing]`의 size도 **1**이다. 즉 토글 한 번으로 아래쪽 V split의 비율이 2:1에서 1:1로 바뀐다(`domTree`는 같다). 근거 줄: `src/tree/helpers.ts:45`, `src/tree/insert.ts:71`(BRIEF-1 B1-07). 재현: `node mfa-lab/scripts/ctl.mjs test smoke/workbench`의 `[workbench] sizes ...` 줄. 판단은 세션 2.
- **S8 stale preview (H-RAF-STALE)** (B1-03f, 관찰): 마지막 dragover가 소스가 아닌 droppable 패널(p-a)에 떨어지는 릴리스에서 릴리스 뒤 미리보기 shadow가 남는다(`settled` 6/10, `immediate` 8/10, I1은 통과). 하네스가 빈도를 키운 경합(`harness_amplified`). 재현: `node mfa-lab/scripts/ctl.mjs test spike/s08`. 관련 스펙 `mfa-lab/e2e/spike/s08-raf-stale-ratio.spec.ts`.

- **S1 미리보기 중 드래그하지 않은 패널의 리마운트·재삽입** (B1-03a, 관찰): `census` bare에서 p-d를 (p-a, left, 1)로 hover하는 미리보기 한 번에 프로브 `domLog`가 `p-b`·`p-c` = `remounted`(새 요소), `p-a` = `reinserted`(같은 요소의 제거 후 삽입)를 기록했다. 사전 등록된 FC-QA-001(`predicted`, D3)·D3a의 예측과 같은 모양이다. 재현: `node mfa-lab/scripts/ctl.mjs test spike/s01` 출력의 `[S1] domLog` 줄. 관련 스펙 `mfa-lab/e2e/spike/s01-mouse-drag-commit.spec.ts`.
  - 같은 hover를 `?layout=census&b=telemetry`(control + iframe)에서 `diff(before, mid)`로 본 확인용 1회(B1-08, 헬퍼 점검 목적, 증거로 쓰지 않음): `control-a` = reinserted(scrollTop 유실), `control-c` = remounted(input·counter·scrollTop 유실), `telemetry` = remounted + iframe 문서 재로드(`loads` +1). FC-QA-001·D3a 예측과 같은 방향이다.

## 9. HANDOFF

(B1-08에서 작성)

## 10. GO / NO-GO 권고

(B1-08에서 작성)
