# 발견 양식 (TEMPLATE-finding)

> **이 문서는**
> - 발견 1건을 기록하는 파일의 양식이다. 검수 세션(클라우드 세션 2)이 기대와 다른 관찰을 발견으로 올릴 때 쓴다.
> - 쓰는 법: 아래 코드 블록 **안쪽 전체**를 `doc/qa/findings/FC-QA-NNN-<slug>.md`로 복사하고 값을 채운다. `#` 뒤의 설명과 `<...>` 안내문은 지운다.
> - 판정 규칙(심각도, class, 신뢰 규칙, 귀속 사다리, 상태)은 [README.md](./README.md)가 기준이다. ID는 README "ID 대장"의 다음 빈 번호를 쓰고, 같은 커밋에서 대장을 갱신한다.
> - 파일 끝의 HTML 주석에 채운 예시가 있다. 예시의 값은 지어낸 것이고 관찰 결과가 아니다.

## 양식

````markdown
---
id: FC-QA-NNN                  # README "ID 대장"의 다음 빈 번호. 재사용 금지
title: <관찰 가능한 증상 한 줄>   # 원인이 아니라 증상을 쓴다
severity: sev-3                # sev-1 | sev-2 | sev-3 | sev-4  (README "심각도")
class: library-bug             # library-bug | fixture-bug | harness-artifact | spec-question | env-limit
status: open                   # predicted | open | needs-user-confirmation | fixed | verified | wontfix | duplicate
confidence: high               # high(2회 이상 전부 재현 + 대조 실험 완료 + 오라클 명시) | medium(재현되지만 대조 일부 미완) | low(간헐적 재현) | code-reading(실행 관찰 없음)
repro_rate: 2/2                # <재현 횟수>/<깨끗한 컨텍스트 시도 횟수>. 실행 전 선등록이면 비워 둔다
found_in: run01-tier1          # 처음 관찰한 run 디렉터리 이름 | pre-run (실행 전 선등록. 관찰 뒤에도 pre-run을 유지하고, 관찰한 run은 증거 경로 doc/qa/<run>/evidence/로 안다)
variants: [control-b, orders]  # 재현된 슬롯 이름 목록. 재현되지 않은 슬롯은 "대조 실험" 절에 적는다
input: mouse                   # mouse | touch-cdp-handle | touch-cdp-longpress (여러 개면 목록)
browser: chromium-153 headless-shell   # chromium-<major> headless-shell. 표기는 HARNESS.md "증거와 라벨"
playwright: 1.63.0             # mfa-lab/e2e/lane.json의 playwright 값
native_touch_drag: on          # on | off. Chromium 메이저로 정해진다 (153 = on, 141 = off). 터치가 아니어도 적는다
library_tree: <해시>            # git rev-parse HEAD:src 의 출력 (기본 식별자)
library_commit: <해시>          # git rev-list -1 HEAD -- src 의 출력 (보조 식별자)
hypothesis: H-REMOUNT          # doc/qa/mfa/HYPOTHESES.md의 가설 이름 | none
harness_amplified: false       # true | false. true는 "진짜 경합이지만 빈도는 하네스가 키움" (HARNESS.md "stale preview 판정 규칙")
decision_ref: none             # README "결정 로그"의 결정 ID (판정에 쓰이는 것은 보통 D3 | D3a | D3b | D4) | none
root_cause_group: <slug>       # 같은 근본 원인으로 보는 발견끼리 같은 값. 영어 kebab-case. 모르면 발견 slug와 같게
blocked_by: none               # 먼저 고쳐야 하는 발견 ID 목록 | none
dup_of: none                   # status가 duplicate일 때 대상 ID | none
repro_spec: mfa-lab/e2e/regression/fc-qa-NNN-<slug>.spec.ts   # 회귀 스펙 경로 | none
fix_commit: none               # src/ 수정 커밋 해시 | none (수정 세션이 채운다)
---

# FC-QA-NNN <title과 같은 한 줄>

## 전제

