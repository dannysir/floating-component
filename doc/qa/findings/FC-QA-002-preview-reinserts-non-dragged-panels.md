---
id: FC-QA-002
title: 드래그 미리보기가 드래그하지 않은 패널을 리마운트 없이 DOM에서 떼었다 다시 붙여 스크롤 위치를 잃게 하고 iframe은 다시 로드되게 한다
severity: sev-2
class: library-bug
status: open
confidence: high
repro_rate: 2/2
found_in: run01-tier1
variants: [control-a, bare-0, orders, billing, telemetry, control-iframe]
input: mouse
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: H-REINSERT
harness_amplified: false
decision_ref: D3a
root_cause_group: keyed-reorder-reinsert
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-002-preview-reinserts-non-dragged-panels.spec.ts
fix_commit: none
---

# FC-QA-002 드래그 미리보기가 드래그하지 않은 패널을 리마운트 없이 DOM에서 떼었다 다시 붙여 스크롤 위치를 잃게 하고 iframe은 다시 로드되게 한다

## 전제

- 레이아웃과 URL: http://127.0.0.1:4300/?layout=census (전부 control). 대조: `?layout=census&a=bare-0&b=bare-1&c=bare-2&d=bare-3`
- 시작 트리: `H[p-a,V[p-b,p-c],p-d]`, 슬롯 배치: p-a = control-a, p-b = control-b, p-c = control-c, p-d = control-d
- 플래그: drag=handle / 뷰포트 1280x800, 배율 1
- 라이브러리: src, Module Federation: on

## 절차

1. 모든 프로브 슬롯에 상태를 심는다(`seedContent`: 입력 `seed-<slot>`, 카운터 3회, `<slot>-scroll`의 `scrollTop = 120`).
2. `p-d`(control-d)의 핸들에서 마우스 드래그를 시작한다(`begin`).
3. `(p-a, left, 1)` 지점으로 한 번 이동하고 settle한다(`teleport`). 미리보기 `H[p-d,p-a,V[p-b,p-c]]`.
4. Esc로 취소한다.

## 기대(오라클)

- 기대 동작: 드래그하지 않은 `p-a`의 내용은 unmount·재삽입·재로드되지 않는다. input·counter·scrollTop 유지.
- 근거: 사용자 결정 D3a(드래그하지 않은 패널이 React 리마운트 없이 DOM 재삽입으로 초기화되는 것 — 스크롤·포커스 초기화, iframe 재로드 — 도 결함이며 D3와 별도 발견).

## 실제

| 슬롯 | 프레임 마운트 변화 | 내용 마운트/로드 변화 | DOM 이동 | 내용 상태(입력값·카운터·스크롤) |
|---|---|---|---|---|
| control-a (p-a), hover | +0 | +0 | +1 (`domLog`: 같은 요소 removed → reinserted) | 입력·카운터 유지, scrollTop 120 → 0 |
| control-a (p-a), Esc 뒤 누적 | +0 | +0 | +1 | scrollTop 0 그대로 |
| bare-0 (p-a, 대조) | (PanelFrame 없음) | +0 | +1 | 입력 유지 |

