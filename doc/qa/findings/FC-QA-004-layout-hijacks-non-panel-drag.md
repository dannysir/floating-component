---
id: FC-QA-004
title: 패널이 패널 드래그가 아닌 드래그의 drop 전파를 막고 dropEffect를 덮어쓴다
severity: sev-2
class: spec-question
status: needs-user-confirmation
confidence: high
repro_rate: 2/2
found_in: run01-tier1
variants: [board, board-local, ext-chip]
input: mouse
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: H-DROP-HIJACK
harness_amplified: false
decision_ref: none
root_cause_group: foreign-drag-handlers-unguarded
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-004-layout-hijacks-non-panel-drag.spec.ts
fix_commit: none
---

# FC-QA-004 패널이 패널 드래그가 아닌 드래그의 drop 전파를 막고 dropEffect를 덮어쓴다

## 전제

- 레이아웃과 URL: http://127.0.0.1:4300/?layout=row3&a=board (twin: `&a=board-local`). 대조: board 단독 페이지 http://127.0.0.1:4302/
- 시작 트리: `H[p-a,p-b,p-c]`, 슬롯 배치: p-a = board(또는 board-local), p-b = control-b, p-c = control-c
- 플래그: drag=handle(기본) / 뷰포트 1280x800, 배율 1
- 라이브러리: src, Module Federation: on

## 절차

1. board 카드 `board-card-c1`에서 `page.mouse`로 드래그 시작(6px 이동).
2. 같은 패널의 열 `board-col-1` 위로 이동 → `mouse.up`.
3. 프로브의 window capture/bubble `drop` 레코드를 비교한다.

## 기대(오라클)

- 기대 동작: window 버블 단계 `drop` 리스너가 실행된다(단독 페이지와 같다). 레이아웃은 패널 드래그가 아닌 드래그에 투명하다.
- 근거: **가정**(H-DROP-HIJACK, 문서·사용자 결정 없음). 후보 오라클이므로 `status: needs-user-confirmation`, 권고: library-bug.

## 실제

| 케이스 | window `drop` 레코드 | 카드 이동 | 비고 |
|---|---|---|---|
| R09-board ×2 | capture만(`stopped: true`, bubble 없음) | `cardMoves` +1 | `lastTypes`에 `text/panel-id` 포함 |
| R09-board-local ×2 | 같다 | 같다 | |
| R09-standalone ×2 (대조) | capture + bubble | 같다 | `lastDragend.dropEffect 'move'` |

- 레이아웃 안에서는 remote의 드롭 핸들러는 실행되지만(카드 이동은 됨), 같은 drop이 document·window의 버블 리스너에 도달하지 않는다. 앱 셸이나 분석 코드가 window에서 drop을 듣는다면 레이아웃 안에서만 조용히 빠진다.
- R10 대조(`?layout=row3&a=board&b=control-b&lock=p-a:draggable`, 카드를 `board` 핸들 위에서 놓음, 2/2): 카드를 받는 존이 없는 패널 헤더 위인데 `dragend dropEffect 'move'`. 패널 `handleDragOver`가 모든 dragover를 `preventDefault` + `dropEffect = 'move'`로 받아들여 drop이 "성공"으로 끝난다. 단독 페이지라면 열 밖에서 놓은 카드는 `dropEffect 'none'`이다(열 밖에는 dragover 취소가 없다). 소스가 `dropEffect`로 이동 성공을 판단하는 remote(예: 원본 삭제)는 레이아웃 안에서 오동작할 수 있다. 관찰 기록 `obs/R10-ladder-lock-card-run{1,2}.json`.
- R11(copy 드롭)에서 `dropEffect` 덮어쓰기·copy 드롭 거부를 이 발견의 변형으로 덧붙인다.
- 실행별 결과: 1회차·2회차 같은 값.

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-004/` (R09-board-run1, 단독 페이지 대조는 `R09s-` 접두어로 R09-standalone-run1에서 `promote`).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| 03-after.png | 레이아웃 안에서 카드 c1이 packing 열로 이동 |
| events.json | `drop` capture 레코드만 있고 같은 `eid`의 bubble 레코드가 없다(`stopped: true`) |
| R09s-03-after.png / R09s-events.json | 단독 페이지: 같은 이동, `drop` capture와 bubble 둘 다 |
| console.txt, R09s-console.txt | 비어 있음 |

## 추정 원인

**가설(H-DROP-HIJACK).**

- `src/components/PanelNodeRenderer.tsx:115-120`(`handleDrop`) — 미리보기가 없으면(`isPreviewActive` false) `e.stopPropagation()`을 부른다. 패널 드래그가 아닌 드래그에는 미리보기가 없으므로 항상 막힌다. React의 `stopPropagation`은 네이티브 이벤트도 멈춘다.
- `src/components/PanelNodeRenderer.tsx:85-86`(`handleDragOver`) — 소스 확인 전에 `preventDefault()`와 `dropEffect = "move"`를 실행한다(R11에서 확인).
- 근본 원인은 FC-QA-003과 같은 계열(패널 핸들러가 드래그 종류를 가리지 않는다)이지만, 결과가 다르고 오라클이 가정뿐이라 별도 발견이다(분류 기본값표).

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 | 2/2 |
| 2 대조 교체 | `a=board-local`, 단독 페이지 | twin 재현, 단독 페이지는 bubble 있음 |
| 3 입력·릴리스 교체 | (R11 copy 쌍, R08-chip에서 덧붙인다) | — |
| 4 하네스 점검 | `stopped`는 같은 `eid`의 capture 뒤 bubble 레코드가 없을 때만 붙는다. 단독 페이지에서 같은 판정이 bubble을 본다 | 하네스 아님 |
| 5 픽스처 점검 | 카드 핸들러는 `stopPropagation`을 부르지 않는다 | 픽스처 아님 |
| 6 프로브 끄고 재실행 | 해당 없음 | — |
| 7 오라클 | 가정 | 후보 오라클 → `needs-user-confirmation` |

## 관련

- 시나리오: R09, 관찰 기록: doc/qa/run01-tier1/obs/R09-board-run1.json, R09-standalone-run1.json (run2도 같다)
- 관련 발견: FC-QA-003(같은 드래그가 패널 드래그로 등록됨), 가설: H-DROP-HIJACK
- 2026-10-07 R08 대조(`?layout=census` bare, stale 없음, `obs/R08-chip-control-run{1,2}.json`): 셸의 ext-chip(패널 밖에서 시작한 네이티브 드래그)을 `p-c` 위에 놓으면 `drop`이 capture만 찍히고 `stopped`(패널 `handleDrop`의 `stopPropagation`), `dragend dropEffect 'move'`. 패널 내용뿐 아니라 레이아웃 밖에서 들어온 드래그에도 같다.
