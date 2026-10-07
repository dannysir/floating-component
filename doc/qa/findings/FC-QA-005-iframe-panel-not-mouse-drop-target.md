---
id: FC-QA-005
title: iframe 패널은 마우스 드래그의 드롭 대상이 되지 않는데 터치 드래그에서는 된다 (경로 불일치)
severity: sev-3
class: library-bug
status: open
confidence: high
repro_rate: 2/2
found_in: run01-tier1
variants: [control-iframe, telemetry, telemetry-x]
input: mouse, touch-cdp-handle
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: H-IFRAME-DEAD
harness_amplified: false
decision_ref: none
root_cause_group: iframe-drop-target-mouse
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-005-iframe-panel-not-mouse-drop-target.spec.ts
fix_commit: none
---

# FC-QA-005 iframe 패널은 마우스 드래그의 드롭 대상이 되지 않는데 터치 드래그에서는 된다 (경로 불일치)

## 전제

- 레이아웃과 URL: http://127.0.0.1:4300/?layout=row3&a=control-a&b=telemetry&c=telemetry-x&iframeShield=0 (대조: `b=control-iframe`, same-origin srcdoc)
- 시작 트리: `H[p-a,p-b,p-c]`, 슬롯 배치: p-a = control-a, p-b = telemetry(또는 control-iframe), p-c = telemetry-x
- 플래그: drag=handle, `iframeShield=0` / 뷰포트 1280x800, 배율 1
- 라이브러리: src, Module Federation: on

## 절차

1. 마우스: `control-a` 핸들에서 드래그 시작(`begin`) → `dropPoint(p-b, right, 0)`(iframe 본문 안의 점, `underCursor`가 `p-b`·`IFRAME`) → settle → `nudge` → `mouse.up`.
2. 터치(touch 프로젝트): 같은 핸들에서 `handleDrag(page, 'control-a', [dropPoint(p-b, right, 0)], 'end')`.

## 기대(오라클)

- 기대 동작: iframe 패널도 다른 패널과 같은 드롭 대상이다. hover에서 미리보기 `H[p-b,p-a,p-c]`, 놓으면 커밋. 입력 방식에 따라 결과가 갈리지 않는다.
- 근거: `doc/API.ko.md` "드래그 앤 드롭"(마우스와 터치에 같은 드롭 규칙, iframe 예외 없음).

## 실제

| 입력 / 대상 | hover `domTree` | `onMovePanel` | 커밋된 트리 | 비고 |
|---|---|---|---|---|
| 마우스 / control-iframe (same-origin) ×2 | `H[p-a,p-b,p-c]` (미리보기 없음) | 0건 | 불변 | top 프레임의 `p-b` 대상 dragover 0건, `dragend dropEffect 'none'`, I1~I7 통과 |
| 마우스 / telemetry (cross-origin, same-site) ×2 | 같다 | 0건 | 불변 | 하네스 충실도 단서: HARNESS 부작용 #7(어느 문서에도 드래그 이벤트 없음, `seen` 0) |
| 마우스 / telemetry-x (cross-site, OOPIF) ×2 | 같다 | 0건 | 불변 | 릴리스 뒤 `dragend`가 오지 않음 → FC-QA-006(harness-artifact) |
| **터치** / telemetry ×2 | (ghost) | **1건 `('p-a','p-b','right',0)`** | **`H[p-b,p-a,p-c]`** | ghost 1개, I1~I7 통과 |
| **터치** / telemetry-x ×2 | (ghost) | **1건 `('p-a','p-c','left',0)`** | **`H[p-b,p-a,p-c]`** | 손가락 아래 `iframe` |
| **터치** / control-iframe ×2 | (ghost) | **1건** | **`H[p-b,p-a,p-c]`** | |
| 마우스 + `iframeShield=1` / telemetry, telemetry-x ×2 | `H[p-b,p-a,p-c]` | 1건 | `H[p-b,p-a,p-c]` | shield(`pointer-events:none`)가 있으면 된다(우회책) |

