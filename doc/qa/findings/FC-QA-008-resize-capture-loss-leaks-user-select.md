---
id: FC-QA-008
title: 경계선 리사이즈가 포인터 캡처를 잃으면 body userSelect가 none으로 남고 그 Resizer를 다시 잡을 수 없다
severity: sev-1
class: library-bug
status: fixed
confidence: high
repro_rate: 4/4
found_in: run01-tier1
variants: [telemetry-x (workbench), telemetry-x (row3)]
input: mouse
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: H-RESIZE
harness_amplified: false
decision_ref: none
root_cause_group: resize-capture-cleanup
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-008-resize-capture-loss-leaks-user-select.spec.ts
fix_commit: caa911f
---

# FC-QA-008 경계선 리사이즈가 포인터 캡처를 잃으면 body userSelect가 none으로 남고 그 Resizer를 다시 잡을 수 없다

## 전제

- 레이아웃과 URL: http://127.0.0.1:4300/?layout=workbench
- 시작 트리: `H[nav,orders,V[H[board,billing],H[telemetry,telemetry-x]]]`. `telemetry`(127.0.0.1:4304, same-site)와 `telemetry-x`(localhost:4304, cross-site, `--site-per-process`에서 OOPIF) 사이 Resizer
- 뷰포트 1280x800, 라이브러리: src, MF on

## 절차

1. `resizeBorder(page, { between: ['telemetry','telemetry-x'], delta: +120, steps: 10 })` — 포인터가 Resizer에서 눌려 `telemetry-x` iframe 본문 위로 이동한 뒤 떼어진다.
2. 같은 경계선을 `-120`으로 다시 끈다.

## 기대(오라클)

- 기대 동작: 리사이즈가 포인터를 따라가고, 끝나면 `body.style.userSelect`가 원래 값(`""`)으로 돌아온다. 어떤 방식으로 끝나든(캡처 유실 포함) 같은 Resizer를 다시 잡을 수 있다.
- 근거: `doc/API.ko.md` `resizeBorder`(Pointer Events + `setPointerCapture`), 불변식 I4(`userSelect` 복원).

## 실제

| 실행 인자 / 방향 | top 프레임 이벤트 | 크기 변화 | `userSelect` 뒤 | 같은 Resizer 재시도 |
|---|---|---|---|---|
| `--site-per-process` / +120 (OOPIF 쪽) ×2 | `pointerdown`만. `gotpointercapture` 없음. 이후 `pointermove` 10회·`pointerup`이 **iframe 문서**로 감(`telemetry-x` `seen.pointermove` 0→10) | 0 | **`none` 잔존** → I4 실패 | 반대(-120)도 크기 0, 캡처 없음 → **다시 잡히지 않음** |
| `--site-per-process` / -120 (same-site telemetry 쪽) | 캡처 획득, 이동·`pointerup` 모두 top | -118.2 | `""` | 이어서 +120(OOPIF 쪽) → 위와 같이 실패 |
| 사이트 격리 없음 / ±120 (대조) | 캡처 획득, 모두 top | ±118.2 | `""` | 정상 |

