---
id: FC-QA-001
title: 드래그 미리보기가 드래그하지 않은 패널을 리마운트한다
severity: sev-2
class: library-bug
status: open
confidence: high
repro_rate: 2/2
found_in: pre-run
variants: [control-b, control-c, bare-1, bare-2]
input: mouse
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: H-REMOUNT
harness_amplified: false
decision_ref: D3
root_cause_group: split-index-key
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-001-preview-remount-non-dragged-panels.spec.ts
fix_commit: none
---

# FC-QA-001 — 드래그 미리보기가 드래그하지 않은 패널을 리마운트한다

> **이 문서는** 실행 전에 코드 리딩만으로 선등록한 발견이다(`found_in: pre-run`). 2026-10-07 run 01(R01)에서 관측해 상태를 `open`으로 올렸다. 아래 「기대와 예측」 표는 선등록 문구 그대로이고, 관측은 「실제」 절에 있다.
> 클라우드 세션 2(run 01)가 R01·R02·R03·R05를 실행한 뒤 이 파일에 증거를 붙이고 상태를 `open`으로 올린다. 수정 세션은 [../FIXING.md](../FIXING.md) 절차로 이 파일에서 시작한다.
> 선등록한 이유: 사용자가 이 동작을 결함으로 기록하라고 결정했다(결정 D3, [../README.md](../README.md) 결정 로그). 검수 세션이 실행되지 못해도 결함 기록이 남아야 한다.
> 의존 문서: 메커니즘 전체는 [../mfa/HYPOTHESES.md](../mfa/HYPOTHESES.md) "리마운트 · DOM 재삽입 · iframe 재로드"와 H-REMOUNT, 계측 이름은 [../mfa/ARCHITECTURE.md](../mfa/ARCHITECTURE.md) 「계측 계약」, 헬퍼는 [../mfa/HARNESS.md](../mfa/HARNESS.md) 「헬퍼」.

**요약.** 패널을 드래그하면 라이브 미리보기가 레이아웃 트리를 임시로 재구성한다. 이때 **드래그하지 않은 패널**까지 React가 unmount 후 다시 mount한다. 미리보기가 바뀔 때마다, 그리고 드래그를 **취소해도** 일어난다. 리마운트된 패널은 입력 중인 값, 스크롤 위치, 컴포넌트 state를 잃는다. 별도 React 루트는 새로 만들어지고 iframe은 문서를 다시 로드한다.

**심각도 `sev-2` 근거.** 드래그하지 않은 패널의 사용자 상태가 사라지고 remote가 재부팅된다(remote 기능 손상). UI가 멈추거나 새로고침이 필요한 것은 아니므로 `sev-1`은 아니다. 취소한 드래그에서도 상태를 잃으므로 `sev-3`(UX 저하)보다 무겁다.

## 전제

- 라이브러리: 브랜치 소스. `git rev-parse HEAD:src` = `c1da6c9dc03a4811eea42c220be309e5e73b0a4a`, `git rev-list -1 HEAD -- src` = `ea25ff7`.
- 랩: `node mfa-lab/scripts/ctl.mjs up` 뒤 shell `http://127.0.0.1:4300`. 뷰포트 1280x800.
- 레이아웃: `?layout=census`. 트리는 `H[p-a, V[p-b, p-c], p-d]`이고 슬롯은 쿼리 `a= b= c= d=`로 바꾼다(기본 `control-a..d`).

```json
{ "type": "split", "direction": "horizontal", "size": 1, "children": [
  { "type": "panel", "id": "p-a", "size": 1, "componentKey": "control-a" },
  { "type": "split", "direction": "vertical", "size": 1, "children": [
    { "type": "panel", "id": "p-b", "size": 1, "componentKey": "control-b" },
    { "type": "panel", "id": "p-c", "size": 1, "componentKey": "control-c" } ] },
  { "type": "panel", "id": "p-d", "size": 1, "componentKey": "control-d" } ] }
```

- 드래그 모드: 기본(`drag=handle`, 헤더가 핸들).
- 입력: 마우스(Playwright `page.mouse`, Chromium의 CDP 드래그 인터셉트). 터치 경로도 같은 미리보기 상태를 쓰므로 같은 결과를 예측한다.

## 절차

헬퍼 이름은 [../mfa/HARNESS.md](../mfa/HARNESS.md) 「헬퍼」 기준이다. 구축 뒤 이름이 달라졌으면 그쪽을 따른다.

기본 절차 (시나리오 R01):