- 레이아웃과 URL: <쿼리까지 포함한 전체 URL. 예: http://127.0.0.1:4300/?layout=census&b=orders>
- 시작 트리: <표기. 예: H[p-a,V[p-b,p-c],p-d]>, 슬롯 배치: <패널 id = 슬롯>
- 플래그: <drag=handle|panel, lock=..., iframeShield=...> / 뷰포트 1280x800, 배율 1
- 라이브러리: <__fc.lib.source: src | npm051 | dist>, Module Federation: <on | degraded>
- <터치 발견이면 다음 문장을 그대로 넣는다> Chromium CDP touch emulation, headless; not a real device

## 절차

1. <헬퍼 호출 또는 좌표로 쓴다. 예: p-d의 핸들에서 드래그 시작>
2. <예: (p-a, left, depth 1) 지점으로 한 번 이동하고 settle>
3. <릴리스 방식: overShadow | settled | immediate | Esc. 놓는 순간 커서 아래: source | other-droppable | locked | iframe | outside>

## 기대(오라클)

- 기대 동작: <무엇이 일어나야 하는가>
- 근거: <doc/API.ko.md의 절 이름 | doc/TODO.md의 절 | 사용자 결정 D* | "가정">. 근거가 "가정"뿐이면 class는 spec-question이다.

## 실제

<관찰한 것만 쓴다. 추정은 "추정 원인" 절에.>

| 슬롯 | 프레임 마운트 변화 | 내용 마운트/로드 변화 | DOM 이동 | 내용 상태(입력값·카운터·스크롤) |
|---|---|---|---|---|
| | | | | |

- 불변식 I1~I7: <통과/실패한 항목>
- 실행별 결과: 1회차 <...>, 2회차 <...>
- <D3b에 해당하는 하위 관찰(드래그한 패널 자신의 리마운트·재삽입)이 있으면 여기에 "하위 관찰"로 적는다>

## 증거

경로는 `doc/qa/<run>/evidence/FC-QA-NNN/` 기준. 이미지 최대 6장.

| 파일 | 무엇을 보여 주는가 |
|---|---|
| 01-before.png | |
| 02-mid.png | <직접 열어 확인한 내용> |
| 03-after.png | |
| events.json | <핵심 줄 인용> |
| tree-before.json / tree-after.json | |
| console.txt | |

## 추정 원인

**가설** (반증 실험을 했으면 "확인됨"으로 바꾸고 실험을 적는다).

- <src/경로:줄 — 메커니즘 설명>

## 대조 실험

README "귀속 사다리"의 단계별 결과.

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 N회 | |
| 2 대조 교체 | <컨테이너별 사다리의 각 슬롯> | <처음 나타난 단계> |
| 3 입력·릴리스 교체 | | |
| 4 하네스 점검 | 스파이크 기준선과 이벤트 순서 비교 | |
| 5 픽스처 점검 | remote 단독 페이지 | |
| 6 프로브 끄고 재실행 | | <하지 않았으면 "해당 없음"과 이유> |
| 7 오라클 | | |

## 관련

- 시나리오: <R-ID>, 관찰 기록: <doc/qa/<run>/obs/...json>
- 관련 발견: <ID 또는 없음>, 가설: <H-*>, doc/TODO.md 항목: <있으면>
- <이후 기록은 날짜를 붙여 덧붙인다. 예: 2026-10-20 수정 — fix_commit abc1234, 회귀 스펙 test.fail() 제거>
````

## 작성 규칙 요약

- 발견 1건 = 근본 원인 1개. 증상이 여러 개여도 원인이 같으면 한 파일에 쓴다.
- 값이 없는 칸은 `none`으로 적는다. 비워 둔 칸도 같은 뜻으로 읽는다.
- `status: predicted`인 선등록 발견은 `found_in: pre-run`, `confidence: code-reading`이고, run에서 채울 칸(`repro_rate`, `input`, `browser`, `playwright`, `repro_spec` 등)은 비어 있다 (FC-QA-001 참고). run에서 관찰하면 값을 채우고 `open`으로 바꾼다. `found_in`은 `pre-run`으로 둔다(선등록이었음을 남긴다).
- "실제"와 "증거"는 나중에 고쳐 쓰지 않는다. 추가 관찰은 "관련" 절에 날짜와 함께 덧붙인다.
- 회귀 스펙에는 `test.fail()`과 발견 ID를 담은 `annotation`을 넣는다. 형식은 [mfa/HARNESS.md](./mfa/HARNESS.md) "스펙 구성".