- React 인스턴스는 그대로인데(마운트 카운터 +0) DOM 노드가 부모에서 빠졌다 다시 들어가 스크롤 컨테이너의 `scrollTop`이 0이 됐다.
- 불변식 I1~I7: Esc 뒤 통과.
- 실행별 결과: 1회차·2회차 같은 값(`R01-run1`, `R01-run2`; bare `R01-bare-run1`, `R01-bare-run2`).
- 하위 관찰(D3b): 소스 `p-d`도 Esc(미리보기 해제) 때 moves +1, scrollTop 120 → 0.

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-002/` (R01-run1에서 `promote`).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| 01-before.png | 네 패널 모두 목록이 `row 6`부터 보인다(scrollTop 120) |
| 02-mid.png | 미리보기 중 `control-a`는 입력값 `seed-control-a`·`count 3`이 남았는데 목록이 `row 0`부터 보인다 (직접 열어 확인) |
| tree-before.json / 02-mid.snapshot.json | `content['control-a'].scrollTop` 120 → 0, `counters.domLog`의 `p-a` `reinserted`(같은 `elementSeq`) |
| events.json | 제스처 구간 프로브 로그 |
| console.txt | 비어 있음 |

## 추정 원인

**가설.**

- `src/components/LayoutNodeRenderer.tsx:88-121` — 루트 split의 자식 순서가 `[p-a, split-1, p-d]`에서 `[p-d, p-a, split-2]`로 바뀐다. React는 keyed 자식의 순서를 바꿀 때 뒤로 밀린 노드를 제거 후 삽입한다(`enableMoveBefore` 꺼짐, HYPOTHESES.md 2절). `p-a`는 `id` key라 fiber는 유지되지만 DOM 노드가 떼였다 붙으면서 스크롤 위치가 초기화된다.
- 미리보기가 실제 패널을 재배치하는 구조(`src/components/TreeLayout.tsx:99-108, 161`)는 FC-QA-001과 같지만, 원인은 key 구조가 아니라 DOM 재배치 자체라 별도 발견이다(D3a).

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 | 2/2 |
| 2 대조 교체 | `a=bare-0` | 재현(`bare-0` moves +1). 라이브러리 단계에서 처음 나타남 |
| 3 입력·릴리스 교체 | (R04·R06·R13에서 덧붙인다) | — |
| 4 하네스 점검 | S1 기준선과 이벤트 순서 비교, `domLog` 판정 규칙 | 같은 순서. `reinserted`는 같은 요소의 제거 뒤 삽입이 한 MutationObserver 묶음에 보고된 것 |
| 5 픽스처 점검 | 해당 없음 | control·bare에서 재현 |
| 6 프로브 끄고 재실행 | 해당 없음 | `scrollTop` 초기화는 프로브와 무관한 관찰이다 |
| 7 오라클 | D3a | 있음 |

## 관련

- 2026-10-07 R02·R03·R05: R02·R03에서도 `control-a`(p-a) moves +1·scrollTop 0(같은 제스처). R07(`?layout=locks`, `terminal` → `(editor, left, 0)`): 드래그하지 않은 `editor`(control-a) frame +0·content +0·moves +1, scrollTop 120 → 0, 다섯 취소 경로 모두 2/2.
- 2026-10-07 R16-others(`?layout=workbench`, billing → board 왼쪽): 드래그하지 않은 `board` frame +0·moves +1(같은 H split 안 keyed 순서 변경). R14(터치)에서도 `editor` moves +1·scrollTop 0 — 입력 방식과 무관.
- 시나리오: R01, 관찰 기록: doc/qa/run01-tier1/obs/R01-hover-run1.json, R01-esc-run1.json, R01-bare-run1.json (run2도 같다)
- 관련 발견: FC-QA-001(같은 미리보기에서 생기는 React 리마운트, D3), 가설: H-REINSERT
- 2026-10-07 R04(`?layout=census&a=<remote>`, R01과 같은 제스처, 2/2씩): `orders`·`billing`(mount, `mountCalls`·`unmountCalls` +0, `rootsAlive` 1) 모두 frame +0·content +0·moves +1·scrollTop 120 → 0, 입력·카운터 유지. **`telemetry`(iframe)는 frame +0인데 `loads` +1·`docId` 변경·iframe 문서 요청 +1, 프레임 안 입력값 소실**(재삽입 = 재로드). same-origin `control-iframe`도 같다(컨테이너 고유 현상). iframe 패널은 `(p-a, left, 1)` 점이 iframe 본문이라 `iframeShield=1`로 측정(FC-QA-005). 관찰 기록 `obs/R04-*-run{1,2}.json`.
- 2026-10-07 R06(`?layout=row3&b=telemetry`, 2/2씩, 리마운트 0): R06-a(`p-c` → `(p-a, left, 1)`) hover에서 `p-a`·`p-b` moves +1, telemetry(p-b) `loads` +1 — **hover 때 재로드**. R06-b(`p-a` → `(p-c, right, 1)`) hover에서는 소스만 moves +1, Esc에서 `p-b`·`p-c` moves +1, telemetry `loads` +1 — **취소 때 재로드**. 드롭은 hover 뒤 추가 없음. React keyed 순서 변경의 `lastPlacedIndex` 규칙과 일치. 관찰 기록 `obs/R06-{a,b}-run{1,2}.json`. 회귀 스펙에 R06-a 케이스 추가(iframe `loads` +0 단언, "예상대로 실패").
- 2026-10-07 심각도 sev-3 → **sev-2**: iframe 재로드가 관찰돼 분류 기본값("sev-2(iframe 재로드) / sev-3(스크롤만)")을 적용. 제목에 재로드를 더했다.