1. 새 브라우저 컨텍스트에서 `http://127.0.0.1:4300/?layout=census`를 열고 `window.__fc.ready`를 기다린다.
2. `p-b`와 `p-c`의 내용에 상태를 만든다: `<slot>-input`에 글자 입력, `<slot>-counter` 클릭, `<slot>-scroll`을 아래로 스크롤.
3. 스냅샷을 찍는다(`capture` 라벨 `01-before`. 라벨 관례는 [../mfa/HARNESS.md](../mfa/HARNESS.md) 「헬퍼」).
4. `p-d`의 헤더(`handle-control-d`)에서 마우스를 누르고 6 px 움직여 드래그를 시작한다.
5. `dropPoint('p-a', 'left', 1)` 지점으로 한 번 이동하고 settle한다. `domTree`가 `H[p-d,p-a,V[p-b,p-c]]`인지 확인하고 스냅샷을 찍는다(라벨 `02-mid`).
6. Esc를 누르고 settle한다. 스냅샷을 찍는다(라벨 `03-after`).

변형:

| 시나리오 | 바꾸는 것 |
|---|---|
| R02 | 6단계에서 Esc 대신 소스 shadow 패널의 헤더 위에서 놓는다(커밋) |
| R03 | 슬롯 B를 `orders`, `billing`, `telemetry`, `telemetry-x`로 차례로 바꾼다. Esc와 드롭 각각 |
| R05 | `a=orders&b=billing&c=telemetry&d=control-d`. `p-d`를 `p-a`의 위쪽 **루트 가장자리**로 끈다. hover, Esc |

## 기대(오라클)

오라클은 사용자 결정 D3이다: 넓은 미리보기 리마운트는 결함이다.

이상적 동작: 드래그의 어느 시점(hover, 취소, 커밋)에도 **드래그하지 않은 패널의 내용은 unmount되지 않는다.** 마운트 카운터가 움직이지 않고 입력값·카운터·스크롤이 유지된다.

### 기대와 예측 (R01, R02 — 전부 control)

카운터는 `window.__fc.frames[slot].frameMounts`/`frameUnmounts`와, 프로브가 있는 슬롯의 `window.__mfe[slot].mounts`/`unmounts`다. 값은 `01-before` 스냅샷 대비 증가분이다.

| 시점 | 패널 | 기대 | 예측 (미실행) |
|---|---|---|---|
| hover | `p-b`, `p-c` | 마운트 +0, 내용 상태 유지 | 마운트 +1, 언마운트 +1. 입력값·카운터·`scrollTop` 초기화 |
| Esc 뒤 | `p-b`, `p-c` | 마운트 +0 | 누적 마운트 +2, 언마운트 +2 |
| 드롭 뒤 (R02) | `p-b`, `p-c` | 마운트 +0 | 누적 마운트 +1, 언마운트 +1. 커밋 시점에 추가 없음 |
| 전 구간 | `p-a` | 변화 없음 | 마운트 +0. hover에서 DOM 재삽입(`__probe.domMoves` +1). **이 발견의 대상이 아니다** (아래 "범위") |
| 전 구간 | `p-d` (소스) | — | 마운트 +0. Esc에서 DOM 재삽입 |

### 기대와 예측 (R03 — 슬롯 B가 remote)

| 슬롯 B | 기대 | 예측: hover + Esc | 예측: hover + 드롭 |
|---|---|---|---|
| `orders` (same-tree) | `__mfe.orders.mounts` +0 | `mounts` +2, 입력값·카운터·스크롤 유실 | `mounts` +1 |
| `billing` (mount) | `mountCalls` +0, `unmountCalls` +0 | `unmountCalls` +2, `mountCalls` +2 (React 루트를 두 번 새로 만든다), `rootsAlive`는 1 | 각 +1 |
| `telemetry` / `telemetry-x` (iframe) | 문서 안 `loads` +0 | `loads` +2, `docId` 두 번 바뀜, host `frameMounts` +2 | `loads` +1, `frameMounts` +1 |

### 기대와 예측 (R05 — 가장 넓은 경우)

미리보기 트리는 `V[p-d, H[p-a, V[p-b, p-c]]]`다.

| 시점 | `p-a` (orders) | `p-b` (billing) | `p-c` (telemetry) | `p-d` (소스) |
|---|---|---|---|---|
| 기대 | +0 | +0 | +0 | — |
| 예측: hover | 리마운트 +1 | 리마운트 +1 | 리마운트 +1 (문서 재로드) | fiber 유지 |
| 예측: Esc 뒤 누적 | +2 | +2 | +2 | fiber 유지, DOM 재삽입 |

