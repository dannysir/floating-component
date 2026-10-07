---
id: FC-QA-009
title: 드롭 직전 마지막 dragover가 예약한 미리보기가 드래그가 끝난 뒤 실행돼 소스 패널의 shadow가 남는다 (stale preview)
severity: sev-2
class: library-bug
status: open
confidence: high
repro_rate: 4/4
found_in: run01-tier1
variants: [board, ext-chip-commit]
input: mouse
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: H-RAF-STALE
harness_amplified: true
decision_ref: none
root_cause_group: raf-not-cancelled-on-drop
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-009-stale-preview-after-drop.spec.ts
fix_commit: none
---

# FC-QA-009 드롭 직전 마지막 dragover가 예약한 미리보기가 드래그가 끝난 뒤 실행돼 소스 패널의 shadow가 남는다 (stale preview)

## 전제

- 레이아웃과 URL: http://127.0.0.1:4300/?layout=workbench
- 준비: `orders`를 `(billing, top, 0)`으로 이동 → 트리 `H[nav,V[H[board,V[orders,billing]],H[telemetry,telemetry-x]]]`
- 플래그: drag=handle / 뷰포트 1280x800, 라이브러리: src, MF on

## 절차

1. `board` 핸들에서 마우스 드래그 시작(`begin`).
2. `telemetry` 헤더 중앙(`handlePoint('telemetry')`)으로 teleport → 미리보기 `H[nav,V[V[orders,billing],board,H[telemetry,telemetry-x]]]`.
3. 같은 점에서 `nudge` 4회(멈춘 커서에 실제 브라우저가 약 350ms마다 보내는 dragover를 흉내. HARNESS 부작용 #2, `emulated`).
4. 그 점에서 `mouse.up`(`release({ mode: 'settled' })`).

## 기대(오라클)

- 기대 동작: 드래그가 끝나면 미리보기도 없다. 소스 패널에 shadow 스타일이 남지 않는다.
- 근거: 불변식 I2(진행 중인 드래그가 없으면 shadow 없음), HARNESS.md 「stale preview 판정 규칙」.

## 실제

| 실행 | `underCursorAtDrop` | 마지막 dragover → drop | 커밋 | 드롭 뒤 |
|---|---|---|---|---|
| r18-x01-nudge run1 | `other-droppable`(telemetry 헤더) | 2.2 ms | `onMovePanel` 1건, 트리 = 미리보기 | `board` shadow 잔존, **I2 실패**, I1 통과 |
| r18-x01-nudge run2 | 같다 | 0.5 ms | 같다 | 같다 |

- 시그니처 일치: I1 통과 + I2 실패, `underCursorAtDrop 'other-droppable'`, 그 패널의 마지막 `dragover`가 `drop`과 한 프레임(약 17 ms) 안.
- 화면: 드롭 뒤에도 Board가 반투명 + 점선(03-after.png). 다음 드래그 전까지 남는다.
- 대조(같은 스펙, nudge 없음 2회): 놓는 순간 dragover가 미뤄져(부작용 #17) drop 없이 취소, 깨끗함.
- `harness_amplified: true`: CDP `mouse.up`이 dragover → drop → dragend를 연달아 보내 rAF 경합을 사람보다 훨씬 자주 건드린다(부작용 #3). 경합 자체는 실제로 존재한다(사람이 다른 패널 위에서 놓을 때 마지막 dragover와 drop이 한 프레임 안이면 같다).
- 첫 관찰은 R18 탐색 #13. R08에서 의도적 재현·후속 영향을 덧붙인다.
- 실행별 결과: 1회차·2회차 같은 값.

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-009/` (r18-x01-nudge-run1에서 `promote`).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| 02-mid.png / 02-mid.snapshot.json | 놓기 직전 미리보기(board가 가운데, 점선) |
| 03-after.png / tree-after.json | 드롭 뒤에도 board가 반투명+점선(`dom.panels.board.shadow: true`), 트리는 커밋됨 |

이벤트 순서(스펙 로그): `dragover(telemetry)×n → drop(telemetry) → dragend` — 마지막 dragover와 drop 사이 0.5~2.2 ms.

## 추정 원인

**가설(H-RAF-STALE).**

- `src/components/PanelNodeRenderer.tsx:103-106` — `dragover`가 패널별 rAF 스케줄러로 미리보기 갱신을 예약한다.
- `src/components/PanelNodeRenderer.tsx:111-128`(`handleDrop`)·`src/components/TreeLayout.tsx:80-83`(`finishDrag`) — 예약을 취소하지 않는다(터치 경로는 `useTouchDrag.ts:175`에서 취소).
- `src/hooks/useDropPreview.ts:22-26` — 늦게 실행된 콜백이 드래그가 끝난 뒤 미리보기를 다시 설정한다.

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 | 2/2 |
| 2 대조 교체 | (R08에서 bare·다른 패널로 덧붙인다) | — |
| 3 입력·릴리스 교체 | `overShadow` 릴리스(R01~R17 전부) | 한 번도 나타나지 않음(마지막 dragover가 소스 shadow) |
| 4 하네스 점검 | 시그니처 규칙, 부작용 #2·#3·#17 | 시그니처 일치 → `harness_amplified: true` |
| 5 픽스처 점검 | board·telemetry 무관(패널 래퍼 핸들러) | — |
| 6 프로브 끄고 재실행 | 회귀 스펙은 프로브 기록 없이 I2만 본다 | 재현 |
| 7 오라클 | 불변식 I2 | 있음 |

## 관련

- 시나리오: R18(탐색 #13 → `explore/r18-x01-header-release-after-root-preview.spec.ts`), R08(예정). 로그 `doc/qa/run01-tier1/obs/R18-log.json` n=13.
- 가설: H-RAF-STALE
- 2026-10-07 R08(`?layout=census` bare, 브리프의 `immediate` 유도): 0/5 × 2 — 미리보기 리플로로 커서 아래 요소가 바뀌어 `mouse.up`의 dragover가 미뤄지고(HARNESS 부작용 #17) drop 없이 취소된다. 이 환경에서 그 유도 경로는 stale을 만들지 못한다. `obs/R08-stale-run{1,2}.json`.
- 2026-10-07 R08 대체 유도(R18-x01 경로, `obs/R08-chip-alt-run{1,2}.json`, 2/2): stale 상태에서 **패널 드래그가 아닌** ext-chip(`application/x-harbor-chip`, `data-dragging-panel-id` 없음)을 orders 위에 놓으면 패널 `handleDrop`이 `isPreviewActive`로 통과하고 루트 `onDrop`이 stale 미리보기를 커밋한다: `onMovePanel('board','telemetry','top',1)` 1건, `treeVersion` 2→3. 이 경우 미리보기 트리가 커밋 트리와 같아 화면은 그대로지만, 호스트는 사용자가 하지 않은 이동 콜백을 받는다. 대조(stale 없음, `obs/R08-chip-control-run{1,2}.json`): `onMovePanel` 0건, drop `stopped`.
- 2026-10-07 심각도 sev-3 → **sev-2**: 분류 기본값("sev-2(`R08-chip`의 stale 커밋이 관찰되면)"). 증거 `R08c-03-after.png`.
