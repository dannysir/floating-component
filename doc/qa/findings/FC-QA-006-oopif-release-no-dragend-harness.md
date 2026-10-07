---
id: FC-QA-006
title: (하네스) OOPIF 위에서 마우스를 떼면 dragend가 오지 않고 CDP 드래그 세션이 멈춘다
severity: sev-4
class: harness-artifact
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
hypothesis: none
harness_amplified: false
decision_ref: none
root_cause_group: harness-cdp-drag-oopif
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/explore/r12c-oopif-release-spp.spec.ts
fix_commit: none
---

# FC-QA-006 (하네스) OOPIF 위에서 마우스를 떼면 dragend가 오지 않고 CDP 드래그 세션이 멈춘다

## 전제

- 레이아웃과 URL: http://127.0.0.1:4300/?layout=row3&a=control-a&b=telemetry&c=telemetry-x&iframeShield=0
- `telemetry-x`(http://localhost:4304, cross-site)는 실행 인자 `--site-per-process`에서 OOPIF다(S9).
- 라이브러리: src, Module Federation: on

## 절차

1. `control-a` 핸들에서 마우스 드래그 시작(`begin`) → `dropPoint(p-c, left, 0)`(telemetry-x iframe 본문) → `nudge` → `mouse.up`.
2. 이어서 다른 지점으로 `mouse.move`, 다시 `mouse.up`, `Escape`.

## 기대(오라클)

- 기대 동작: 놓으면 `dragend`가 소스 노드로 온다(드롭이 없으면 `dropEffect 'none'`). 실제 브라우저는 드래그 종료를 항상 소스에 알린다(HTML 표준 drag-and-drop 처리 모델, https://html.spec.whatwg.org/multipage/dnd.html).
- 근거: 표준 + 같은 절차의 사이트 격리 없는 대조.

## 실제

| 실행 인자 | `mouse.up` 뒤 이벤트 | 루트 `data-dragging-panel-id` | 이후 이동·두 번째 up·Esc |
|---|---|---|---|
| `--site-per-process`(기본, OOPIF) | dragstart, dragenter(p-a)뿐. **`dragleave`·`dragend` 없음** | `p-a`로 남음 → I1 실패 | 이벤트 0, 계속 `p-a` |
| 사이트 격리 없음(대조, telemetry-x가 OOPIF 아님) | dragleave → `dragend`(target, `none`, connected) | 지워짐 | — |

- R12-telemetry-x(마우스) 2회 모두 I1 실패(`data-dragging-panel-id=p-a remains`), `dragendDropEffect null`. same-site `telemetry`(같은 프로세스)에서는 `dragend('none')`이 와서 I1 통과.
- 라이브러리는 `dragend`로 정리하므로(`src/components/TreeLayout.tsx:144-150`) 종료 이벤트가 오지 않으면 남는 것이 정상이다. 원인은 Playwright가 가로챈 드래그(`Input.dispatchDragEvent`)를 OOPIF 위에서 끝낼 때의 전달 방식으로 추정한다.
- 실제 사용자에게는 일어나지 않는다고 본다(추론). 실기기·실브라우저 확인은 REPORT 8절 수동 항목.

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-006/` (R12-telemetry-x-run1 산출물을 복사).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| 02-mid.png | telemetry-x(OOPIF) 본문 위 hover, 미리보기 없음 |
| 03-after.png / tree-after.json | 놓은 뒤에도 루트 `draggingPanelId: "p-a"`가 남음(I1 실패) |
| events.json | dragstart·dragenter 뒤 `dragleave`·`dragend` 없음 |
| console.txt | 비어 있음 |

- 관찰 기록: doc/qa/run01-tier1/obs/R12-telemetry-x-run{1,2}.json (`labels.harness_artifact`)
- 재현: `node mfa-lab/scripts/ctl.mjs test explore/r12c` — `[diag spp]`와 `[diag nospp]` 로그 줄(이 run의 출력은 위 표)

## 추정 원인

- Playwright의 CDP 드래그 인터셉트가 OOPIF 위 drop을 소스 렌더러에 전달하지 못한다(추론). `--site-per-process`가 없으면 사라진다.

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 + 진단 스펙 | 재현 |
| 2 대조 교체 | same-site `telemetry`(같은 프로세스), `control-iframe` | `dragend` 옴 |
| 3 입력·릴리스 교체 | 터치 | 정상 종료(ghost 제거, 커밋) |
| 4 하네스 점검 | 실행 인자에서 `--site-per-process`만 제거 | `dragend` 옴 → **harness-artifact** |
| 5~7 | 해당 없음 | — |

## 관련

- 제안: HARNESS.md 「알려진 하네스 부작용」에 #19로 추가(REPORT.md 10절). 대처: OOPIF(`telemetry-x`) 위 마우스 릴리스 결과는 판정에 쓰지 않고, 그 뒤 페이지는 재사용하지 않는다.
- 관련 발견: FC-QA-005
