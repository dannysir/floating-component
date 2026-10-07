---
id: FC-QA-008
title: 경계선 리사이즈가 포인터 캡처를 잃으면 body userSelect가 none으로 남고 그 Resizer를 다시 잡을 수 없다
severity: sev-1
class: library-bug
status: open
confidence: high
repro_rate: 2/2
found_in: run01-tier1
variants: [telemetry-x]
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
fix_commit: none
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
