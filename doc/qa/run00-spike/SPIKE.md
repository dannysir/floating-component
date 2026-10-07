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
| S1 | 통과 | 2 | e032a1c | 1회차 실패: hover 중 `domTree`가 `H[p-a,V[p-b,p-c],p-d]`(미리보기 없음). 프로브 로그상 teleport 한 번이 `dragenter(p-a)`·`dragleave(p-d)`만 만들고 `dragover`가 없었다 — Blink는 대상 요소가 바뀌는 갱신에서 dragover를 다음 갱신으로 미룬다. 수정: `teleport`가 이동 직후 프로브에 dragover가 없으면 같은 점으로 한 번 더 이동(그래도 teleport당 dragover 1회). 2회차 통과: trusted `dragstart→dragenter→dragover→drop→dragend`, hover `H[p-d,p-a,V[p-b,p-c]]` + p-d shadow, `onMovePanel(p-d,p-a,left,1)` 1건, 커밋 트리 = 미리보기, `dragend.dropEffect = move` |
| S2 | 미실행 | | | |
| S3 | 미실행 | | | |
| S4 | 미실행 | | | |
| S5 | 미실행 | | | |
| S6 | 미실행 | | | |
| S7a | 미실행 | | | |
| S7b | 미실행 | | | |
| S8 | 미실행 | | | |
| S9 | 미실행 | | | |
| S10 | 미실행 | | | |

## 4. 이벤트 로그 기준선

축소 형식 `{ type, phase, panelId, isTrusted, top }` 배열. 파일은 `evidence/baseline/<spike>.events.json`.

| 스파이크 | 파일 | 드래그 이벤트 순서 (`type/phase/panelId`, pointer·mouse 생략) |
|---|---|---|
| S1 | [s01.events.json](./evidence/baseline/s01.events.json) | dragstart(p-d) → pointercancel(p-d) → dragenter(p-d) → [teleport] dragenter(p-a), dragleave(p-d), dragover(p-a) → [overShadow 이동] dragenter(p-d), dragleave(p-a) → [mouse.up] dragover(p-d) → drop(p-d) → dragend capture(p-d) / target(p-d, connected) / bubble(p-d). 모두 `isTrusted: true`, 메인 프레임 |

## 5. S8 비율 표

(B1-03f에서 기록)

## 6. S9 iframe 사실

(B1-05에서 기록)

## 7. S7b 관찰

(B1-03e에서 기록)

## 8. 라이브러리 버그 의심 메모

판단은 세션 2로 넘긴다. 발견 ID는 붙이지 않는다.

- **S1 미리보기 중 드래그하지 않은 패널의 리마운트·재삽입** (B1-03a, 관찰): `census` bare에서 p-d를 (p-a, left, 1)로 hover하는 미리보기 한 번에 프로브 `domLog`가 `p-b`·`p-c` = `remounted`(새 요소), `p-a` = `reinserted`(같은 요소의 제거 후 삽입)를 기록했다. 사전 등록된 FC-QA-001(`predicted`, D3)·D3a의 예측과 같은 모양이다. 재현: `node mfa-lab/scripts/ctl.mjs test spike/s01` 출력의 `[S1] domLog` 줄. 관련 스펙 `mfa-lab/e2e/spike/s01-mouse-drag-commit.spec.ts`.

## 9. HANDOFF

(B1-08에서 작성)

## 10. GO / NO-GO 권고

(B1-08에서 작성)