- 같은 지점·같은 핸들인데 마우스는 아무 일도 일어나지 않고(취소), 터치는 커밋된다. 하네스가 충실한 same-origin `control-iframe`에서도 마우스는 미리보기가 없다: dragover가 iframe 문서로 가고(S9) host의 패널 리스너에는 오지 않는다.
- 사용자 관점: iframe 패널(예: 대시보드 위젯)을 마우스로는 끌어다 놓을 수 없고, 같은 앱을 터치로 쓰면 된다. 커서는 iframe 위에서 드롭 불가로 보인다(수동 확인 항목).
- 실행별 결과: 1회차·2회차 같은 값.
- 심각도: 기능이 동작하지 않지만 우회책(shield, 다른 지점에 놓기)이 있고 데이터 손실이 없다 → sev-3(분류 기본값).

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-005/` (R12-telemetry-run1, 터치는 `R12t-` 접두어로 R12-touch-telemetry-run1에서 `promote`).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| 02-mid.png | 마우스 hover가 telemetry iframe 본문 위인데 레이아웃 그대로, iframe 배지 `de0 do0` (직접 열어 확인) |
| 03-after.png / tree-after.json | 놓은 뒤 트리 불변 |
| events.json | dragstart → dragenter(p-a)뿐. iframe 위에서 host·iframe 어느 쪽에도 dragover 없음(부작용 #7) |
| R12t-03-after.png / R12t-tree-after.json | 터치로 같은 동작 → `H[p-b,p-a,p-c]` 커밋 |
| console.txt, R12t-console.txt | 비어 있음 |

## 추정 원인

**가설(H-IFRAME-DEAD).**

- 마우스 경로: 드롭 대상 판정이 패널 래퍼의 `onDragOver`/`onDrop`(`src/components/PanelNodeRenderer.tsx:83-106, 144-147`)에 달려 있다. 커서가 `<iframe>` 위에 있으면 브라우저는 드래그 이벤트를 iframe 문서로 보내므로 host의 패널 핸들러는 실행되지 않는다. 드래그 중 iframe에 `pointer-events: none`을 거는 처리가 라이브러리에 없다(`data-dragging-panel-id`는 78행에서 루트에 붙지만 이를 쓰는 CSS가 없다).
- 터치 경로: `src/hooks/useTouchDrag.ts:101-103`이 `document.elementFromPoint` → `<iframe>` 요소 → `closest('[data-panel-id]')`로 패널을 찾으므로 iframe 패널도 대상이 된다.
- 두 경로가 대상 판정을 다르게 한다.

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 (마우스 3종, 터치 3종) | 2/2 |
| 2 대조 교체 | `b=control-iframe`(same-origin srcdoc) | 재현. 픽스처(telemetry) 탓이 아니다 = 컨테이너 고유 현상 |
| 3 입력·릴리스 교체 | touch 프로젝트 `handleDrag`(S7a 재실행 통과 뒤) | **터치는 커밋** → 경로 불일치 확인 |
| 4 하네스 점검 | cross-origin 위 이벤트 미전달은 부작용 #7. same-origin `control-iframe`에서는 iframe 문서에 dragover가 오고 host에는 없다(S9) — 실제 브라우저와 같은 전달 방식 | 마우스 결론은 `control-iframe`으로 성립. telemetry·telemetry-x 마우스 행은 충실도 단서 |
| 5 픽스처 점검 | `iframeShield=1`이면 동작 | 픽스처는 shield를 끄고 켤 수 있을 뿐, 라이브러리 기본 동작은 shield 없음 |
| 6 프로브 끄고 재실행 | 해당 없음 | 결과는 트리·`calls`로 판정 |
| 7 오라클 | `doc/API.ko.md` "드래그 앤 드롭" | 있음 |

## 관련

- 시나리오: R12, 관찰 기록: doc/qa/run01-tier1/obs/R12-telemetry-run1.json, R12-telemetry-x-run1.json, R12-ladder-control-iframe-run1.json, R12-shield-p-b-run1.json, R12-shield-p-c-run1.json, R12-touch-telemetry-run1.json, R12-touch-telemetry-x-run1.json, R12-touch-control-iframe-run1.json (run2도 같다). R07-iframe(`obs/R07-iframe-run{1,2}.json`)도 같은 현상(iframe 위 릴리스가 취소).
- 2026-10-07 R17 M2(`?layout=workbench`, `board → (telemetry, left, 0)`): 놓는 점이 telemetry iframe 본문이라 미리보기·이동 없음(2/2). 제품 기본 화면에서도 iframe 패널을 마우스로 앵커 삼을 수 없다. `obs/R17-moves-run{1,2}.json`.
- 통합 가이드 후보(REPORT 6절): 드래그 중 `[data-dragging-panel-id] iframe { pointer-events: none }`, 핸들은 host가 그린다.
- 관련 발견: FC-QA-006(OOPIF 위 릴리스의 하네스 부작용), 가설: H-IFRAME-DEAD