### 범위

- **대상**: 드래그하지 않은 패널의 React 리마운트(fiber가 새로 만들어지는 것).
- **하위 관찰(D3b)**: 소스 패널 자신의 리마운트. 소스의 부모 split이 바뀌는 이동에서만 생기고 `doc/TODO.md`가 이미 기록한 동작이다. 별도 발견으로 만들지 않고 이 파일의 "실제"에 하위 항목으로 적는다. 확인용 제스처: `?layout=locks`에서 `terminal`을 `(editor, left, 0)`으로. 예측은 `terminal`(소스) 리마운트, **`output`(드래그하지 않음) 리마운트**, `editor` DOM 재삽입이다. `output`의 리마운트는 이 발견의 대상이다.
- **대상 아님**: 리마운트 없이 DOM 재삽입만으로 초기화되는 경우(위 표의 `p-a`). 결정 D3a에 따라 **별도 발견**으로 등록한다(가설 H-REINSERT).

## 실제

### run 01 관측 (2026-10-07)

**R01** — `http://127.0.0.1:4300/?layout=census`(전부 control), 깨끗한 컨텍스트 2회(`R01-run1`, `R01-run2`), 두 번 모두 같은 값. 시작 트리 `H[p-a,V[p-b,p-c],p-d]`. `p-d`(control-d)를 핸들로 `(p-a, left, 1)`로 hover → Esc. 값은 `01-before` 대비 증가분. 관찰 기록 `doc/qa/run01-tier1/obs/R01-hover-run{1,2}.json`, `R01-esc-run{1,2}.json`.

| 시점 | 패널 | 프레임 마운트 변화 (`frameMounts`/`frameUnmounts`) | 내용 마운트 변화 (`mounts`/`unmounts`) | DOM 이동 | 내용 상태 |
|---|---|---|---|---|---|
| hover (미리보기 `H[p-d,p-a,V[p-b,p-c]]`) | `p-b` (control-b) | +1 / +1 | +1 / +1 | +0 (새 요소: `domLog` remounted) | input·counter·scrollTop 초기화 (`""`, `count 0`, 0) |
| hover | `p-c` (control-c) | +1 / +1 | +1 / +1 | +0 (remounted) | 초기화 |
| hover | `p-a` (control-a) | +0 | +0 | +1 (reinserted) | input·counter 유지, scrollTop 120 → 0 (FC-QA-002) |
| hover | `p-d` (소스) | +0 | +0 | +0 | 유지 |
| Esc 뒤 누적 | `p-b`, `p-c` | +2 / +2 | +2 / +2 | +0 | 초기화 |
| Esc 뒤 누적 | `p-a` | +0 | +0 | +1 | scrollTop 0 |
| Esc 뒤 누적 | `p-d` (소스) | +0 | +0 | +1 (취소 때 재삽입. D3b 하위 관찰) | scrollTop 120 → 0 |

- 예측과 같다(`as-predicted`, 2/2). 커밋 없음: `onMovePanel` 0건, 트리 불변.
- 불변식 I1~I7: Esc 뒤 전부 통과. `dragend`는 연결된 원본 노드(capture/target/bubble 모두 `isConnected: true`).
- **R02** (같은 hover 뒤 `overShadow` 드롭, `R02-run{1,2}`): `p-b`·`p-c` 누적 frame +1 / content +1(hover 분만), 커밋 시점 추가 변화 없음. 커밋 트리 `H[p-d,p-a,V[p-b,p-c]]` = 미리보기, `onMovePanel('p-d','p-a','left',1)` 1건, `dragend.dropEffect = move`. 예측대로(2/2).
- 대조(bare, `R01-bare-run{1,2}`): `bare-1`·`bare-2` 내용 마운트 hover +1, Esc 뒤 +2. `bare-0` reinserted. 라이브러리만으로 재현된다.
- 스크린샷 `02-mid.png`(직접 열어 확인): `control-d`가 점선·반투명(shadow)으로 맨 왼쪽, `control-b`·`control-c` 헤더 배지 `f2 c2`(로드 1 + 리마운트 1)와 빈 입력·`count 0`, `control-a`는 입력값 유지·목록이 맨 위(scrollTop 0).

### run 01에서 할 일

