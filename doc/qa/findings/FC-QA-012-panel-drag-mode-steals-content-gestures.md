---
id: FC-QA-012
title: 핸들 없는 모드(drag=panel)에서 패널 안 슬라이더·텍스트 선택 드래그가 패널 드래그로 바뀐다
severity: sev-3
class: spec-question
status: needs-user-confirmation
confidence: high
repro_rate: 2/2
found_in: run01-tier1
variants: [billing-range, billing-input, control-a-input]
input: mouse
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: H-HANDLE-STALE
harness_amplified: false
decision_ref: none
root_cause_group: panel-mode-draggable-container
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-012-panel-drag-mode-steals-content-gestures.spec.ts
fix_commit: none
---

# FC-QA-012 핸들 없는 모드(drag=panel)에서 패널 안 슬라이더·텍스트 선택 드래그가 패널 드래그로 바뀐다

## 전제

- 레이아웃과 URL: http://127.0.0.1:4300/?layout=pair&a=billing&b=control-b&drag=panel (대조: `?layout=pair&drag=panel`의 control-a)
- `drag=panel`: `dragHandleSelector` 없음 → 문서상 "패널 전체가 드래그 가능"(`doc/API.ko.md:33`)
- 라이브러리: src

## 절차

1. billing 패널 안 `billing-range` 슬라이더 40% 지점에서 `mouse.down` → 80% 지점까지 8단계 이동.
2. `billing-input`(또는 `control-a-input`)에 글자를 넣고 왼쪽 끝에서 오른쪽 끝으로 드래그(텍스트 선택 의도).

## 기대(오라클)

- 기대 동작: 슬라이더 조작·입력창 텍스트 선택은 그 컨트롤의 기본 동작이 되고 패널 드래그를 시작하지 않는다.
- 근거: **가정**. 문서는 "미지정 시 패널 전체가 드래그 가능"이라고만 하고 내용의 상호작용과의 관계를 정하지 않는다 → `spec-question`, `needs-user-confirmation`. 권고: 라이브러리가 상호작용 요소(`input`, `textarea`, `select`, `[contenteditable]`, range 등)에서 시작한 드래그를 패널 드래그로 취급하지 않거나, 문서에 "패널 모드는 내용 상호작용과 충돌한다 — 핸들 모드를 쓰라"를 명시.

## 실제

| 동작 | 결과 (2/2) |
|---|---|
| 슬라이더 드래그 | 값 40→45에서 멈추고 신뢰된 `dragstart`, 루트 `data-dragging-panel-id="p-a"` → 패널 드래그로 바뀜 |
| billing 입력창 텍스트 드래그 | 선택 길이 0, `dragstart`, `data-dragging-panel-id="p-a"` |
| control-a 입력창 텍스트 드래그(대조) | `data-dragging-panel-id="p-a"`(회귀 스펙에서 확인) |

- Esc로 취소하면 I1~I7 통과. 트리 변화 없음.
- 관련 관찰(핸들 모드, `P1-handle-stale`): 핸들 드래그 + Esc 뒤 패널 `draggable`이 `true`로 남지만(H-HANDLE-STALE의 상태 자체는 관찰됨), 다음 `mousedown`이 핸들 밖이면 `false`로 되돌려 내용 드래그가 패널 드래그로 바뀌지 않았다 — 핸들 모드에서는 사용자 영향 미관찰.
- 실행별 결과: 1회차·2회차 같은 값.

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-012/` (P1-panel-mode-run1 산출물을 복사).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| events.json | 슬라이더·입력창 드래그 구간의 신뢰된 `dragstart`(패널 드래그로 시작됨) |
| 03-after.png / tree-after.json | Esc 취소 뒤 상태(트리 불변) |
| console.txt | 비어 있음 |

- 관찰 기록: doc/qa/run01-tier1/obs/P1-panel-mode-run{1,2}.json, P1-handle-stale-run{1,2}.json
- 재현: 회귀 스펙(test.fail 제거 시 `panel drag started from text selection: "p-a"`로 실패)

## 추정 원인

- `src/components/PanelNodeRenderer.tsx:57-68` — 핸들 선택자가 없으면 패널 요소 전체가 `draggable`이고 자손에서 시작한 드래그를 거르지 않는다. HTML5 DnD에서 `draggable` 조상 안의 텍스트·range 드래그는 브라우저가 요소 드래그로 시작할 수 있다(Chromium 동작. 실제 브라우저에서도 같은지는 수동 확인).

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 | 2/2 |
| 2 대조 교체 | control-a 입력창 | 재현 → billing 고유 아님 |
| 3 입력·릴리스 교체 | 핸들 모드(기본) | 내용 드래그가 패널 드래그로 바뀌지 않음 |
| 4 하네스 점검 | `page.mouse` 직접. 인터셉트된 드래그에서도 `dragstart`는 브라우저가 판단 | 실제 Chrome 확인은 REPORT 8절 |
| 5~6 | 해당 없음 | — |
| 7 오라클 | 가정 | `needs-user-confirmation` |

## 관련

- 시나리오: B2-P1(핸들 없는 모드 항목)
- 가설: H-HANDLE-STALE
