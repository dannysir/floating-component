---
id: FC-QA-003
title: 패널 내용(remote의 칸반 카드)에서 시작한 네이티브 드래그가 패널 드래그로 처리된다
severity: sev-2
class: library-bug
status: open
confidence: high
repro_rate: 2/2
found_in: run01-tier1
variants: [board, board-local]
input: mouse
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: H-FOREIGN-DRAG
harness_amplified: false
decision_ref: none
root_cause_group: foreign-dragstart-unguarded
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-003-content-native-drag-becomes-panel-drag.spec.ts
fix_commit: none
---

# FC-QA-003 패널 내용(remote의 칸반 카드)에서 시작한 네이티브 드래그가 패널 드래그로 처리된다

## 전제

- 레이아웃과 URL: http://127.0.0.1:4300/?layout=row3&a=board (twin: `&a=board-local`). 대조: board 단독 페이지 http://127.0.0.1:4302/
- 시작 트리: `H[p-a,p-b,p-c]`, 슬롯 배치: p-a = board(또는 board-local), p-b = control-b, p-c = control-c
- 플래그: drag=handle(기본) / 뷰포트 1280x800, 배율 1
- 라이브러리: src, Module Federation: on

## 절차

1. board 카드 `board-card-c1` 중앙으로 `mouse.move` → `mouse.down` → 6px `mouse.move` → settle (신뢰된 `dragstart`가 카드에서 시작).
2. 같은 패널 안의 열 `board-col-1` 중앙으로 이동 → settle → `mouse.up`.

## 기대(오라클)

- 기대 동작: 카드 순서가 바뀐다. 루트에 `data-dragging-panel-id`가 붙지 않는다(카드 드래그는 패널 드래그가 아니다).
- 근거: `src/components/PanelNodeRenderer.tsx:73`의 주석 `// 내부 img/link 등의 네이티브 드래그가 버블링돼 패널 드래그로 오인되지 않게 한다.`

## 실제

| 케이스 | 드래그 중 루트 `data-dragging-panel-id` | `dragstart` 버블 `types` / `effectAllowed` | 카드 이동 | 트리·`onMovePanel` |
|---|---|---|---|---|
| R09-board ×2 | `"p-a"` | `[application/x-harbor-card, text/panel-id]` / `move` | `cardMoves` +1 (c1 → packing) | 불변, 0건 |
| R09-board-local ×2 | `"p-a"` | 같다 | 같다 | 불변, 0건 |
| R09-standalone ×2 (대조) | 없음 | `[application/x-harbor-card]` / `move` | 같다 | (레이아웃 없음) |

- 카드 드래그가 시작되는 순간 라이브러리가 그것을 `p-a` 패널 드래그로 등록한다: 루트에 `data-dragging-panel-id="p-a"`가 붙고 데이터에 `text/panel-id`가 추가된다. 같은 패널 안에서 끝나면(R09) 소스 = 대상이라 미리보기·이동이 없어 겉으로는 드러나지 않는다. 옆 패널 위로 가면 미리보기와 패널 이동이 된다(R10에서 확인한다).
- 드래그가 끝난 뒤 `data-dragging-panel-id`는 지워지고 I1~I7 통과(카드 노드에 건 `dragend` 리스너가 `finishDrag`, 카드가 다른 열로 옮겨져 분리된 노드에서도 동작).
- MF on, remote(board)와 twin(board-local) 결과가 같다 → 라이브러리 코어 동작.
- 실행별 결과: 1회차·2회차 같은 값.
- 심각도: 사용자가 remote 안에서 정상적인 드래그를 했을 뿐인데 레이아웃이 그것을 패널 이동으로 해석한다(R10에서 실제 이동이 확인되면 데이터 손실 없는 레이아웃 오변경). README 4절 기준 sev-2.

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-003/` (R09-board-run1에서 `promote`).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| 02-mid.png | 카드 드래그 중. 화면에는 변화가 없다(미리보기·shadow 없음. 직접 열어 확인) |
| 02-mid.snapshot.json | `dom.draggingPanelId: "p-a"` |
| 03-after.png / tree-after.json | 카드 c1이 packing 열로 이동, 레이아웃 트리 불변 |
| events.json | 카드 `dragstart`(버블 `types`에 `text/panel-id`), `drop`(capture만), 분리된 카드의 `dragend` |
| console.txt | 비어 있음 |

## 추정 원인

**가설(H-FOREIGN-DRAG).**

- `src/components/PanelNodeRenderer.tsx:71-81` — `handleDragStart`의 가드는 74행 `if (!canDrag) return;` 하나다. 이벤트 대상이 패널 자신인지, 핸들에서 시작했는지 보지 않는다. 핸들 모드에서 패널 요소의 `draggable`은 `false`지만 자손(카드는 `draggable`)의 `dragstart`는 버블링으로 여기까지 오고, 76~79행이 `text/panel-id`·`effectAllowed = "move"`·`root.dataset.draggingPanelId`를 설정한다.
- `src/components/TreeLayout.tsx:144-150` — 루트 `onDragStart`는 `draggingPanelId`가 있으면 패널 드래그로 보고 원본 노드(카드)에 `finishDrag`를 건다.

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 | 2/2 |
| 2 대조 교체 | `a=board-local`(빌드 타임 twin) | 재현. remote 로딩 경로와 무관 |
| 3 입력·릴리스 교체 | (R10에서 img·옆 패널 드롭을 덧붙인다) | — |
| 4 하네스 점검 | `page.mouse` 직접 사용(헬퍼 없음), 프로브는 수동 리스너 | 단독 페이지에서는 같은 입력으로 `text/panel-id`가 없다 |
| 5 픽스처 점검 | 카드 핸들러는 `stopPropagation`을 부르지 않는다(흔한 구현) | 픽스처는 표준 HTML5 DnD만 쓴다 |
| 6 프로브 끄고 재실행 | 해당 없음 | `data-dragging-panel-id`는 라이브러리가 쓰는 속성이다 |
| 7 오라클 | `PanelNodeRenderer.tsx:73` 주석 | 있음 |

## 관련

- 시나리오: R09, 관찰 기록: doc/qa/run01-tier1/obs/R09-board-run1.json, R09-board-local-run1.json, R09-standalone-run1.json (run2도 같다)
- 관련 발견: FC-QA-004(같은 드래그에서 drop 전파가 막힘, H-DROP-HIJACK), 가설: H-FOREIGN-DRAG