1. R01, R02, R03, R05를 각각 깨끗한 컨텍스트에서 2회 실행한다.
2. 관측한 카운터 증가분을 위 표와 같은 형식으로 이 절에 적는다. 위 "기대와 예측" 표는 **고치지 않는다.** 예측과 다른 부분은 다르다고 적는다.
3. 예측대로(또는 일부라도) 드래그하지 않은 패널의 리마운트가 관측되면:
   - front matter를 채운다: `status: open`, `confidence`(관측 기반 값, [../TEMPLATE-finding.md](../TEMPLATE-finding.md) 기준), `repro_rate`, `variants`, `input`, `browser`, `playwright`.
   - `found_in`은 `pre-run`으로 둔다(선등록이었음을 남긴다). 관측한 run은 증거 경로로 알 수 있다.
   - 증거를 `doc/qa/run01-tier1/evidence/FC-QA-001/`로 올린다(아래 "증거").
   - 회귀 스펙 `mfa-lab/e2e/regression/fc-qa-001-preview-remount-non-dragged-panels.spec.ts`를 `test.fail()`로 추가하고 `repro_spec`에 경로를 적는다. 단언은 이상적 동작으로 쓰고, 아래 **두 제스처를 각각 케이스로** 둔다(둘 다 기본 `census`, 전부 control, hover + Esc, `01-before` 대비 증가분).
     - (a) 형제 인덱스 이동(추정 원인 1): `p-d` → `(p-a, left, 1)`. `p-b`·`p-c`의 `frameMounts`·`frameUnmounts` 증가분 0(프로브가 있는 슬롯이면 `mounts`·`unmounts`도 0).
     - (b) 부모 변경, 루트 감싸기(추정 원인 3): `p-d` → `(p-a, top, 2)`. 미리보기 `V[p-d, H[p-a, V[p-b, p-c]]]`를 전제로 확인한 뒤, `p-a`·`p-b`·`p-c`의 `frameMounts`·`frameUnmounts` 증가분 0.
     - 두 케이스를 한 스펙에 두는 이유: split key만 안정화하는 수정(아래 "수정 방향 후보" A)은 (a)만 통과시키고 (b)는 계속 실패한다. 수정 세션에서 한 케이스만 "예상과 달리 통과"하면 수정이 부분적이다. 그때는 `test.fail()`을 지우지 않고 `status: fixed`로 바꾸지 않는다. 두 케이스가 모두 통과해야 [../FIXING.md](../FIXING.md) F7로 간다.