<!--
채운 예시 (형식 예시다. 값은 전부 지어낸 것이고 관찰 결과가 아니다. FC-QA-000은 대장에 없는 예시 전용 번호다.)

---
id: FC-QA-000
title: (가상 예시) remote 안의 카드를 옆 패널로 끌면 패널 전체가 이동한다
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
root_cause_group: dragstart-no-origin-check
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-000-card-drag-moves-panel.spec.ts
fix_commit: none
---

# FC-QA-000 (가상 예시) remote 안의 카드를 옆 패널로 끌면 패널 전체가 이동한다

## 전제
- URL: http://127.0.0.1:4300/?layout=row3&a=board&b=control-b
- 시작 트리: H[p-a,p-b,p-c], p-a = board, p-b = control-b, p-c = control-c
- 플래그: drag=handle / 뷰포트 1280x800, 배율 1
- 라이브러리: src, Module Federation: on

## 절차
1. board 패널 안의 카드(board-card-1)에서 마우스 드래그를 시작한다.
2. p-b의 (right, depth 0) 지점으로 한 번 이동하고 settle한다.
3. overShadow 방식으로 놓는다. 놓는 순간 커서 아래: source.

## 기대(오라클)
- 기대 동작: 옆 패널은 카드를 무시하고, 패널 이동은 일어나지 않는다.
- 근거: src/components/PanelNodeRenderer.tsx:73의 주석이 "내부 네이티브 드래그가 패널 드래그로 오인되지 않게 한다"는 의도를 밝힌다.

## 실제
| 슬롯 | 프레임 마운트 변화 | 내용 마운트/로드 변화 | DOM 이동 | 내용 상태 |
|---|---|---|---|---|
| board | +0 | +0 | +1 | 유지 |
| control-b | +0 | +0 | +0 | 유지 |

- 이동 중 p-a에 shadow 스타일이 붙고 미리보기 트리가 H[p-b,p-a,p-c]가 됐다.
- 놓은 뒤 onMovePanel("p-a", "p-b", "right", 0) 호출 1건. 트리가 H[p-b,p-a,p-c]로 커밋됐다.
- 불변식 I1~I7 통과. 1회차·2회차 결과 같음.

## 증거
| 파일 | 무엇을 보여 주는가 |
|---|---|
| 02-mid.png | 카드가 아니라 board 패널 전체가 점선 테두리로 표시됨 (직접 열어 확인) |
| events.json | dragstart의 대상이 board-card-1인데 dataTransfer.types에 text/panel-id가 있음 |
| tree-after.json | 커밋된 트리 H[p-b,p-a,p-c] |

## 추정 원인
**가설.**
- src/components/PanelNodeRenderer.tsx:71-81 — handleDragStart가 드래그 시작 대상을 확인하지 않고, 버블링돼 올라온 모든 dragstart를 패널 드래그로 처리한다.

## 대조 실험
| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 | 2/2 |
| 2 대조 교체 | a=board-local | 재현. control에는 끌 수 있는 내용이 없어 해당 없음 |
| 3 입력·릴리스 교체 | settled 릴리스 | 재현 |
| 4 하네스 점검 | 스파이크 S1 기준선과 비교 | 이벤트 순서 정상 |
| 5 픽스처 점검 | http://127.0.0.1:4302/ 단독 페이지 | 카드 이동 정상. 레이아웃 안에서만 나타남 |
| 6 프로브 끄고 재실행 | 해당 없음 | 결과가 예측과 같아 생략 |
| 7 오라클 | 코드 주석의 의도 | 있음 |

## 관련
- 시나리오: R10, 관찰 기록: doc/qa/run01-tier1/obs/R10.json
- 가설: H-FOREIGN-DRAG
-->