- R17-resize ×2: 네 경계선 중 셋째(`telemetry|telemetry-x`, +120)에서 위 현상. 그 뒤 **다른** 경계선(`board|telemetry`)의 리사이즈는 동작하지만 끝난 뒤에도 `userSelect`가 `none` — 시작 때 저장한 이전 값(`prevUserSelect`)이 이미 누수된 `none`이라 그대로 "복원"한다. 누수가 이후 모든 리사이즈로 이어진다.
- 사용자 영향: 페이지 전체의 텍스트 선택이 막히고(새로고침 전까지), 그 경계선은 다시 조절할 수 없다 → README 4절 sev-1("Resizer가 다시 잡히지 않음", 분류 기본값).
- 트리거(캡처 유실)의 충실도: 이 환경에서는 OOPIF 쪽으로 끌 때만 생긴다. CDP 마우스 입력이 OOPIF 위에서 host의 포인터 캡처를 따르지 않는 것이 실제 Chrome과 같은지는 확인하지 못했다(REPORT 8절 수동 확인). 다만 결함의 본체 — 종료 이벤트가 Resizer에 오지 않으면 정리가 영영 일어나지 않는 것 — 는 트리거와 무관한 코드 구조다(창 밖에서 떼기, 캡처를 가로채는 다른 코드 등).
- 실행별 결과: 1회차·2회차 같은 값.

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-008/` (R17-resize-run1에서 `promote`).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| 01-before.png | 시작 상태 (workbench) |
| 03-after.png / tree-after.json | 리사이즈 8회 뒤. `dom.bodyUserSelect: "none"`, telemetry·telemetry-x 폭 258 그대로 |
| events.json | 셋째 경계선 구간에 `pointerdown`(top) 뒤 top 레코드 없음 |
| console.txt | 비어 있음 |

진단 로그: `node mfa-lab/scripts/ctl.mjs test explore/r17b` — `[r17b spp ±120]`·`[r17b nospp ±120]` 줄(위 표).

## 추정 원인

**가설(H-RESIZE).**

- `src/hooks/useDragResize.ts:19` — `if (activePointerId.current !== null) return;` 종료되지 않은 세션이 남으면 그 Resizer는 영구히 무시한다.
- `src/hooks/useDragResize.ts:29-30` — 시작 때 `prevUserSelect`를 읽고 `none`으로 바꾼다. 앞선 누수가 있으면 `none`을 저장한다.
- `src/hooks/useDragResize.ts:45-58, 60-62` — 정리는 Resizer 요소에 온 `pointerup`/`pointercancel`의 `finish`에서만. `lostpointercapture` 처리, 창 `blur`, unmount 정리가 없다. `setPointerCapture` 실패(캡처 이벤트 없음)도 감지하지 않는다.

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회(R17-resize) + 진단 4회 | 2/2 |
| 2 대조 교체 | same-site `telemetry` 쪽으로 끌기 | 정상 → OOPIF 쪽에서만 |
| 3 입력·릴리스 교체 | (R15에서 `releaseOver`·150px로 덧붙인다) | — |
| 4 하네스 점검 | `--site-per-process` 제거 | 정상. 트리거는 OOPIF 입력 라우팅. 단 정리 누락은 라이브러리 코드 |
| 5 픽스처 점검 | telemetry-x는 정적 페이지, 포인터 핸들러는 기록만(`seen`) | 픽스처가 캡처를 가로채지 않음 |
| 6 프로브 끄고 재실행 | 해당 없음 | 크기·`userSelect`는 프로브와 무관 |
| 7 오라클 | `resizeBorder` 문서, I4 | 있음 |

## 관련

- 시나리오: R17, 관찰 기록: doc/qa/run01-tier1/obs/R17-resize-run{1,2}.json. R15에서 iframe 옆 리사이즈로 증거를 덧붙인다.
- 관련 발견: FC-QA-006(같은 OOPIF 입력 라우팅이 드래그 종료를 잃는 하네스 현상), 가설: H-RESIZE
- 2026-10-07 R15(`?layout=row3&a=control-a&b=telemetry&c=telemetry-x`, 브리프 절차: iframe 쪽으로 150px + iframe 중앙에서 놓기 → 반대로 -150, 2/2씩): same-site `telemetry` 쪽은 캡처 획득, `pointerup` top, 포인터 이동 210.7px에 p-a +208.0, `userSelect` 복원, 반대 -148.1 — 깨끗(as-ideal). OOPIF `telemetry-x` 쪽은 캡처 없음, `pointermove` 16회·`pointerup`이 iframe 문서로(`seen.pointermove` 0→16), 크기 0, `userSelect` `none` 잔존(I4 실패), 반대 -150도 0(Resizer 다시 잡히지 않음), `onResizeBorder` 0건. R15의 "열린 질문"에 대한 이 환경의 답. 관찰 기록 `obs/R15-*-run{1,2}.json`.
- 2026-10-07 수정(`caa911f`, 브랜치 `fix/fc-qa-008-resize-capture-cleanup`, 사용자 Windows 11 PC, 레인 B: Playwright 1.63.0 + Chromium 153.0.8010.12 headless shell, `--site-per-process`): 진단 결과 OOPIF 쪽으로 끌면 top 프레임은 `pointerdown` 뒤 `gotpointercapture`·`lostpointercapture`·`pointerup`을 하나도 받지 않고, 다음 이벤트는 Resizer로 돌아왔을 때의 `pointermove`(buttons 0)였다. 그래서 `useDragResize`가 `body.style.userSelect`를 `gotpointercapture`에서 바꾸고 캡처가 끝나면(`lostpointercapture`) 되돌리도록 했다. 캡처를 얻지 못한 세션은 버튼이 떼어진 `pointermove`나 다음 `pointerdown`에서 정리하고, `pointerup`·`pointercancel` 외에 window `blur`·unmount에서도 정리한다. F2 2/2 예상대로 실패(`userSelect` `"none"`) → F6 1회차에 예상과 달리 통과 → F7 `test.fail()` 제거 뒤 2/2 통과. F8: `ctl smoke` OK, `test smoke` 19 passed·1 skipped, 회귀 mouse 14 expected·1 skipped·0 unexpected, touch 15 expected·0 unexpected(이 발견만 통과, 나머지는 예상대로 실패), 스파이크 전체 통과(S7a·S7b는 touch 프로젝트로 통과). 같은 `root_cause_group`의 다른 발견은 없다. 실제 Chrome에서 OOPIF 쪽 리사이즈를 손으로 확인하는 일(REPORT 8절)은 남아 있다.
- 2026-10-07 main 반영: `caa911f`를 `release/1.0.0`에 cherry-pick(`2decb5f`)해 PR #15로 main에 머지했고, 1.0.0으로 npm에 배포했다(05:52 UTC, 버전 커밋 `4665387`, 태그 `v1.0.0`). 이 커밋은 main을 `qa/mfa-lab`에 머지한 것이며, 머지 뒤 `git rev-parse HEAD:src`가 main과 같다(`12273073`).
