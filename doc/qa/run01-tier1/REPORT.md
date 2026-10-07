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
| R01 | census / 전부 control | hover | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R01-hover-run1.json, obs/R01-hover-run2.json |
| R01 | census / 전부 control | Esc | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R01-esc-run1.json, obs/R01-esc-run2.json |
| R01 (사다리) | census / bare-0..3 | hover + Esc | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R01-bare-run1.json, obs/R01-bare-run2.json |
| R02 | census / 전부 control | hover 후 drop (overShadow) | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R02-drop-run1.json, obs/R02-drop-run2.json |
| R03 | census / b=orders | hover + Esc, hover + drop | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R03-orders-esc-run{1,2}.json, obs/R03-orders-drop-run{1,2}.json |
| R03 | census / b=billing | hover + Esc, hover + drop | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R03-billing-{esc,drop}-run{1,2}.json |
| R03 | census / b=telemetry | hover + Esc, hover + drop | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R03-telemetry-{esc,drop}-run{1,2}.json |
| R03 | census / b=telemetry-x | hover + Esc, hover + drop | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R03-telemetry-x-{esc,drop}-run{1,2}.json (OOPIF yes, `--site-per-process`) |
| R03 (사다리) | census / b=orders-local | hover + Esc | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R03-ladder-orders-local-esc-run{1,2}.json |
| R03 (사다리) | census / b=billing-local | hover + Esc | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R03-ladder-billing-local-esc-run{1,2}.json |
| R03 (사다리) | census / b=control-mount | hover + Esc | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R03-ladder-control-mount-esc-run{1,2}.json |
| R03 (사다리) | census / b=control-iframe | hover + Esc | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted | obs/R03-ladder-control-iframe-esc-run{1,2}.json |
| R05 | census / a=orders, b=billing, c=telemetry, d=control | 루트 가장자리(top) hover, Esc | mouse | fail(FC-QA-001) | as-predicted | obs/R05-hover-esc-run{1,2}.json |
| R05 (사다리) | census / 전부 control | 같은 제스처 | mouse | fail(FC-QA-001) | as-predicted | obs/R05-ladder-control-run{1,2}.json |
| R05 (사다리) | census / bare | 같은 제스처 | mouse | fail(FC-QA-001) | as-predicted | obs/R05-ladder-bare-run{1,2}.json |
| R07 | locks / terminal=control | 소스 리마운트 후 Esc | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted (취소 자체는 깨끗: I1~I7 통과, `dragend`는 분리된 원본에 `isConnected:false`) | obs/R07-esc-run{1,2}.json |
| R07 | locks / terminal=control | 잠긴 nav 위에서 놓기 | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted (`locked`, drop 없음, `dropEffect none`, 트리 불변) | obs/R07-nav-run{1,2}.json |
| R07 | locks / output=telemetry | iframe 본문 위에서 놓기 | mouse | fail(FC-QA-001, FC-QA-002, FC-QA-005) | as-predicted (취소·미리보기 유지·트리 불변. "마지막 dragover가 :4304 프레임"은 관찰 불가: HARNESS 부작용 #7) | obs/R07-iframe-run{1,2}.json |
| R07 (사다리) | locks / output=control-iframe | iframe 본문 위에서 놓기 | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted (telemetry와 같음) | obs/R07-ladder-control-iframe-run{1,2}.json |
| R07 | locks / terminal=control | workspace 여백에서 놓기 | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted (루트 `dragleave`로 미리보기가 먼저 지워짐, drop 없음) | obs/R07-padding-run{1,2}.json |
| R07 | locks / terminal=telemetry | 소스 리마운트 후 Esc | mouse | fail(FC-QA-001, FC-QA-002) | as-predicted (소스 iframe `loads` +2는 D3b) | obs/R07-iframe-source-run{1,2}.json |
| R09 | row3 / a=board | 카드를 board 안에서 열 이동 | mouse | fail(FC-QA-003, FC-QA-004) | as-predicted (루트 `data-dragging-panel-id="p-a"`, `types`에 `text/panel-id`, `cardMoves` +1, drop bubble 없음, 트리 불변, I1~I7 통과) | obs/R09-board-run{1,2}.json |
| R09 | row3 / a=board-local | 같은 동작 | mouse | fail(FC-QA-003, FC-QA-004) | as-predicted (board와 같음: 라이브러리 코어 동작) | obs/R09-board-local-run{1,2}.json |
| R09 | board 단독 페이지 (`http://127.0.0.1:4302/`) | 같은 동작 | mouse | pass | as-ideal (= 예측: `data-dragging-panel-id` 없음, `lastTypes` 카드 타입만, `lastDragend.dropEffect 'move'`, drop capture+bubble) | obs/R09-standalone-run{1,2}.json |
| R10 | row3 / a=board, b=control-b | 카드를 옆 패널로: hover, drop | mouse | fail(FC-QA-003) | as-predicted (hover `H[p-b,p-a,p-c]` + `p-a` shadow, `onMovePanel('p-a','p-b','right',0)` 1건, board 패널 전체 이동, `cardMoves` +0) | obs/R10-card-run{1,2}.json |
| R10 | row3 / a=board, b=control-b | `<img>`를 옆 패널로: hover, drop | mouse | fail(FC-QA-003) | as-predicted (카드와 같음) | obs/R10-img-run{1,2}.json |
| R10 | row3 / a=board-local, b=control-b | 카드, `<img>` | mouse | fail(FC-QA-003) | as-predicted (board와 같음) | obs/R10-board-local-{card,img}-run{1,2}.json |
| R10 (사다리) | row3 / a=board, `lock=p-a:draggable` | 카드를 옆 패널로 | mouse | fail(FC-QA-004) | as-ideal(= 대조 예측: 미리보기·이동 없음). 단 헤더 위 릴리스가 `dropEffect 'move'`로 받아들여짐 → FC-QA-004 변형 | obs/R10-ladder-lock-card-run{1,2}.json |
| R12 | row3 / control-a, telemetry, telemetry-x (`iframeShield=0`) | telemetry 위 hover, 놓기 | mouse | fail(FC-QA-005) | as-predicted 핵심(미리보기 없음, 취소, 트리 불변, I1~I7 통과). ":4304 프레임에 dragover, `seen` 증가"는 관찰 불가(부작용 #7: 이벤트 0), 그래서 하네스의 `underCursorAtDrop`이 `outside`(기하로는 iframe) | obs/R12-telemetry-run{1,2}.json |
| R12 | row3 / 같은 배치 (`iframeShield=0`) | telemetry-x 위 hover, 놓기 | mouse | fail(FC-QA-005) | deviates — 미리보기 없음은 같지만 릴리스 뒤 `dragend` 없음 → I1 실패. 귀속: harness-artifact(FC-QA-006, 사이트 격리 없이 같은 절차는 정상 종료) | obs/R12-telemetry-x-run{1,2}.json (`harness_artifact` 라벨) |
| R12 (사다리 4) | row3 / 같은 배치, `--site-per-process` 유무 | OOPIF 위 릴리스 진단 | mouse | harness-artifact(FC-QA-006) | OOPIF일 때만 `dragend` 미전달·세션 정지 | explore/r12c-oopif-release-{spp,nospp}.spec.ts 로그 |
| R12 (사다리) | row3 / b=control-iframe (`iframeShield=0`) | iframe 위 hover, 놓기 | mouse | fail(FC-QA-005) | as-predicted (same-origin에서도 미리보기 없음, `under 'iframe'`, drop 없음, I1~I7 통과) | obs/R12-ladder-control-iframe-run{1,2}.json |
| R12 (사다리 3) | row3 / telemetry, telemetry-x, control-iframe | 핸들 터치 드래그로 같은 지점에 놓기 | touch-cdp-handle | fail(FC-QA-005) | as-predicted (세 대상 모두 **커밋** `H[p-b,p-a,p-c]` → 마우스와 경로 불일치. Chromium CDP touch emulation, headless; not a real device) | obs/R12-touch-{telemetry,telemetry-x,control-iframe}-run{1,2}.json |
| R12 | row3 / 같은 배치 (`iframeShield=1`) | telemetry, telemetry-x 위 hover, 놓기 | mouse | pass | as-ideal(= 예측: 미리보기 `H[p-b,p-a,p-c]`, `overShadow` 커밋, `calls` 1건, I1~I7 통과) | obs/R12-shield-p-{b,c}-run{1,2}.json |
| R14 | locks | terminal 터치 드래그 → editor 왼쪽 → nav 위(차단 ghost) → 놓기 | touch-cdp-handle | fail(FC-QA-001, FC-QA-002, FC-QA-007) | as-predicted (취소 자체는 깨끗: ghost 1개, nav 위 `opacity 0.4` + `rgba(232,17,35,0.8)` outline, `onMovePanel` 0건, 트리 불변, ghost 제거, `touchend`는 분리된 원본에 `isConnected false`, I1~I7 통과. `terminal`·`output` frame +2, `editor` moves +1. 롱프레스 없이 시작 = FC-QA-007. Chromium CDP touch emulation, headless; not a real device) | obs/R14-blocked-run{1,2}.json |
| R14 | locks | 이어서 두 번째 드래그 | touch-cdp-handle | pass (FC-QA-001 증거 포함) | as-ideal(= 예측: 새 세션 시작, `onMovePanel('terminal','editor','left',0)` 1건, 트리 `H[nav,terminal,editor,output]`, I1~I7 통과). 커밋 때 `output` frame +1 더(split 풀림 → FC-QA-001) | obs/R14-second-run{1,2}.json |
| R16 | workbench / orders origin 차단 | 로드 | mouse | pass | as-ideal(= 예측: orders만 `error`·에러 카드·retry, 나머지 5슬롯 ready, `shell-error` 없음, 콘솔 에러는 :4301 manifest 실패 2건뿐(허용 목록), I1~I7 통과) | obs/R16-load-run{1,2}.json |
| R16 | workbench / orders origin 차단 | 다른 패널 드래그·리사이즈 | mouse | pass (FC-QA-002 증거 포함) | as-ideal(= 예측: billing → board 왼쪽 커밋, orders\|V 경계선 120px → orders +116.8px, 캡처 획득·해제, `userSelect` 복원, 에러 카드는 orders에만). 드래그하지 않은 `board` moves +1(재삽입) | obs/R16-others-run{1,2}.json |
| R16 | workbench / orders origin 차단 | 죽은 패널을 핸들로 드래그 | mouse | pass (FC-QA-001 증거 포함) | as-ideal(= 예측: 핸들 드래그 시작, 에러 카드가 함께 이동, 새 콘솔 에러 없음, I1~I7 통과). 좌표 대체: 브리프의 `(billing, right, 0)`은 도달 불가 → `(billing, right, 3)`, 커밋 `H[nav,V[...],orders]`(10절). 드래그하지 않은 board·billing·telemetry·telemetry-x 모두 frame +1(iframe 둘은 `loads` +1) | obs/R16-dead-drag-run{1,2}.json |
| R17 | workbench | 드래그 가능한 패널을 하나씩 핸들로 이동 | mouse | fail(FC-QA-001, FC-QA-005) | as-predicted (매 커밋 = 미리보기, I1~I7 통과. M1 좌표 대체 `(billing,right,0)→(billing,right,3)`로 표 트리 무효. 드래그하지 않은 패널 리마운트: M1 board·billing·telemetry·telemetry-x, M3 board·orders, M4 telemetry-x(iframe `loads` +1). M2(`board → telemetry 왼쪽`)는 놓는 점이 telemetry iframe 본문이라 미리보기·이동 없음 = FC-QA-005. M5는 이미 그 위치) | obs/R17-moves-run{1,2}.json |
| R17 | workbench | 모든 경계선 리사이즈 | mouse | fail(FC-QA-008) | deviates — `telemetry\|telemetry-x` +120(OOPIF 쪽): 캡처 없음, 크기 0, `userSelect` `none` 잔존(I4 실패), 같은 Resizer 재시도 실패. 이후 다른 경계선도 끝난 뒤 `none`(이전 값으로 누수 복원). 나머지: orders\|board +116.8/120, board\|billing 118.2, board\|telemetry +82.7(하단 min 160에서 멈춤)/-117.0, nav 200 유지, resizer 4, nav 드래그 시작 안 함, 넘침 없음 | obs/R17-resize-run{1,2}.json |
| R17 (사다리) | workbench | `telemetry\|telemetry-x` ±120, `--site-per-process` 유무 | mouse | fail(FC-QA-008) | OOPIF 쪽(+120)만 캡처 유실, same-site 쪽(-120)·사이트 격리 없음은 정상 | explore/r17b-oopif-resize-{spp,nospp}.spec.ts 로그 |
| R17 | workbench | Nav에서 board 닫기·다시 열기 (`removePanel`/`insertPanel`) | mouse | fail(FC-QA-001) | as-predicted(메커니즘) — `removePanel`·`insertPanel` 각 1건, 닫기 `H[nav,telemetry-x,V[orders,billing],telemetry]`(V[board,telemetry-x] 풀림 → telemetry-x frame +1·`loads` +1), 열기 `H[nav,telemetry-x,V[orders,H[board,billing]],telemetry]`(billing이 새 split에 감싸여 frame +1·`mountCalls`·`unmountCalls` +1, board mounts +1). 표의 트리·슬롯 예측은 M1 대체로 무효. 콘솔 에러 0, I1~I7 통과 | obs/R17-nav-toggle-run{1,2}.json |
| R17 | workbench | 전·후 PNG 시각 점검 (잘림, 넘침·스크롤바, 리사이저, shadow, ghost, 에러 카드) | — | pass | as-predicted (점검표 이상 없음. 좁은 패널의 "잘린" 내용은 body 가로 스크롤(DOM 확인), 스크롤바는 `--hide-scrollbars`로 PNG 판정 불가. orders `minWidth 320`은 세로 split 안에서 무시 = 문서대로 → 6절) | obs/R17-visual-run1.json |
| R18 | workbench | 탐색 동작 약 30회 | mouse | fail(FC-QA-009, FC-QA-001, FC-QA-005) | 22회. 불변식 실패 0(제스처 직후 기준). 이상 4건 → 재현 스펙: #13 → `r18-x01` 2회×2: nudge 뒤 놓으면 stale preview 시그니처 = **FC-QA-009**(새 발견), nudge 없으면 하네스 취소(#17). #6·#8 루트 띠가 iframe 본문(FC-QA-005), #7 루트 왼쪽 띠는 전부 잠긴 nav(설계), #17 800x600에서 폭 0 패널은 핸들을 누를 수 없음(`r18-x02` 축소 재현 not-reproduced, 설계상 결과 → 6절). Resizer·상단 바·여백 위 릴리스는 예측대로 취소. 매 커밋·hover의 리마운트는 FC-QA-001 | obs/R18-log.json (n 1~22) |
| R18 | workbench | 탐색 동작 (터치) | touch-cdp-handle | fail(FC-QA-001, FC-QA-005) | 10회. 불변식 실패 0. touchCancel·5px 미만 이동·본문 끌기 모두 깨끗(ghost 없음/제거). iframe 본문 위 터치 드롭은 커밋(FC-QA-005의 터치 쪽). 터치 뒤 마우스 드래그 정상. Chromium CDP touch emulation, headless; not a real device | obs/R18-log.json (n 101~110) |
| R19 | control 패널 (`persist=1`) | 저장 → 새로고침 → 복원 | mouse | pass | as-ideal(= 예측: 저장 JSON = T1, reload 뒤 `getTree()` 깊은 비교 일치, `domTree` 일치, 전 슬롯 ready, 내용 상태는 초기화, 콘솔 에러 0) | obs/R19-persist-roundtrip-run{1,2}.json |
| R19 | control 패널 (`persist=1`) | 미등록 키 → 빈 패널 | mouse | pass | as-ideal(= 예측: `p-b` 요소 존재·자식 0, `shell-error` 없음, 콘솔 에러 0(prod), 트리에 `nope-slot` 유지) | obs/R19-persist-unregistered-run{1,2}.json |
| R19 | control 패널 (`persist=1`) | 복원 후 드래그 앤 드롭 | mouse | pass (FC-QA-001 증거 포함) | as-ideal(= 예측: 빈 패널을 앵커로 커밋 `H[p-b,p-a]`, 복원 뒤 페이지에서 `onMovePanel('p-b','p-c','bottom',0)` 커밋, 둘 다 localStorage가 커밋 트리로 갱신, I1~I7 통과) | obs/R19-persist-dnd-{empty,restored}-run{1,2}.json |
| R19 | control 패널 / 폭 1280 | min/max px: 창 크기 변경, 경계선 드래그 | mouse | fail(FC-QA-010) | as-predicted — row3-size: 400px에서 `+400` 끌면 **263.3px로 줄어듦**(상한 약 2/3), 하한 뒤 `+50` 지연(0px 이동). pair-size 397.5(-2.5, as-ideal), census-vsize 296.7(-3.3) | obs/R19-size-1280-*-run{1,2}.json |
| R19 | control 패널 / 폭 800 | min/max px: 창 크기 변경, 경계선 드래그 | mouse | fail(FC-QA-010) | as-predicted — 창 크기 변경은 하한 200/150/120 정확. 800에서 경계선 상한 row3 261.2(-138.8), pair 395.9(-4.1), census 295.5(-4.5) | obs/R19-size-800-*-run{1,2}.json |
| R19 | control 패널 | 패널보다 큰 내용의 스크롤 | mouse | pass | as-ideal — p-a 200px에서 스크롤은 내용(`control-a-scroll`, sh 2000 > ch 647)에서만, 패널 wrapper·PanelFrame body는 넘치지 않음 → 이중 스크롤바 없음 | obs/R19-overflow-run{1,2}.json |

### 2-2. 둘째 묶음 (시간이 부족하면 **끝에서부터** `not-run` 가능. 이 묶음에서만 허용)

| ID | 변형 (레이아웃 / 슬롯) | 케이스 | 입력 | 상태 | 기대 대비 | 관찰 기록 |
|---|---|---|---|---|---|---|
| R04 | census / a=orders | hover + Esc | mouse | fail(FC-QA-002, FC-QA-001) | as-predicted (p-a frame +0·content +0·moves +1, `orders-scroll` 120 → 0, 입력·카운터 유지, Esc 추가 없음. p-b·p-c 리마운트) | obs/R04-orders-run{1,2}.json |
| R04 | census / a=billing | hover + Esc | mouse | fail(FC-QA-002, FC-QA-001) | as-predicted (같다. `mountCalls`·`unmountCalls` +0, `rootsAlive` 1, scrollTop 초기화) | obs/R04-billing-run{1,2}.json |
| R04 | census / a=telemetry | hover + Esc | mouse | fail(FC-QA-002, FC-QA-001) | as-predicted (`iframeShield=1`로 측정: 브리프 지점이 iframe 본문이라 shield 없이는 미리보기가 없다 = FC-QA-005. frame +0인데 `loads` +1·`docId` 변경·문서 요청 +1, 프레임 안 상태 소실, Esc 추가 없음) | obs/R04-telemetry-run{1,2}.json |
| R04 (사다리) | census / a=control-iframe (`iframeShield=1`) | hover + Esc | mouse | fail(FC-QA-002) | as-predicted (telemetry와 같음 → 컨테이너 고유) | obs/R04-ladder-control-iframe-run{1,2}.json |
| R06 | row3 / b=telemetry | (a) p-c → p-a 왼쪽: hover + Esc, hover + drop | mouse | fail(FC-QA-002) | as-predicted (리마운트 0. hover에서 p-a·p-b moves +1, telemetry `loads` +1(hover 때 재로드), Esc는 소스만 moves +1, 드롭 추가 없음, 커밋 `H[p-c,p-a,p-b]`) | obs/R06-a-run{1,2}.json |
| R06 | row3 / b=telemetry | (b) 새 페이지, p-a → p-c 오른쪽: hover + Esc, hover + drop | mouse | fail(FC-QA-002) | as-predicted (hover는 소스만 moves +1, Esc에서 p-b·p-c moves +1·telemetry `loads` +1(취소 때 재로드), 드롭 추가 없음, 커밋 `H[p-b,p-c,p-a]`) | obs/R06-b-run{1,2}.json |
| R08 | census / bare | (a) stale preview 강제 (다른 패널 위에서 immediate 릴리스) | mouse | pass (not-reproduced 0/5 ×2) | 시그니처 없음: 매번 `under 'outside'`, drop 없이 취소, I1~I7 통과. 원인은 하네스 부작용 #17(미리보기 리플로로 커서 아래 요소가 바뀌어 release의 dragover가 미뤄짐). stale 자체는 R18-x01 경로로 재현됨 → FC-QA-009 | obs/R08-stale-run{1,2}.json |
| R08 | census / bare | (b) stale 상태에서 ext-chip을 패널에 놓기 | mouse | not-run(R08-stale 미재현) | 브리프 규칙대로. 아래 대체 유도 행 참고 | obs/R08-chip-run{1,2}.json |
| R08 (대조) | census / bare, stale 없음 | ext-chip을 p-c에 놓기 | mouse | fail(FC-QA-004) | as-predicted (`onMovePanel` 0건, drop capture만 `stopped`, `dragend move`) | obs/R08-chip-control-run{1,2}.json |
| R08 (대체 유도) | workbench, R18-x01 경로로 stale | ext-chip을 orders에 놓기 | mouse | fail(FC-QA-009) | as-predicted (**패널 드래그 없이 `onMovePanel('board','telemetry','top',1)` 1건, `treeVersion` +1**, 이후 I1~I7 통과) → FC-QA-009 sev-2 | obs/R08-chip-alt-run{1,2}.json |
| R08 | census / bare | (c) 새 페이지, stale 상태에서 경계선 리사이즈 | mouse | not-run(R08-stale 미재현) | 대체 유도 경로의 stale 미리보기는 커밋 트리와 같은 모양이라 경로 불일치를 볼 수 없어 대체 실행하지 않음 | obs/R08-resize-run{1,2}.json |
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
| [FC-QA-001](../findings/FC-QA-001-preview-remount-non-dragged-panels.md) | 드래그 미리보기가 드래그하지 않은 패널을 리마운트한다 | sev-2 | library-bug | open | 2/2 | R01 | split-index-key |
| [FC-QA-002](../findings/FC-QA-002-preview-reinserts-non-dragged-panels.md) | 드래그 미리보기가 드래그하지 않은 패널을 리마운트 없이 DOM 재삽입해 스크롤을 잃게 하고 iframe을 다시 로드시킨다 | sev-2 | library-bug | open | 2/2 | R01 | keyed-reorder-reinsert |
| [FC-QA-003](../findings/FC-QA-003-content-native-drag-becomes-panel-drag.md) | 패널 내용(remote 칸반 카드)의 네이티브 드래그가 패널 드래그로 처리된다 | sev-2 | library-bug | open | 2/2 | R09 | foreign-dragstart-unguarded |
| [FC-QA-004](../findings/FC-QA-004-layout-hijacks-non-panel-drag.md) | 패널이 패널 드래그가 아닌 드래그의 drop 전파를 막고 dropEffect를 덮어쓴다 | sev-2 | spec-question | needs-user-confirmation | 2/2 | R09 | foreign-drag-handlers-unguarded |
| [FC-QA-005](../findings/FC-QA-005-iframe-panel-not-mouse-drop-target.md) | iframe 패널은 마우스 드롭 대상이 되지 않는데 터치에서는 된다 (경로 불일치) | sev-3 | library-bug | open | 2/2 | R12 | iframe-drop-target-mouse |
| [FC-QA-007](../findings/FC-QA-007-handle-touch-starts-without-long-press.md) | 핸들 모드 터치 드래그가 문서와 달리 롱프레스 없이 8px 이동으로 시작 | sev-4 | spec-question | needs-user-confirmation | 2/2 | S7a·R12·R14 | docs-touch-handle-start |
| [FC-QA-008](../findings/FC-QA-008-resize-capture-loss-leaks-user-select.md) | 경계선 리사이즈가 포인터 캡처를 잃으면 userSelect가 none으로 남고 그 Resizer를 다시 잡을 수 없다 | sev-1 | library-bug | open | 2/2 | R17 | resize-capture-cleanup |
| [FC-QA-009](../findings/FC-QA-009-stale-preview-after-drop.md) | 드롭 직전 dragover의 rAF가 드래그 뒤 실행돼 소스 shadow가 남고, 다음 비패널 드롭이 그 미리보기를 커밋한다 (stale preview) | sev-2 | library-bug (`harness_amplified`) | open | 4/4 | R18, R08 | raf-not-cancelled-on-drop |
| [FC-QA-010](../findings/FC-QA-010-resize-limit-px-mismatch.md) | 경계선 드래그의 최소·최대 한계가 설정 px과 다르다(자식 3개 split 상한 약 2/3) | sev-3 | library-bug | open | 2/2 | R19 | resize-flex-conversion |
| [FC-QA-006](../findings/FC-QA-006-oopif-release-no-dragend-harness.md) | (하네스) OOPIF 위 마우스 릴리스에서 dragend가 오지 않고 CDP 드래그 세션이 멈춘다 | sev-4 | harness-artifact | open | 2/2 | R12 | harness-cdp-drag-oopif |

`predicted`였던 발견의 결과: FC-QA-001 — 관찰됨(R01에서 `open`으로 변경)

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
| FC-QA-007 | 핸들 모드 터치는 롱프레스 없이 8px 이동으로 시작한다(`useTouchDrag.ts:145-149`). `doc/API.ko.md:33`은 "핸들을 롱프레스(450ms)"라 하고 309행은 "핸들을 누르거나"라 한다. 어느 쪽이 의도인가? | (a) 코드가 맞다 → `doc/API.ko.md`·`doc/API.md` 33행을 "핸들은 8px 넘게 움직이면 바로 시작, 핸들이 없으면 롱프레스 450ms"로 고친다 (b) 문서가 맞다 → 핸들 모드에도 롱프레스를 적용(스크롤과의 충돌이 줄지만 핸들 드래그가 느려진다) | (a). 핸들은 명시적 손잡이라 즉시 시작이 자연스럽고 구현·주석·TODO 테스트가 모두 그 전제다 |
| FC-QA-004 | 레이아웃은 패널 드래그가 아닌 네이티브 드래그(remote 내부 DnD)에 투명해야 하는가? 지금은 패널이 그 drop의 전파를 막고(window 버블 리스너 미실행) `dropEffect`를 `move`로 덮어쓴다(R11에서 copy 드롭 영향 확인 예정) | (a) 투명해야 한다 → `library-bug`로 재분류, FC-QA-003과 함께 수정 (b) 현재 동작을 사양으로 두고 통합 가이드에 "remote는 window drop에 의존하지 말 것"을 적는다 | (a). 단독 페이지와 동작이 달라 remote 팀이 원인을 찾기 어렵다 |

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
| iframe 패널 위에서는 마우스 드롭 대상 판정이 되지 않는다 (FC-QA-005가 고쳐질 때까지) | R12: shield 없이 마우스 미리보기 없음(`obs/R12-ladder-control-iframe-run1.json`), `iframeShield=1`이면 커밋(`obs/R12-shield-p-b-run1.json`, `R12-shield-p-c-run1.json`) | 드래그 중 `[data-dragging-panel-id] iframe { pointer-events: none }` | 확인 |
| 패널을 다른 방향의 split으로 옮기면 그 패널의 `minWidth`(또는 `minHeight`)가 꺼진다 | R17: orders `minWidth 320`이 `V[orders,billing]` 안에서 262→208px(`obs/R17-visual-run1.json`). `doc/API.ko.md` "패널 크기 제약"의 반대 축 무시 규정대로 | 최소 크기가 중요한 패널은 `droppable`/`draggable` 잠금이나 split 수준 제약으로 배치를 고정하거나, 이동 뒤 제약을 다시 지정한다 | 확인 |
| 최소 크기가 없는 패널은 형제의 최소·고정 크기에 밀려 폭 0까지 접힐 수 있고, 그러면 핸들을 잡을 수 없다 | R18 #17: 800x600에서 nav 200 고정 + orders `minWidth 320` 사이의 board·billing 폭 0px(스냅샷), 드래그 시작 불가(`obs/R18-log.json` n=17) | 모든 패널(특히 핸들이 유일한 이동 수단인 패널)에 `minWidth`/`minHeight`를 준다. 고정 폭 패널(nav)과 큰 최소 폭 패널의 합이 가능한 최소 창 폭을 넘지 않게 한다 | 확인 |
| 루트 가장자리 드롭은 그 띠를 덮는 패널이 iframe이거나 잠겨 있으면 쓸 수 없다 | R18 #6~#8(telemetry·telemetry-x iframe, 잠긴 nav 위 루트 띠는 미리보기 없음), #21·#22(일반 패널 앵커는 동작) | 루트 가장자리에 닿는 패널에 iframe·잠금 패널만 두지 않는다(또는 FC-QA-005 수정·shield) | 확인 |
| remote가 죽어도 레이아웃이 유지되려면 경계가 패널 안에 있어야 한다 | R16: 픽스처의 패널별 `RemoteErrorBoundary`로 orders만 에러 카드, 나머지 조작 가능, 죽은 패널도 host 핸들로 이동(`obs/R16-*.json`). 라이브러리에는 경계가 없다(`PanelNodeRenderer.tsx:155`) | 패널 내용마다 에러 경계·Suspense를 두고, `TreeLayout` 바깥에는 두지 않는다. 핸들은 경계 밖에 둔다 | 확인 |

---

## 7. `doc/TODO.md` 대응표

[doc/TODO.md](../../TODO.md)에 남아 있는 확인 항목과 이번 run의 관계.

| TODO.md 항목 | TODO.md 위치 | 확인한 시나리오 | 결과 | 남은 수동 확인 |
|---|---|---|---|---|
| 실제 마우스로 `not-allowed` 커서 표시 확인 | "PanelNode lock options" → "남은 일" | S2, R07 (대용: `dragend`의 `dropEffect`가 `none`, `drop` 없음) | | 커서 글리프 자체 |
| 실기기로 터치 경로 확인 | 같은 곳 | S7a, R13, R14 (CDP 터치 에뮬레이션) | R14: 잠긴 nav 위 차단 ghost·취소·두 번째 드래그 모두 문서대로(에뮬레이션). 단 핸들 모드 시작 조건이 문서(롱프레스)와 다름 → FC-QA-007 | 실기기 Android·iOS |
| 소스 DOM 교체 시 종료 이벤트 유실 수정을 실제 입력으로 확인 | "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실" → "확실성" | S3, S4, S5(0.5.1 양성 대조), R07, R14 | | |
| 직렬화 (0.3.0) | "남은 검증" | R19 | 확인: 저장→새로고침→복원(레이아웃·컴포넌트), 미등록 키 → 빈 패널·prod 콘솔 조용, 복원 뒤·빈 패널 앵커 DnD 정상. 범위: `splitPanel`은 run 01 밖, `insertPanel`은 R17 Nav 토글(persist 없이)이 다룸, R19는 DnD만 | dev 모드 `devWarn` 문구(P1 dev 모드 항목) |
| 패널 크기 제약 (0.4.0) | "남은 검증" | R19 | **성립하지 않음** — 창 크기 변경(CSS)은 정확하지만 경계선 드래그 한계가 다르다: 자식 3개 split에서 상한 약 2/3(바깥으로 끌면 줄어듦), 하한 뒤 지연, 자식 2개에서도 2.5~4.5px 부족 → FC-QA-010. 오버플로우는 내용 스크롤로 성립(이중 스크롤바 없음) | — |

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
| 스크롤바 시각 확인 | Playwright headless 실행은 `--hide-scrollbars`로 스크롤바를 그리지 않아 PNG로 "잘림 대 스크롤"을 판정할 수 없다(R17에서 DOM `scrollWidth/clientWidth`로 대체) | 사용자 PC에서 `?layout=workbench`의 좁은 board 패널을 가로 스크롤해 본다 | <미확인> |
| OOPIF 쪽으로 경계선 리사이즈 (FC-QA-008 트리거) | CDP 마우스 입력이 OOPIF 위에서 host의 포인터 캡처를 따르지 않았다. 실제 Chrome의 입력 라우팅도 같은지는 이 환경으로 확인 불가 | 사용자 PC Chrome에서 `?layout=workbench`: telemetry\|telemetry-x 경계선을 오른쪽(telemetry-x 위)으로 끌고 놓은 뒤 (1) 경계선이 따라왔는지 (2) 페이지 텍스트 선택이 되는지 (3) 같은 경계선을 다시 잡을 수 있는지 | <미확인> |
| cross-origin iframe 위 마우스 드래그 (GO 참고 사항) | CDP 드래그 이벤트가 cross-origin iframe 위에서 어느 문서에도 오지 않는다(부작용 #7). OOPIF 위 릴리스는 `dragend`도 오지 않는다(FC-QA-006) | 사용자 PC Chrome에서 `?layout=row3&b=telemetry&c=telemetry-x&iframeShield=0`: 패널을 telemetry-x 본문 위로 끌어 놓았을 때 (1) 미리보기가 생기는지(FC-QA-005 예측: 아니오) (2) 놓은 뒤 패널이 정상으로 돌아오는지(FC-QA-006 예측: 예) | <미확인> |
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
| `seedContent`가 없는 요소(bare의 counter·scroll)를 기다리다 시간 초과 → 있을 때만 조작 (R01 사다리) | R01 `test:` 커밋 | smoke 19 passed, S1·S3·S6 통과, S5 요구대로 실패. R01 재실행 결과 동일 |
| `diff`가 `focused`를 내용 상태로 비교해 포커스만 잃은 소스를 `content-reset`으로 분류 → `focused` 제외(마우스 시나리오는 포커스를 판정하지 않는다) | R01 `test:` 커밋 | 같은 재실행. 영향받은 행은 분류 라벨뿐(카운터 무관) |
| `promote`가 대상 디렉터리를 통째로 비워 여러 시나리오의 증거를 한 발견에 모을 수 없음 → 선택적 `prefix`(예: `R05-`)로 그 접두어 파일만 갱신 | R05 `test:` 커밋 | smoke 19 passed, S1·S3·S6 통과, S5 요구대로 실패 |
| (픽스처) mfe-board: 드롭이 성공하면 카드가 다른 열로 옮겨져 원본 노드가 분리되고, 분리된 노드의 `dragend`가 React 루트에 오지 않아 `dnd.lastDragend`가 `null`로 남음(단독 페이지 포함 모든 R09 케이스, 첫 실행에서 standalone이 `deviates`) → `dragstart` 때 원본 카드 노드에 네이티브 `dragend` 리스너를 걸고 분리된 경우에만 기록. 라이브러리 동작은 우회하지 않는다 | R09 `test: [R09] fix` 커밋 | `build --only mfe-board,shell` 뒤 ctl smoke OK, smoke 19 passed, S1·S3·S6 통과, S5 요구대로 실패. board 슬롯을 쓰는 닫힌 행 없음. R09 재실행: `lastDragend {move, move}` 외 값 동일, 첫 실행 관찰 기록은 재측정으로 덮었다 |

### 브리프 좌표 대체

| 시나리오 | 브리프 | 대체 | 이유 |
|---|---|---|---|
| R17-moves M1 | `orders → ('billing','right',0)` | `('billing','right',3)` | R16과 같은 이유. 이후 M2~M5와 토글의 표 트리·슬롯 예측은 시작 상태가 달라 무효 → 커밋 = 미리보기·메커니즘으로 판정. M4는 `(orders,right,0)` 도달 불가로 `(orders,right,2)`, M5는 `(board,bottom,4)` 도달 불가로 `(board,bottom,0)`(그 시점 트리에서 같은 동작이 이미 성립) |
| R16-dead-drag | `dropPoint('billing','right',0)` | `dropPoint('billing','right',3)` | `billing`의 오른쪽 가장자리가 바깥 split들과 겹쳐 드롭 판정이 바깥 split(15% 띠)을 먼저 잡는다. `billing`의 `right`는 깊이 3·4만 도달 가능(`helpers/geometry.ts` 판정 재현으로 열거). 사례의 목적(죽은 패널을 핸들로 이동)은 그대로 |

### HARNESS.md 「알려진 하네스 부작용」 추가 제안

세션은 HARNESS.md를 직접 고치지 않고 여기 제안한다(BRIEF-2 분류 기본값표).

| # | 현상 | 원인 | 대처 | 근거 |
|---|---|---|---|---|
| 19 | OOPIF(`--site-per-process`의 `telemetry-x`) 위에서 `mouse.up` 하면 `dragleave`·`dragend`가 오지 않고, 이후 이동·up·Esc에도 이벤트가 없다(드래그 세션 정지). 라이브러리 `data-dragging-panel-id`가 남아 I1 실패 | 가로챈 드래그(`Input.dispatchDragEvent`)를 OOPIF 위에서 끝낼 때의 전달 방식(추정). 사이트 격리를 끄면 사라진다 | OOPIF 위 마우스 릴리스 결과는 판정에 쓰지 않는다. 그 페이지는 재사용하지 않는다. 릴리스 판정은 `control-iframe`·same-site `telemetry`·터치로 | FC-QA-006, `explore/r12c-oopif-release-{spp,nospp}.spec.ts` |
| 7 보강 | 부작용 #7 때문에 `release()`의 `underCursorAtDrop`(마지막 `dragover` 기준)이 cross-origin iframe 위에서 `outside`가 된다(기하로는 iframe) | `mouseDrag.ts` `finish`가 이벤트로 분류 | iframe 위 릴리스는 `underCursor()`(기하)도 함께 기록한다 | R07-iframe, R12-telemetry |

### 브리프 변경

[BRIEF-2](../mfa/BRIEF-2-inspect.md)의 Amendments 절에 날짜와 함께 적은 변경을 여기에 요약한다. 사전 등록한 예측은 관찰 뒤에 고쳐 쓰지 않는다.

### 소요 시간과 메모

<설치·빌드·테스트 소요, 여러 세션에 걸쳤으면 세션별 범위, 다음 run에 넘길 것.>