4. 리마운트가 **전혀** 관측되지 않으면: 예측이 틀린 것이다. `status: predicted`를 유지하고 `repro_rate: 0/N`을 적는다([../README.md](../README.md) 10절). 관측값과 미리보기 `domTree`를 이 절에 적고, REPORT.md 4절 가설 판정에 H-REMOUNT를 `refuted`로 올린다. D3은 사용자 결정이므로 닫을지(`wontfix`)는 사용자가 정한다.
5. 소스 자신의 리마운트(하위 관찰)와 `locks` 예시의 `output` 리마운트를 따로 한 줄씩 적는다.

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-001/` (R01-run1에서 `promote`).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| 01-before.png | 심은 상태(입력 `seed-<slot>`, `count 3`, 목록 스크롤 120). 배지 전부 `f1 c1` |
| 02-mid.png | 미리보기 `H[p-d,p-a,V[p-b,p-c]]`. `control-b`·`control-c` 배지 `f2 c2`, 입력 비고 `count 0` (직접 열어 확인) |
| 03-after.png | Esc 뒤 원래 배치. `control-b`·`control-c` 배지 `f3 c3`, 상태 초기화 그대로 |
| tree-before.json / 02-mid.snapshot.json / tree-after.json | `counters.frames`·`counters.mfe`·`counters.domLog`·`content` |
| events.json | 제스처 구간 프로브 로그. `dragend`는 연결된 소스(`p-d`) |
| console.txt | 비어 있음 |

## 추정 원인

전부 가설이다. 코드 리딩 결과이고 실행으로 확인하지 않았다.

`root_cause_group: split-index-key`는 아래 1~5를 **모두** 묶는 이름이다. 이름은 가장 눈에 띄는 원인(1, 형제 인덱스 key)에서 땄지만, 부모가 바뀌어 생기는 리마운트(3: R05의 루트 감싸기, 앵커 감싸기, `locks`의 split 풀림)도 같은 그룹이다. 1만 없애는 수정으로는 이 발견이 닫히지 않는다(회귀 스펙 케이스 (b)가 남는다).

1. **split의 React key가 형제 인덱스다.** 패널은 `id`로 key가 정해지지만 split은 위치로 정해진다. 미리보기에서 split 앞에 형제가 하나 끼어들면 key가 `split-1`에서 `split-2`로 바뀌고, React는 그 아래 전체를 다른 컴포넌트로 보고 새로 마운트한다.
   - `src/components/LayoutNodeRenderer.tsx:92` — ``key={child.type === "panel" ? child.id : `split-${i}`}``
2. **드래그 중에는 미리보기 트리가 실제 트리 자리에 그대로 렌더된다.** 미리보기는 표시용 오버레이가 아니라 실제 패널들의 재배치다.
   - `src/components/TreeLayout.tsx:99-108` — `previewTree`를 `computeMoveResult(normalizedTree, preview.sourcePanelId, …)`로 계산
   - `src/components/TreeLayout.tsx:161` — `node={previewTree ?? normalizedTree}`
3. **패널의 부모 split이 바뀌면 key가 같아도 리마운트된다.** React key는 같은 부모 안에서만 유효하다. 부모가 바뀌는 경우:
   - 루트 전체가 새 split으로 감싸인다 — `src/tree/insert.ts:49-52` (R05)
   - 앵커 패널이 새 split으로 감싸인다 — `src/tree/insert.ts:68-71`
   - 자식이 하나 남은 split이 풀려 남은 형제가 위로 올라온다 — `src/tree/helpers.ts:44-45` (`locks` 예시의 `output`)
4. **같은 key가 다른 노드에 재사용된다.** R05에서 옛 `split-1`(= `V[p-b, p-c]`)의 fiber가 새 `split-1`(= `H[p-a, V[p-b, p-c]]`)에 재사용된다. fiber는 남지만 그 아래 `p-b`·`p-c`는 사라지고 `p-a`가 새로 마운트된다.
5. 같은 미리보기가 반복되면 다시 렌더하지 않는다(`src/hooks/useDropPreview.ts:23`). 그래서 리마운트는 미리보기가 **달라질 때마다** 한 번씩, 그리고 미리보기가 해제될 때(취소, 루트 이탈) 한 번 생긴다. 커밋은 미리보기와 같은 구조로 끝나므로 추가가 없다(`src/components/TreeLayout.tsx:136-143`).

### 수정 방향 후보 (전부 가설, 미검증)

수정은 이 발견의 범위가 아니다. 수정 세션이 출발점으로 쓸 후보만 적는다. 저장소 규칙(`CLAUDE.md`): SplitNode에 ID를 추가하지 않는다, 외부 라이브러리를 추가하지 않는다.

| 후보 | 내용 | 없어지는 것 | 남는 것 / 비용 |
|---|---|---|---|
| A. split key 안정화 | split의 렌더 key를 인덱스 대신 내용에서 유도한다(예: 서브트리의 첫 패널 id). 트리 스키마는 그대로다 | 형제 인덱스가 밀려서 생기는 리마운트(R01~R03 유형, 회귀 스펙 케이스 (a)) | 부모가 바뀌는 리마운트(R05, 앵커 감싸기, split 풀림)는 남는다. 회귀 스펙 케이스 (b)가 계속 실패하므로 **A 단독으로는 이 발견이 `fixed`가 되지 않는다.** 첫 패널이 빠져나가면 key가 바뀐다. DOM 재삽입(H-REINSERT)은 그대로다 |
| B. 리마운트 대신 이동 (평평한 렌더) | 모든 패널을 한 부모 아래 `id` key로 평평하게 렌더하고, 위치는 트리에서 계산한 사각형으로 배치한다 | 부모가 바뀌지 않으므로 리마운트와 DOM 재삽입 둘 다 | flex 중첩 레이아웃과 CSS min/max 제약을 좌표 계산으로 다시 구현해야 한다. 변경 범위가 크다 |
| C. 리마운트 대신 이동 (패널별 고정 host + portal) | 패널 내용은 패널마다 하나씩 유지하는 host 요소에 portal로 렌더하고, 레이아웃은 host 요소만 옮긴다 | 리마운트 | host 이동은 DOM 재삽입이므로 iframe 재로드는 남는다. 상태를 보존하는 DOM 이동(`Element.moveBefore`)은 브라우저 지원 범위를 확인해야 한다 |
| D. 미리보기를 오버레이로 | 드래그 중에는 실제 트리를 재구성하지 않고 드롭 위치 표시만 그린다 | hover와 취소에서의 리마운트 전부 | 커밋 때 1회는 남는다(A~C와 조합). 라이브 미리보기라는 현재 UX가 바뀌므로 사용자 결정이 필요하다 |

## 대조 실험

계획 표(선등록)는 아래 "계획"에 그대로 두고, 실행 결과를 위에 둔다.

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 (R01) | 2/2, 수치 동일 |
| 2 대조 교체 | bare(`a..d=bare-0..3`) | 재현(`bare-1`·`bare-2` 내용 마운트 hover +1). 라이브러리 단계에서 처음 나타남 → `library-bug` |
| 3 입력·릴리스 교체 | (R02 드롭, R14·R13 터치에서 덧붙인다) | — |
| 4 하네스 점검 | 이벤트 순서를 S1 기준선과 비교 | 같은 순서(dragstart → dragenter → dragover(p-a) → Esc dragend). 알려진 부작용과 무관(카운터는 React 마운트) |
| 5 픽스처 점검 | 해당 없음 | control·bare에서 재현되므로 remote 단독 페이지와 무관 |
| 6 프로브 끄고 재실행 | 해당 없음 | 예측대로라 생략. `frameMounts`·`mounts`는 프로브가 아니라 픽스처 카운터다 |
| 7 오라클 | D3 | 있음 |

### 계획 (선등록)

계획이다(미실행). 귀속 사다리는 [../README.md](../README.md)를 따른다.

| 대조 | 방법 | 확인하려는 것 | 예측 |
|---|---|---|---|
| bare | `?layout=census&a=bare-0&b=bare-1&c=bare-2&d=bare-3` | PanelFrame과 remote 없이 라이브러리만으로 재현되는가 | 재현(코어 문제) |
| control | 기본 `census` | PanelFrame을 넣어도 같은가 | 같은 횟수 |
| twin 대 remote | 슬롯 B = `orders-local` 대 `orders` | Module Federation이 횟수를 바꾸는가 | 같은 횟수 |
| 컨테이너 대조 | `control-mount` 대 `billing`, `control-iframe` 대 `telemetry` | 횟수는 같고 결과(루트 재생성, 문서 재로드)만 다른가 | 같은 횟수 |
| 입력 | 핸들 터치 드래그로 같은 이동 | 입력 방식과 무관한가 | 재현 |
| 소스 리마운트 유무 | `census`(소스 유지) 대 `locks`의 `terminal` 이동(소스 리마운트) | 하위 관찰(D3b) 구분 | 위 "범위" 참고 |
| npm 0.5.1 | `http://127.0.0.1:4390/?layout=census` | 잠금 기능 이전부터 있던 동작인가 | 미정(0.5.1의 key 코드를 확인하지 않았다) |

## 관련

- 가설: [../mfa/HYPOTHESES.md](../mfa/HYPOTHESES.md) H-REMOUNT(이 발견), H-REINSERT(DOM 재삽입, 별도 발견), H-DRAGEND(소스 리마운트 때문에 생긴 종료 이벤트 문제)
- 결정: D3(넓은 미리보기 리마운트는 결함), D3a(리마운트 없는 재삽입도 결함, 별도 발견), D3b(소스 자신의 리마운트·재삽입은 하위 관찰) — [../README.md](../README.md) 결정 로그
- 시나리오: R01, R02, R03, R05 — [../mfa/BRIEF-2-inspect.md](../mfa/BRIEF-2-inspect.md) 「시나리오 표」, 「기대와 예측」
- 기존 기록: [../../TODO.md](../../TODO.md) "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실" — 소스 패널의 리마운트와 그로 인한 `dragend` 유실 수정(`ea25ff7`). 드래그하지 않은 패널의 리마운트는 거기에 적혀 있지 않다
- 설계 원칙: `CLAUDE.md` "SplitNode에 ID 추가하지 않음 — path(number[])로 식별", [../../API.ko.md](../../API.ko.md) "설계 노트"
- 수정 절차: [../FIXING.md](../FIXING.md)
- 2026-10-07 run 01: R01에서 관측, `status: open`. 관찰 기록 `doc/qa/run01-tier1/obs/R01-*.json`, 회귀 스펙 `mfa-lab/e2e/regression/fc-qa-001-preview-remount-non-dragged-panels.spec.ts`(케이스 (a)·(b) 모두 "예상대로 실패": (a) `control-b frameMounts`, (b) `control-a frameMounts` 단언에서 실패)
