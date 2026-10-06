# 가설 목록 (HYPOTHESES)

> **이 문서는** `@dannysir/floating-components`를 마이크로 프론트엔드(MFA) 랩에서 검수할 때 확인할 가설(H-*) 목록이다.
> 클라우드 세션 2(검수, run 01)가 시나리오를 실행하기 전에 읽고, 발견을 분류할 때 다시 본다. 수정 세션은 발견 파일의 `hypothesis` 필드에서 이 문서로 온다.
> 여기 적힌 것은 전부 코드 리딩과 1차 자료(브라우저·React 소스, 버그 트래커)에 근거한 **예측이다. 브라우저에서 실행한 것은 없다(미실행).**
> 의존 문서: 계측 이름은 [ARCHITECTURE.md](./ARCHITECTURE.md) 「계측 계약」, 헬퍼·불변식은 [HARNESS.md](./HARNESS.md), 시나리오와 사전 등록 표는 [BRIEF-2-inspect.md](./BRIEF-2-inspect.md), 분류·심각도·결정 로그는 [../README.md](../README.md).

---

## 1. 읽는 법

### 기준 소스

- 줄 번호는 `git rev-parse HEAD:src` = `c1da6c9dc03a4811eea42c220be309e5e73b0a4a` (src를 마지막으로 바꾼 커밋 `ea25ff7`) 기준이다. 2026-10-02에 파일을 열어 확인했다.
- `src/`가 바뀌면 줄 번호가 밀린다. 인용한 코드 한 줄을 `grep`으로 찾아 다시 맞춘다.
- npm 배포본 0.5.1은 이 소스와 다르다. 0.5.1에만 해당하는 내용은 따로 표시했다.

### 표기

| 표기 | 뜻 |
|---|---|
| `H[a, b]` / `V[a, b]` | 가로 split(자식이 왼쪽→오른쪽) / 세로 split(위→아래) |
| 소스 패널 | 지금 드래그 중인 패널 |
| 앵커 패널 | 드롭 기준이 되는 패널(마우스: 커서 아래 패널) |
| `(앵커, 위치, depth)` | 드롭 대상. 위치는 `left`/`right`/`top`/`bottom`. depth 0 = 앵커의 형제, 1 = 앵커 부모 split의 형제, 조상 수 이상 = 루트 레벨 |
| 커밋된 트리 | host가 `tree` prop으로 넘긴 상태. `window.__fc.getTree()`가 돌려준다 |
| 미리보기 트리 | 드래그 중에만 렌더되는 임시 트리. 커밋된 트리에서 소스를 드롭 대상 위치로 옮긴 결과 |
| shadow 패널 | 미리보기 트리 안에서 반투명 + 점선으로 그려지는 소스 패널 |

### 컨테이너 종류

가설의 "영향 컨테이너"는 패널 div 안에 실제로 무엇이 들어 있는지를 뜻한다. 슬롯 이름과 구성은 [ARCHITECTURE.md](./ARCHITECTURE.md) 「앱 목록」과 「대조 사다리와 store 등록」이 정한다.

| 종류 | 슬롯 | 패널 안에 들어가는 것 |
|---|---|---|
| bare | `bare-0..3` | host 트리의 div. 라이브러리만 관여 |
| control / twin | `control-a..d`, `orders-local`, `board-local`, `billing-local` | host 트리의 React 컴포넌트 |
| same-tree | `orders`, `board` | Module Federation remote. host와 같은 React 트리 |
| mount | `billing` (대조 `control-mount`) | 별도 React 루트. `mount(el, ctx)` / `unmount(el)` |
| iframe | `telemetry`(same-site), `telemetry-x`(cross-site) (대조 `control-iframe`) | iframe 문서 |
| Tier 2 (미구축) | custom element + Shadow DOM, 중첩 TreeLayout, React 18 mount | [ARCHITECTURE.md](./ARCHITECTURE.md) 「2차 백로그」 |

### 항목 구성

가설마다 진술 / 메커니즘 / 근거(파일:줄 + 핵심 줄 인용) / 영향 컨테이너 / 예측 / 관측 방법 / 오라클 / 기본 분류 / 단계·시나리오 순으로 적는다.

- **오라클**: "이상적 동작"의 근거. API 문서, `doc/TODO.md`, 사용자 결정, 코드 주석 중 하나다. 근거가 없으면 "가정"이라고 적는다.
- **기본 분류**: 관측됐을 때 발견의 `class` 초기값이다. 귀속 사다리([../README.md](../README.md))를 적용한 결과가 다르면 사다리 결과가 우선한다.
- **시나리오 ID**: R01~R19는 run 01 시나리오([BRIEF-2-inspect.md](./BRIEF-2-inspect.md) 「시나리오 표」), S0~S10은 스파이크([BRIEF-1-build.md](./BRIEF-1-build.md) 「스파이크 표」)다.
- 시나리오별 기대/예측의 판정 기준은 [BRIEF-2-inspect.md](./BRIEF-2-inspect.md) 「기대와 예측」의 사전 등록 표다. 이 문서의 예측과 다르면 그 표를 따르고, 차이를 REPORT.md에 적는다.
- 실행 뒤에 예측 문구를 고쳐 쓰지 않는다. 관측은 REPORT.md의 가설 판정과 발견 파일에 적는다. 줄 번호 갱신과 오탈자 수정만 허용하고, 그 밖의 변경은 문서 끝 "Amendments"에 날짜와 함께 적는다.

---

## 2. 리마운트 · DOM 재삽입 · iframe 재로드

패널 하나가 "초기화됐다"고 보일 때 원인은 세 가지로 갈린다. 원인마다 고치는 방법이 달라서 따로 센다.

| 현상 | React fiber | DOM 노드 | 잃는 것 | 관측 |
|---|---|---|---|---|
| **리마운트** | 버리고 새로 만든다 | 새 노드 | 컴포넌트 state, ref, effect, 입력값, 스크롤, 포커스 전부 | `__fc.frames[slot].frameMounts`/`frameUnmounts` +1, `__mfe[slot].mounts`/`unmounts` +1, 스냅샷 diff `remounted` |
| **DOM 재삽입** | 유지 | 같은 노드를 떼었다가 다시 꽂는다 | React state는 남는다. DOM 수준 상태만 잃는다: iframe 문서, `scrollTop`, 포커스, CSS 애니메이션, 재생 중인 미디어 | 마운트 카운터 +0, `__probe.domMoves[panelId]` +1, 스냅샷 diff `reinserted` |
| **iframe 재로드** | (위 둘 중 하나의 결과) | iframe 요소가 문서에서 떨어졌다 붙으면 문서를 처음부터 다시 로드한다 | iframe 안의 모든 상태 | iframe 문서 안의 `__mfe[slot].loads`·`docId`, host의 `__fc.frames[slot].mirror.loads`·`docIds`, 문서 요청 로그 |

따로 세는 이유:

- **원인이 다르다.** 리마운트는 React key와 부모 구조 문제다. 재삽입은 React가 형제 순서를 맞추는 방식 문제다.
- **고치는 방법이 다르다.** key를 안정시키면 리마운트는 없어지지만 재삽입은 남는다.
- **host 래퍼의 카운터로는 재삽입이 보이지 않는다.** fiber가 유지되므로 래퍼의 마운트 수는 그대로다. 그래서 카운터를 iframe 문서 안과 DOM 이동 로그에도 둔다(3단계 카운터).
- **분류가 다르다.** 드래그하지 않은 패널의 리마운트는 사용자 결정 D3, 리마운트 없는 재삽입은 D3a로 각각 별도 발견이다.

### 리마운트가 생기는 규칙

`src/components/LayoutNodeRenderer.tsx:92`

```tsx
key={child.type === "panel" ? child.id : `split-${i}`}
```

패널은 `id`로, split은 **형제 인덱스**로 key가 정해진다. key는 같은 부모의 자식 사이에서만 의미가 있다. 그리고 드래그 중에는 커밋된 트리 대신 미리보기 트리가 렌더된다(`src/components/TreeLayout.tsx:161` `node={previewTree ?? normalizedTree}`). 따라서 미리보기가 바뀔 때마다 다음 중 하나에 해당하는 패널이 리마운트된다.

1. **부모 split이 바뀐 패널.** 소스가 다른 split으로 들어간 경우, 앵커가 새 split으로 감싸인 경우(`src/tree/insert.ts:68-71`), 루트 전체가 새 split으로 감싸인 경우(`src/tree/insert.ts:49-52`), 자식이 하나 남은 split이 풀려 남은 형제가 위로 올라온 경우(`src/tree/helpers.ts:44-45`).
2. **형제 인덱스가 바뀐 split의 모든 자손.** `split-1`이 `split-2`가 되면 React는 다른 컴포넌트로 본다.
3. **같은 key `split-${i}`가 다른 노드에 재사용된 경우의 자손.** fiber는 재사용되지만 그 아래 패널들은 새 부모 밑에서 새로 마운트된다.

### DOM 재삽입이 생기는 규칙

한 split의 자식 목록에는 패널과 Resizer가 번갈아 들어간다(Resizer key는 `resizer-${i}`, `src/components/LayoutNodeRenderer.tsx:110`). React는 새 순서대로 자식을 훑으면서, 재사용하는 자식의 **옛 인덱스가 지금까지 자리를 지킨 자식들의 옛 인덱스 최댓값보다 작으면** 그 자식을 이동 대상으로 표시한다(`placeChild`의 `lastPlacedIndex`). 이동은 `insertBefore`/`appendChild`, 즉 제거 후 삽입이다.

- 뒤에 있던 패널을 앞으로 끌어오면: 끌어온 패널은 그대로, **건너뛴 패널들이 재삽입**된다.
- 앞에 있던 패널을 뒤로 보내면: **그 패널 자신이 재삽입**된다.
- 출처: React `ReactChildFiber.js`의 `placeChild` — https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactChildFiber.js
- React가 상태를 보존하는 `moveBefore`를 쓰지 않는다는 근거: `enableMoveBefore = false` — https://github.com/facebook/react/blob/main/packages/shared/ReactFeatureFlags.js (main 브랜치에서 확인. 랩이 쓰는 19.2.4 릴리스에서의 값은 따로 확인하지 않았다. 그래서 재삽입 관측에는 React 버전을 함께 적는다.)

### 예시: `H[A, V[B, C], D]`에서 D를 A 왼쪽으로

`census` 프리셋이다(패널 id `p-a`..`p-d`). `p-d`를 `(p-a, left, 1)`로 끈다.

```
커밋된 트리                      미리보기 트리
root H                           root H
├ p-a      key "p-a"             ├ p-d      key "p-d"
├ V        key "split-1"         ├ p-a      key "p-a"
│ ├ p-b                          └ V        key "split-2"   ← 인덱스 1 → 2
│ └ p-c                            ├ p-b
└ p-d      key "p-d"               └ p-c
```

루트 split의 자식 목록(Resizer 포함)은 `[p-a, resizer-0, split-1, resizer-1, p-d]` → `[p-d, resizer-0, p-a, resizer-1, split-2]`로 바뀐다. depth 0과 1, 루트 가장자리 모두 같은 트리가 나온다(`src/tree/insert.ts:43-47`, `77-81`).

| 패널 | hover(미리보기 진입) | Esc(취소) | Esc 대신 드롭(커밋) |
|---|---|---|---|
| `p-b`, `p-c` | **리마운트** (`split-1` → `split-2`) | **다시 리마운트** (누적 2회) | 추가 없음 (누적 1회) |
| `p-a` | DOM 재삽입, 리마운트 아님 | 변화 없음 | 변화 없음 |
| `p-d` (소스) | 변화 없음 (부모 같음, key `p-d` 유지, DOM도 안 움직임) | DOM 재삽입 | 변화 없음 |

- 커밋 때 추가 리마운트가 없는 이유: 커밋된 트리가 미리보기 트리와 같은 구조가 되고, 트리 갱신과 미리보기 해제가 같은 이벤트 핸들러 안에서 한 번에 반영된다(`src/components/TreeLayout.tsx:136-143`).
- 같은 미리보기가 반복되면 다시 렌더하지 않는다(`src/hooks/useDropPreview.ts:23`). 미리보기가 **달라질 때마다**, 그리고 **취소할 때** 위 규칙이 다시 적용된다.
- 터치 경로도 같은 미리보기 상태를 쓴다(`src/hooks/useTouchDrag.ts:116`, `182`). 그래서 입력 방식과 무관하다.

---

## 3. 요약 표

| 가설 | 한 줄 | 단계 | 시나리오 | 스파이크 | 기본 분류 |
|---|---|---|---|---|---|
| H-REMOUNT | 미리보기가 드래그하지 않은 패널을 리마운트한다 | run 01 | R01, R02, R03, R05 | S1 | `library-bug` (D3) → FC-QA-001 |
| H-REINSERT | fiber는 유지되지만 DOM 재삽입으로 iframe이 재로드되고 스크롤·포커스가 초기화된다 | run 01 | R01, R04, R06 | — | `library-bug`, 별도 발견 (D3a) |
| H-DRAGEND | 취소는 분리된 소스 노드에 오는 `dragend`에 의존한다 | run 01 | R07, R14 | S2~S5 | 통과 예상. 실패 시 `library-bug` |
| H-RAF-STALE | 취소되지 않는 rAF가 드래그 종료 뒤에 미리보기를 켠다 | run 01 | R08 | S8 | `library-bug`, `harness_amplified: true` |
| H-FOREIGN-DRAG | 패널 내용에서 시작한 네이티브 드래그가 패널 이동이 된다 | run 01 | R09, R10 | — | `library-bug` |
| H-DROP-HIJACK | 패널이 모든 dragover를 받아들이고 drop 전파를 막는다 | run 01 | R09, R11, R08(b) | — | `spec-question` (버그 권고) |
| H-IFRAME-DEAD | iframe 위에서는 마우스 드롭이 안 되는데 터치는 된다 | run 01 | R12, R07 | S9 | `library-bug`(경로 불일치) + 통합 가이드 (D4) |
| H-GHOST-CLONE | 터치 ghost가 패널을 통째로 복제한다 | run 01 | R13 | S7a | `library-bug` 후보 |
| H-RESIZE | 경계선 리사이즈의 포인터 캡처와 `userSelect` 복원 | run 01 | R15, R17 | S6 | 누수·캡처 유실 시 `library-bug` |
| H-BOUNDARY | 라이브러리에 경계가 없고 픽스처가 패널마다 둔다 | run 01 | R16 | — | 통과 예상 |
| H-HANDLE-STALE | 핸들 모드에서 `draggable`이 `true`로 남는다 | P1 | B2-P1 | — | `library-bug` 후보 |
| H-TOUCH-NATIVE-RACE | 롱프레스가 Chromium의 네이티브 터치 드래그와 경합한다 | P1 (Chromium 153 이상) | B2-P1 | S7b | `library-bug` 후보 (`env-limit` 아님) |
| H-SIZING | 패널 래퍼의 크기·overflow 계약과 px 제약 | P1 | R19(일부), B2-P1 | — | 문서 보장 위반이면 `library-bug` 후보, remote CSS 탓이면 통합 가이드 |
| H-SHADOW-HANDLE 외 8개 | Shadow DOM, 중첩 레이아웃, 늦은 등록 | Tier 2 | 없음 | — | Tier 2에서 결정 |
| (문서 불일치) | 핸들 모드 터치는 롱프레스 없이 시작한다 | run 01 | R13, R14 | S7a | `spec-question` (docs), sev-4 |

R17(workbench 순회)과 R18(탐색)은 특정 가설에 묶이지 않는다. 어느 가설의 신호든 나오면 해당 가설로 연결한다.

---

## 4. run 01 가설

### H-REMOUNT

- **진술**: 드래그 미리보기가 바뀔 때마다, 그리고 취소할 때, 드래그하지 않은 패널이 React 리마운트된다.
- **메커니즘**: 2절 "리마운트가 생기는 규칙" 참고. split의 key가 형제 인덱스이고, 드래그 중에는 미리보기 트리가 실제 트리 자리에 렌더된다.
- **근거**
  - `src/components/LayoutNodeRenderer.tsx:92` — ``key={child.type === "panel" ? child.id : `split-${i}`}``
  - `src/components/TreeLayout.tsx:99-108` — `previewTree`를 `computeMoveResult(normalizedTree, …)`로 계산
  - `src/components/TreeLayout.tsx:161` — `node={previewTree ?? normalizedTree}`
  - `src/tree/insert.ts:49-52` — 루트를 새 split으로 감싼다: `return { type: "split", direction, size: 1, children };`
  - `src/tree/insert.ts:68-71` — 앵커를 새 split으로 감싼다: `return { type: "split", direction, size: node.size, children };`
  - `src/tree/helpers.ts:44-45` — 자식이 하나 남으면 split을 푼다: `if (newChildren.length === 1) return newChildren[0];`
- **영향 컨테이너**: 전부. 결과만 다르다.
  - bare / control / twin / same-tree: state·입력값·스크롤 초기화, effect 재실행
  - mount: 어댑터 cleanup이 `unmount(el)`을 부르고 새로 `mount(el)` → 미리보기가 바뀔 때마다 React 루트를 새로 만든다
  - iframe: iframe 요소가 새로 생겨 문서를 다시 로드한다
- **예측 (미실행)**
  - R01 (`census`, 전부 control, `p-d` → `(p-a, left, 1)`): hover에서 `p-b`·`p-c` 리마운트 +1, Esc에서 +1 더(누적 2). `p-a`는 재삽입만(H-REINSERT), `p-d`는 hover에서 변화 없음.
  - R02 (같은 hover 뒤 드롭): `p-b`·`p-c` 누적 +1. 커밋 시점에 추가 없음.
  - R03 (슬롯 B에 remote): orders는 `mounts` +2(hover+Esc) 또는 +1(드롭)이고 입력값·카운터·스크롤을 잃는다. billing은 미리보기가 바뀔 때마다 `unmountCalls`/`mountCalls`가 1씩 는다. telemetry / telemetry-x는 `loads` +2(Esc) 또는 +1(드롭)이고 host의 `frameMounts`도 같은 만큼 는다.
  - R05 (`p-d` → `p-a` 위쪽 루트 가장자리): 미리보기 `V[p-d, H[p-a, V[p-b, p-c]]]`. `p-a`·`p-b`·`p-c`가 hover에서 모두 리마운트되고 Esc에서 다시 리마운트된다. 옛 `split-1` fiber가 다른 노드(`H[p-a, V[…]]`)에 재사용되기 때문이다. `p-d`는 fiber를 유지한다.
  - 소스 자신의 리마운트: 소스의 부모 split이 바뀌는 이동에서만 생긴다(`doc/TODO.md` "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실"의 예). `census`의 위 두 제스처에서는 소스가 리마운트되지 않는다.
  - S3·R07의 제스처(`locks` `H[nav, editor, V[terminal, output]]`, `terminal` → `(editor, left, 0)`): 미리보기 `H[nav, terminal, editor, output]`. `terminal`(소스)과 **`output`(드래그하지 않음)** 이 리마운트되고 `editor`는 재삽입된다. `output`은 split이 풀리면서 부모가 바뀌기 때문이다.
- **관측 방법**
  - 카운터 차이: `__fc.frames[slot].frameMounts`/`frameUnmounts`(PanelFrame이 있는 슬롯), `__mfe[slot].mounts`/`unmounts`/`instanceSeq`(프로브가 있는 슬롯), mount 종류는 `mountCalls`/`unmountCalls`/`rootsAlive`, iframe은 문서 안 `loads`/`docId`와 host mirror.
  - 내용 상태: `<slot>-input` 값, `<slot>-counter` 텍스트, `<slot>-scroll`의 `scrollTop`, `document.activeElement`.
  - 미리보기 구조 확인: `domTree(page)` (예: `H[p-d,p-a,V[p-b,p-c]]`).
  - 불변식 I1~I7은 리마운트를 잡지 못한다(리마운트 뒤에도 인스턴스는 1개다). 신호는 카운터 차이다.
- **오라클**: 사용자 결정 D3 — 넓은 미리보기 리마운트는 결함이다([../README.md](../README.md) 결정 로그). 이상적 동작: 드래그하지 않은 패널의 내용은 unmount되지 않는다.
- **기본 분류**: `library-bug`, `decision_ref: D3`. 선등록 발견 [FC-QA-001](../findings/FC-QA-001-preview-remount-non-dragged-panels.md)에 증거를 붙인다. 소스 패널 자신의 리마운트는 같은 발견의 하위 관찰로 적는다(D3b, 별도 발견 아님).
- **단계·시나리오**: run 01 / R01, R02, R03, R05. S1이 미리보기 `domTree`를 확인한다.

### H-REINSERT

- **진술**: 패널의 fiber가 유지되는 경우에도 React가 DOM 노드를 떼었다 다시 꽂아서 iframe이 재로드되고 스크롤·포커스가 초기화된다.
- **메커니즘**: 2절 "DOM 재삽입이 생기는 규칙" 참고. iframe 요소는 문서에서 제거되면 안의 문서가 파기되고, 다시 삽입되면 `src`를 처음부터 로드한다(HTML 표준, https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-iframe-element).
- **근거**
  - `src/components/LayoutNodeRenderer.tsx:88-121` — 패널(key = id)과 Resizer(`resizer-${i}`)를 한 배열에 번갈아 넣는다
  - `src/components/PanelNodeRenderer.tsx:151` — 패널 래퍼가 스크롤 컨테이너다: `overflow: "auto",`
  - React `placeChild`, `enableMoveBefore = false` (2절의 URL)
- **영향 컨테이너**: iframe(문서 재로드). same-tree / mount / control은 state는 남고 `scrollTop`·포커스만 잃는다. Tier 2의 custom element는 `disconnectedCallback` → `connectedCallback`이 같은 인스턴스에서 실행된다.
- **예측 (미실행)**
  - R01: hover에서 `p-a`가 재삽입된다(`domMoves` +1, 마운트 카운터 +0). Esc에서는 `p-d`(소스)가 재삽입되고 `p-a`는 그대로다.
  - R04 (`census`의 슬롯 A에 remote): A는 fiber를 유지한 채 hover에서 재삽입된다. orders / billing은 state를 유지하고 `scrollTop`과 포커스를 잃는다. telemetry는 `frameMounts` +0인데 `loads` +1이다. Esc에서는 추가 변화가 없다.
  - R06 (`row3` `H[p-a, p-b, p-c]`, B에 telemetry)
    - (a) `p-c`를 `p-a` 왼쪽으로: 리마운트 없음. hover에서 `p-a`·`p-b` 재삽입(telemetry `loads` +1). Esc에서는 `p-c`(소스)만 재삽입.
    - (b) 새 페이지, `p-a`를 `p-c` 오른쪽으로: hover에서 `p-a`(소스)만 재삽입. Esc에서 `p-b`·`p-c` 재삽입(telemetry `loads`가 **취소 때** +1).
- **관측 방법**: `__probe.domMoves[panelId]`(요소 identity 기준), 스냅샷 diff `reinserted`/`reloaded`, iframe 문서 안 `loads`·`docId`, host mirror `docIds`, `:4304` 문서 요청 수. 마운트 카운터가 +0인 것을 함께 확인해야 H-REMOUNT와 구분된다.
- **오라클**: 사용자 결정 D3a — 드래그하지 않은 패널이 리마운트 없이 DOM 재삽입으로 초기화되는 것도 결함이다.
- **기본 분류**: 드래그하지 않은 패널이면 `library-bug`, `decision_ref: D3a`, FC-QA-001과 **별도 발견**. 소스 패널 자신의 재삽입은 그 발견의 하위 관찰이다(D3b).
- **단계·시나리오**: run 01 / R01, R04, R06.

### H-DRAGEND

- **진술**: `drop` 없이 끝나는 모든 드래그(취소)는 소스 노드에 오는 `dragend` 하나에 의존한다. 미리보기 때문에 소스가 리마운트되면 그 노드는 문서에서 분리된 상태다.
- **메커니즘**: 루트는 패널 드래그가 시작될 때 원본 노드에 `dragend` 리스너를 직접 건다. 루트의 React `onDragEnd`도, window 리스너도, 타임아웃도 없다. 커밋 경로는 루트 `onDrop`이 직접 정리하므로 안전하다. `drop`이 없는 경로는 다음과 같다.
  - Esc
  - `droppable: false` 패널 위에서 놓기 (`dropEffect = "none"`)
  - iframe 본문 위에서 놓기 (H-IFRAME-DEAD)
  - 루트 밖(workspace 여백)에서 놓기. 패널만 dragover를 취소하므로 루트 padding에서 놓아도 `drop`이 없다
- **근거**
  - `src/components/TreeLayout.tsx:144-150` — `e.target.addEventListener("dragend", finishDrag, { once: true });` (149)
  - `src/components/TreeLayout.tsx:80-83` — `finishDrag`: 미리보기 해제 + `delete rootRef.current.dataset.draggingPanelId`
  - `src/components/TreeLayout.tsx:136-158` — 루트의 핸들러는 `onDrop`, `onDragStart`, `onDragLeave`뿐이다. `onDragOver`가 없다
  - `src/components/PanelNodeRenderer.tsx:98-101` — 잠긴 패널: `e.dataTransfer.dropEffect = "none"; return;`
  - `src/hooks/useTouchDrag.ts:243-245` — 터치도 같은 방식: `target.addEventListener("touchend", onTargetEnd as EventListener);`
- **영향 컨테이너**: 전부. iframe 패널이 있으면 "drop 없는 릴리스"가 흔해진다.
- **예측 (미실행)**
  - 브랜치 소스(`http://127.0.0.1:4300`), Chromium: 모든 취소 경로에서 I1~I7 통과. 소스가 리마운트된 경우 `dragend`는 `isConnected: false`인 원본 노드에서 기록된다.
    - 근거: Blink의 `MouseEventManager::DragSourceEndedAt`은 연결 여부를 확인하지 않고 드래그 소스에 `dragend`를 보낸다 — https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/input/mouse_event_manager.cc
    - Playwright의 릴리스(CDP `drop`)와 Esc(CDP `dragCancel`)는 둘 다 이 함수를 거친다 — https://github.com/chromium/chromium/blob/main/content/browser/devtools/protocol/input_handler.cc
  - npm 0.5.1(`http://127.0.0.1:4390`): 같은 제스처에서 I1·I2가 **실패해야 한다**(S5, 양성 대조). 0.5.1은 루트의 React `onDragEnd`를 쓰는데, 분리된 노드의 이벤트는 루트까지 오지 않는다. 실패하지 않으면 하네스를 믿을 수 없다([BRIEF-1-build.md](./BRIEF-1-build.md) 「중단 조건」).
  - 잠긴 `nav` 위 릴리스: `drop` 없음, `dragleave` + `dragend`, `dragend`의 `dropEffect`는 `none`, 트리 변화 없음.
  - iframe 본문 위·workspace 여백 릴리스: `drop` 없이 `dragend`만. 커서가 루트를 벗어나면 `dragleave`에서 미리보기가 먼저 지워진다(`src/components/TreeLayout.tsx:151-158`).
  - 터치(R14): 통과. 잠긴 `nav` 위에서 ghost가 차단 표시로 바뀌고, 놓으면 취소되며, 두 번째 드래그가 정상 동작한다.
  - Firefox: `dragend`가 오지 않을 수 있다(bug 460801 "dragend is not dispatched if the source node was moved or removed during the drag session", 상태 NEW — https://bugzilla.mozilla.org/show_bug.cgi?id=460801). run 01은 Chromium만 실행하므로 REPORT.md에 `env-limit` 수동 확인 항목으로 남긴다.
- **관측 방법**: `__probe.events`의 대상별 종료 리스너 기록(`dragend`/`touchend`/`touchcancel`의 `isConnected`), 불변식 I1(남은 `data-dragging-panel-id`), I2(shadow 스타일), I3(ghost), I5(렌더 구조 = 트리), `__fc.calls`에 `onMovePanel`이 없는지.
- **오라클**: `doc/TODO.md` "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실"의 수정 주장. 그 문서는 실제 입력으로는 미재현이라고 적고 있다.
- **기본 분류**: 통과 예상. 브랜치 소스에서 취소 뒤 미리보기나 `data-dragging-panel-id`가 남으면 `library-bug`(UI 고착이므로 sev-1 후보). 단, H-RAF-STALE의 서명과 일치하면 그쪽 발견의 중복이다.
- **단계·시나리오**: run 01 / R07, R14. 스파이크 S2, S3, S4, S5.

### H-RAF-STALE

- **진술**: 마우스 경로의 패널별 rAF 스케줄러는 drop·dragend·unmount에서 취소되지 않는다. 드래그가 끝난 뒤 늦게 실행된 콜백이 미리보기를 다시 켠다.
- **메커니즘**
  1. dragover가 소스가 아닌 droppable 패널에 떨어지면 다음 프레임에 미리보기를 설정하도록 예약한다.
  2. 같은 프레임 안에서 drop과 dragend가 `finishDrag`를 실행해 미리보기를 지운다.
  3. 예약된 콜백이 실행된다. 드래그 시작 때 잡아 둔 `sourcePanelId`로 미리보기를 설정한다. 직전 값이 `null`이라 그대로 받아들여진다.
  4. 드래그가 없는데 미리보기 트리가 렌더되고 소스에 shadow 스타일이 붙는다. 다음 드래그나 루트 이탈 전까지 남는다.
  - dragover가 소스 자신의 shadow 패널에 떨어지면 예약 전에 반환한다(94행). 그래서 **릴리스 순간 커서 아래에 무엇이 있는지**가 결정 변수다.
  - Playwright의 `mouse.up`은 dragover + drop + dragend를 연달아 보낸다. 그래서 사람보다 훨씬 자주 이 경합에 걸린다.
- **근거**
  - `src/components/PanelNodeRenderer.tsx:94` — `if (!sourcePanelId || sourcePanelId === node.id) return;`
  - `src/components/PanelNodeRenderer.tsx:103-106` — `schedulerRef.current!.schedule(() => { … onDropPreviewChange?.({ sourcePanelId, anchorPanelId: node.id, position, depth }); });`
  - `src/` 전체에서 `.cancel(` 호출은 `src/hooks/useDragResize.ts:48`과 `src/hooks/useTouchDrag.ts:175` 두 곳뿐이다. 마우스 드래그 경로에는 없다
  - `src/hooks/useDropPreview.ts:22-26` — `if (areDropPreviewsEqual(latestRef.current, next)) return; latestRef.current = next; setPreviewState(next);`
  - `src/components/TreeLayout.tsx:136-143` — 루트 `onDrop`은 `latestRef.current`가 있으면 무조건 커밋한다: `if (latest && onMovePanel) { onMovePanel(latest.sourcePanelId, …); }`
  - `src/components/LayoutNodeRenderer.tsx:56-70` — 리사이즈는 **렌더된** 트리의 `path`를 host에 넘긴다
- **영향 컨테이너**: 전부(패널 내용과 무관). 리마운트 비용이 큰 remote일수록 프레임이 길어져 경합 창이 넓어진다.
- **예측 (미실행)**
  - 기본 릴리스(`overShadow`: 소스 shadow 패널의 헤더 위에서 놓기)에서는 0건.
  - `immediate` 릴리스로 다른 droppable 패널 위에서 놓으면 stale 미리보기가 남는다: I1 통과, I2와 I5 중 하나 이상 실패.
  - R08(b): stale 상태에서 `ext-chip`을 패널에 드롭하면 패널 `handleDrop`이 `isPreviewActive`라 그냥 반환하고, 이벤트가 루트 `onDrop`에 닿아 **stale 이동이 커밋된다**(`__fc.calls`에 패널 드래그 없이 `onMovePanel`).
  - R08(c): stale 상태에서 경계선을 리사이즈하면 미리보기 DOM 기준 `path`가 실제 트리에 적용돼 엉뚱한 쌍이 조절되거나 방향이 뒤집힌다.
  - 루트 padding에서 놓으면 `drop`이 없으므로 stale 커밋 확인은 반드시 **패널 위에** 드롭한다.
  - Esc와 잠긴 패널 위 릴리스는 예약을 만드는 dragover를 보내지 않는다. settle 뒤에는 깨끗하다.
  - 실제 사용자에게서의 빈도는 알 수 없다. 하네스의 `immediate` 비율을 사용자 빈도로 인용하지 않는다.
- **관측 방법**: 릴리스마다 기록하는 `underCursorAtDrop`(`source` | `other-droppable` | `locked` | `iframe` | `outside`), I1/I2/I5, 이벤트 로그에서 마지막 dragover와 drop/dragend의 간격, `__fc.calls`, `__fc.treeVersion()`. 판정은 [HARNESS.md](./HARNESS.md) 「stale preview 판정 규칙」을 따른다.
- **오라클**: 불변식 — 진행 중인 드래그가 없으면 미리보기도 없다.
- **기본 분류**: `library-bug`, `harness_amplified: true`, **발견 1건**. 같은 서명의 드롭 후 실패는 모두 그 발견의 중복(`dup_of`)이다. `underCursorAtDrop === 'source'`이거나 Esc·잠긴 패널 릴리스 뒤에 stale이 나오면 서명과 다르므로 새 후보다.
- **단계·시나리오**: run 01 / R08. 비율은 스파이크 S8에서 한 번 측정하고 재사용한다.

### H-FOREIGN-DRAG

- **진술**: 드래그 가능한 패널의 내용에서 시작한 네이티브 드래그(이미지, 링크, 선택한 텍스트, remote 자체의 HTML5 드래그 앤 드롭)가 패널 이동으로 처리된다.
- **메커니즘**: 패널의 `onDragStart`는 자손에서 버블링된 dragstart도 받는다. 검사는 패널 잠금 하나뿐이다. 이벤트 대상이 패널 자신인지, 핸들을 눌렀는지 확인하지 않는다. 핸들 모드에서 패널의 `draggable`이 `false`여도 자손의 dragstart는 여기까지 올라온다. 이후 루트가 "패널 드래그"로 인식하고, 이웃 패널 위에서 미리보기가 뜨며, 드롭하면 패널 전체가 이동한다.
- **근거**
  - `src/components/PanelNodeRenderer.tsx:71-81` — 가드는 74행 `if (!canDrag) return;` 하나. 이어서 `e.dataTransfer.setData("text/panel-id", node.id);`, `e.dataTransfer.effectAllowed = "move";`, `root.dataset.draggingPanelId = node.id;`
  - `src/components/PanelNodeRenderer.tsx:73` — 주석: `// 내부 img/link 등의 네이티브 드래그가 버블링돼 패널 드래그로 오인되지 않게 한다.` (실제로는 `draggable: false` 패널에서만 성립)
  - `src/components/TreeLayout.tsx:146` — `if (!rootRef.current?.dataset.draggingPanelId) return;` (설정돼 있으면 패널 드래그로 본다)
- **영향 컨테이너**: bare, control / twin, same-tree, mount(별도 루트 안의 dragstart도 DOM을 따라 host 루트까지 버블링된다). iframe은 해당 없음(이벤트가 문서 밖으로 나오지 않는다).
- **예측 (미실행)**
  - R09 (board 안에서 카드를 열 사이로 이동): 루트에 `data-dragging-panel-id`가 붙고, dataTransfer에 `text/panel-id`가 추가되며, `effectAllowed`가 `move`로 덮인다. 카드 이동 자체는 된다. `board-local`(twin)에서도 같다(라이브러리 코어 문제). board 단독 페이지에서는 깨끗하다.
  - R10 (카드, 그다음 `<img>`를 이웃 패널로): 이웃 패널 위에서 패널 이동 미리보기가 뜨고, 드롭하면 `__fc.calls`에 `onMovePanel("p-a", "p-b", …)`가 기록되며 board 패널 전체가 이동한다.
  - `?lock=p-a:draggable`로 board 패널을 잠그면 위 현상이 사라진다.
- **관측 방법**: 드래그 중 `[data-tree-root]`의 `data-dragging-panel-id`, `__probe.events`의 dragstart `types`·`effectAllowed`, `__fc.calls`, `__mfe[slot].dnd`(`cardMoves`, `lastTypes`, `lastDragend`), `domTree`.
- **오라클**: 73행 주석이 밝힌 의도 — 내부 네이티브 드래그는 패널 드래그로 오인되지 않아야 한다.
- **기본 분류**: `library-bug`.
- **단계·시나리오**: run 01 / R09, R10.

### H-DROP-HIJACK

- **진술**: 패널 래퍼는 패널 드래그가 아닌 드래그에도 dragover를 받아들이고 `dropEffect`를 `move`로 바꾸며, drop의 전파를 막는다.
- **메커니즘**
  - `handleDragOver`는 소스 확인보다 먼저 `preventDefault()`와 `dropEffect = "move"`를 실행한다. remote의 드롭 존이 먼저 `copy`를 설정해도 버블링 뒤에 덮인다.
  - 드래그의 `effectAllowed`가 `move`를 허용하지 않으면(예: `copy`) 브라우저는 드롭을 거부한다(HTML 표준의 drag-and-drop 처리 모델, https://html.spec.whatwg.org/multipage/dnd.html).
  - `handleDrop`은 미리보기가 없으면 `stopPropagation()`을 부른다. 패널 드래그가 아닌 드래그에는 미리보기가 없으므로 항상 막힌다. React의 `stopPropagation`은 네이티브 이벤트도 멈추므로 document·window의 버블 단계 drop 리스너가 실행되지 않는다.
- **근거**
  - `src/components/PanelNodeRenderer.tsx:85-86` — `e.preventDefault(); e.dataTransfer.dropEffect = "move";`
  - `src/components/PanelNodeRenderer.tsx:115-120` — `if (!canDrop) { e.stopPropagation(); return; } if (isPreviewActive) return; e.stopPropagation();`
  - 버블 단계 top-level drop 리스너를 쓰는 라이브러리의 예: react-dnd HTML5 backend의 `handleTopDrop` — https://github.com/react-dnd/react-dnd/blob/main/packages/backend-html5/src/HTML5BackendImpl.ts
- **영향 컨테이너**: bare, control / twin, same-tree, mount. iframe은 해당 없음. `ext-chip`(트리 밖의 드래그 소스)으로 remote 코드 없이도 재현된다.
- **예측 (미실행)**
  - R09: 버블 단계 window drop 리스너가 실행되지 않는다(프로브 로그에서 capture에는 있고 bubble에는 없어 `stopped` 표시).
  - R11 (copy 소스 → copy 존)
    - board 패널이 draggable: 드롭은 성공하지만 `dragend`의 `dropEffect`가 `move`로 보고된다(H-FOREIGN-DRAG가 `effectAllowed`를 `move`로 덮었기 때문).
    - `?lock=p-a:draggable`: 드롭이 **거부된다**. `effectAllowed`는 `copy`로 남는데 패널이 `dropEffect`를 `move`로 강제하기 때문이다.
    - board 단독 페이지: `dragend`의 `dropEffect`가 `copy`.
- **관측 방법**: `__probe.events`의 dragover/drop `dropEffect`·`effectAllowed`·`defaultPrevented`·`stopped`, `__mfe[slot].dnd.copyDrops`·`lastDragend`.
- **오라클**: 가정 — 레이아웃은 패널 드래그가 아닌 드래그에 대해 투명해야 한다. 문서나 사용자 결정으로 뒷받침되지 않는다.
- **기본 분류**: `spec-question` (버그로 권고). 단독 페이지와의 차이를 대조 결과로 붙인다.
- **단계·시나리오**: run 01 / R09, R11. R08(b)도 같은 코드 경로를 지난다.

### H-IFRAME-DEAD

- **진술**: iframe으로 채워진 패널은 마우스 드래그의 드롭 대상이 되지 못한다. 터치 경로는 같은 패널을 드롭 대상으로 잡는다.
- **메커니즘**
  - 마우스: 드래그 앤 드롭 처리는 전부 패널 div의 React 핸들러다. 커서가 iframe 위에 있으면 dragover와 drop은 iframe 문서로 간다. host 패널의 핸들러가 실행되지 않으므로 미리보기가 갱신되지 않고, 거기서 놓으면 host에는 `drop` 없이 `dragend`만 온다(취소).
  - 터치: host 문서의 `document.elementFromPoint`는 `<iframe>` 요소를 돌려주고 `closest("[data-panel-id]")`가 패널을 찾는다. 그래서 iframe 패널 위 드롭이 동작한다.
  - 어느 입력이든 iframe 내용 안에서 드래그를 **시작**할 수는 없다. mousedown·touchstart가 host 문서에 오지 않는다.
  - host 쪽 우회: 마우스 드래그 중에는 루트에 `data-dragging-panel-id`가 붙으므로 `[data-dragging-panel-id] iframe { pointer-events: none }`로 dragover를 패널에 닿게 할 수 있다(랩의 `?iframeShield=1`). 터치 경로는 이 속성을 설정하지 않는다.
- **근거**
  - `src/components/PanelNodeRenderer.tsx:144-147` — `onMouseDown`, `onDragStart`, `onDragOver`, `onDrop`이 패널 div에만 있다
  - `src/components/PanelNodeRenderer.tsx:78` — `if (root) root.dataset.draggingPanelId = node.id;`
  - `src/hooks/useTouchDrag.ts:101-103` — `const hit = document.elementFromPoint(x, y); const anchorEl = hit?.closest("[data-panel-id]") as HTMLElement | null;`
  - `src/components/TreeLayout.tsx:21-40` — props에 드래그 시작·종료 콜백이 없다
- **영향 컨테이너**: iframe (`control-iframe`, `telemetry`, `telemetry-x`).
- **예측 (미실행)**
  - R12 (`row3`: control-a, telemetry, telemetry-x): dragover가 host 패널이 아니라 iframe 문서 안에서 기록된다. 미리보기가 갱신되지 않는다. iframe 위에서 놓으면 취소된다. `?iframeShield=1`에서는 드롭이 커밋된다.
  - 커서가 iframe에 들어갈 때 루트 `onDragLeave`는 미리보기를 지우지 않을 것으로 본다. `relatedTarget`이 iframe 요소이고 루트 안에 있기 때문이다(`src/components/TreeLayout.tsx:154-157`). 추론이며 관측으로 확정한다.
  - cross-site 행(`telemetry-x`)은 CDP로 가로챈 드래그 이벤트가 프로세스 밖 iframe에서 어디에 떨어지는지 S9로 확인하기 전까지 하네스 충실도 주의 표시를 단다.
- **관측 방법**: iframe 문서 안의 dragenter/dragover/drop 수(telemetry 화면과 `__probe.events`의 프레임 URL), host 패널의 dragover 유무, `domTree`가 hover 중 변하는지, `__fc.calls`, 릴리스의 `underCursorAtDrop === 'iframe'`.
- **오라클**: `doc/API.ko.md` "드래그 앤 드롭" — 터치 경로는 "드롭 타겟 우선순위·`position`·`depth`는 마우스와 똑같이 적용"된다고 적는다. 두 입력의 결과가 다르면 이 문장과 어긋난다.
- **기본 분류**: 마우스와 터치의 결과가 다르면 `library-bug`(경로 불일치). "iframe 내용 안에서 드래그를 시작할 수 없다"는 버그가 아니라 통합 가이드다(사용자 결정 D4). shield CSS와 host가 그리는 핸들은 README 권장 패턴 후보로 REPORT.md에 적는다.
- **단계·시나리오**: run 01 / R12, R07(iframe 위 릴리스). 스파이크 S9(보고 전용).

### H-GHOST-CLONE

- **진술**: 터치 드래그의 ghost는 패널 DOM을 `cloneNode(true)`로 통째로 복제해 `body`에 붙인 것이다. 복제는 MFA 내용을 잘못 보여주거나 다시 실행시킨다.
- **메커니즘**: 복제 시 루트의 `data-panel-id`만 지우고 나머지는 그대로 둔다. 표준 DOM 동작상 다음이 따라온다.
  - iframe: 복제된 iframe이 문서에 붙으면 `src`를 한 번 더 로드한다(remote가 한 번 더 부팅).
  - canvas: 비트맵은 복제되지 않아 빈 화면이다.
  - ghost는 `body` 바로 아래에 있다. 패널 위쪽 조상에 정의된 CSS 변수와 조상 선택자 스타일을 잃는다.
  - 자손의 `id`와 `data-testid`가 ghost가 사는 동안 중복된다.
- **근거**
  - `src/hooks/useTouchDrag.ts:60-61` — `const ghost = session.el.cloneNode(true) as HTMLElement; ghost.removeAttribute("data-panel-id");`
  - `src/hooks/useTouchDrag.ts:70-74` — `s.pointerEvents = "none";` … `s.zIndex = "9999";` … `document.body.appendChild(ghost);`
- **영향 컨테이너**: iframe(두 번째 문서 로드), mount·same-tree 중 canvas가 있는 것(빈 canvas), 전부(테마 토큰 유실).
- **예측 (미실행)** — R13, 핸들 터치 드래그, ghost 생성 직후와 500 ms 뒤
  - telemetry: ghost용 문서가 하나 더 로드된다(host mirror `loads` +1, 새 `docId`, `:4304` 문서 요청 +1).
  - billing: ghost 안의 canvas가 비어 있다.
  - 전부: ghost가 `[data-theme]` 토큰을 잃는다(계산된 스타일로 확인).
  - control / orders: 정적인 복제본. 부작용 없음.
- **관측 방법**: ghost는 `body > [style*="z-index: 9999"]`로 따로 읽는다. 내용 조회는 반드시 `[data-tree-root]` 아래로 한정한다(ghost가 `data-testid`를 전부 복제한다). `__fc.frames[slot].mirror`, 문서 요청 로그, ghost 요소 스크린샷, 계산된 스타일.
- **오라클**: 가정 — 드래그를 시작하는 것만으로 패널 내용에 부작용이 없어야 한다.
- **기본 분류**: `library-bug` 후보. `input: touch-cdp-handle`과 "Chromium CDP 터치 에뮬레이션, 실기기 아님" 문구를 붙인다.
- **단계·시나리오**: run 01 / R13. 스파이크 S7a가 ghost 1개 생성·제거를 확인한다.

### H-RESIZE

- **진술**: 경계선 리사이즈는 포인터 캡처와 `body`의 `user-select`에 의존한다. iframe을 가로지를 때의 동작과, 정상 종료가 아닐 때의 복원은 확인되지 않았다.
- **메커니즘**: Resizer의 pointerdown에서 `preventDefault()`, `setPointerCapture`, `document.body.style.userSelect = "none"`을 실행한다. 정리는 Resizer 요소에 온 `pointerup`/`pointercancel`의 `finish`에서만 한다. `lostpointercapture` 처리와 unmount 정리가 없다. 정리 없이 끝나면 `body`가 선택 불가 상태로 남고, 그 Resizer는 `activePointerId`가 남아 다시 잡히지 않는다(19행).
- **근거**
  - `src/hooks/useDragResize.ts:19-23` — `if (activePointerId.current !== null) return; e.preventDefault(); … el.setPointerCapture(pointerId);`
  - `src/hooks/useDragResize.ts:29-30` — `const prevUserSelect = document.body.style.userSelect; document.body.style.userSelect = "none";`
  - `src/hooks/useDragResize.ts:45-58` — `finish`에서만 `document.body.style.userSelect = prevUserSelect;`와 리스너 해제
  - `src/hooks/useDragResize.ts:60-62` — 리스너는 `pointermove`, `pointerup`, `pointercancel` 셋뿐
- **영향 컨테이너**: 전부. 캡처 문제는 iframe, 특히 프로세스 밖 iframe(`telemetry-x`).
- **예측 (미실행)**
  - R15 (`row3`: control-a, telemetry, telemetry-x; iframe 옆 경계선을 150 px 쓸고 iframe 위에서 놓기): same-site는 통과. 프로세스 밖 iframe은 근거가 없어 열린 질문이다. 가정하지 말고 기록한다.
  - 리사이즈 중 호환 마우스 이벤트(mousedown/mousemove/mouseup)는 없다. pointerdown을 취소했기 때문이며 결함이 아니다.
  - 크기 변화는 포인터 이동량보다 조금 작다. px→flex 환산이 Resizer 두께를 포함한 split 전체 폭을 쓰기 때문이다(`src/components/LayoutNodeRenderer.tsx:61-66`). 방향과 3 px 허용 오차로 판정한다.
- **관측 방법**: `__probe.events`의 `gotpointercapture`/`lostpointercapture`/`pointerup`과 프레임 URL, 불변식 I4(`body.style.userSelect` 복원), `panelRect` 전후 차이, `__fc.calls`의 `onResizeBorder`.
- **오라클**: `doc/API.ko.md` `resizeBorder` 설명 — "내부 리사이즈 핸들은 Pointer Events(`setPointerCapture`)로 동작하므로 마우스·터치·펜에서 모두 사용할 수 있습니다".
- **기본 분류**: `userSelect` 누수나 캡처 유실(리사이즈가 중간에 멈춤)이 관측되면 `library-bug`.
- **단계·시나리오**: run 01 / R15, R17(모든 경계선 조절). 스파이크 S6.

### H-BOUNDARY

- **진술**: 라이브러리에는 Suspense나 에러 경계가 없다. remote 하나가 죽었을 때 레이아웃이 유지되는지는 host가 경계를 어디에 두느냐에 달려 있다.
- **메커니즘**: 패널 렌더러는 store에서 꺼낸 내용을 그대로 렌더한다. 미리보기 갱신은 일반 `setState`다. 경계가 TreeLayout **바깥**에 있으면 패널 하나의 실패나 suspend가 레이아웃 전체를 fallback으로 바꾼다. 랩은 패널마다 `PanelFrame` 안에 `RemoteErrorBoundary`와 `Suspense`를 두고, 헤더(드래그 핸들)는 경계 밖에 둔다([ARCHITECTURE.md](./ARCHITECTURE.md) 「패널 프레임과 경계」).
- **근거**
  - `src/components/PanelNodeRenderer.tsx:155` — `{content}`
  - `src/` 전체에 `Suspense`, `ErrorBoundary`, `startTransition`이 없다(`grep` 0건)
  - `src/hooks/useDropPreview.ts:25` — `setPreviewState(next);`
- **영향 컨테이너**: same-tree(`React.lazy` 실패), mount(`import()` 실패), iframe(로드 실패).
- **예측 (미실행)** — R16 (`workbench`, orders origin을 `page.route`로 차단): 에러 카드는 orders 패널에만 나온다. 다른 패널의 드래그와 리사이즈가 동작한다. 죽은 패널도 헤더로 드래그된다. Module Federation이 degraded 상태면 R16은 `blocked (MF degraded)`다.
- **관측 방법**: `error-orders`·`retry-orders` testid, `__fc.frames.orders.state === 'error'`, 다른 슬롯의 `state === 'ready'`, I1~I7(I6·I7은 시나리오 허용 목록 적용), `__fc.calls`.
- **오라클**: 가정 — 패널 하나가 죽어도 레이아웃은 조작 가능해야 한다.
- **기본 분류**: 통과 예상. shell 전체가 비거나 드래그가 깨지면 귀속 사다리를 적용한다. 경계는 픽스처 소유이므로 먼저 `fixture-bug` 여부를 가린다.
- **단계·시나리오**: run 01 / R16.

---

## 5. P1 가설

run 01의 필수·2차 묶음에서 나온 발견을 모두 쓴 뒤에만 실행한다(`not-run` 허용).

### H-HANDLE-STALE

- **진술**: 핸들 모드에서 패널의 `draggable`이 직전 핸들 누름의 `true`로 남아, 핸들이 아닌 내용에서 드래그가 시작될 수 있다.
- **메커니즘**: `handleMouseDown`이 `panelRef.current.draggable`을 명령형으로 설정한다. React prop은 계속 `false`라서 React가 되돌리지 않는다. 값은 **다음 mousedown이 이 핸들러에 도달할 때**에만 갱신된다. remote가 mousedown 전파를 막거나, pointerdown이 취소돼 mousedown이 발생하지 않으면 `true`가 남는다.
- **근거**
  - `src/components/PanelNodeRenderer.tsx:59-69` — `panelRef.current.draggable = canDrag && isHandle;` (65)
  - `src/components/PanelNodeRenderer.tsx:143` — `draggable={canDrag && !dragHandleSelector}`
- **영향 컨테이너**: same-tree(합성 `stopPropagation`은 패널의 React 핸들러를 막는다), mount(별도 루트 안에서 멈춘 네이티브 이벤트는 host에 오지 않는다).
- **예측 (미실행)**: billing의 `<slot>-stopprop` 체크박스를 켠 뒤, 핸들 드래그를 한 번 하고 내용 영역에서 드래그를 시도하면 패널 드래그가 시작된다. 그 전에 `panel.draggable`을 읽으면 `true`다.
- **관측 방법**: 스냅샷의 패널 `draggable` 프로퍼티, `__probe.events`의 mousedown 유무와 dragstart 대상.
- **오라클**: `doc/API.ko.md` `dragHandleSelector` — 핸들을 지정하면 핸들에서만 드래그가 시작된다.
- **기본 분류**: `library-bug` 후보.
- **단계·시나리오**: P1 / B2-P1(핸들 없는 모드 상호작용과 stale `draggable`).

### H-TOUCH-NATIVE-RACE

- **진술**: 핸들이 없는 모드에서 터치 롱프레스가 Chromium의 "터치로 시작하는 네이티브 드래그"와 경합한다.
- **메커니즘**: 핸들이 없으면 패널은 `draggable=true`다. 라이브러리는 450 ms 롱프레스 타이머로 자체 터치 드래그를 시작한다. Chromium 153은 Linux·Windows에서도 롱프레스 제스처로 `draggable` 요소의 네이티브 드래그(dragstart)를 시작한다. 그러면 터치 시퀀스가 `touchcancel`로 끊기고, 마우스 경로의 `handleDragStart`가 실행된다. 두 경로 중 어느 쪽이 이기는지는 타이밍에 달려 있다.
  - Chromium 141(Playwright 1.56)에서는 이 기능이 ChromeOS·Android에서만 켜져 있다 — https://github.com/chromium/chromium/blob/141.0.7390.37/ui/base/ui_base_features.cc
  - Chromium 153(Playwright 1.63)에서는 Windows·Linux에서도 기본으로 켜져 있다(`kTouchDragAndDrop`) — https://github.com/chromium/chromium/blob/153.0.8010.12/ui/base/ui_base_features.cc
  - 롱프레스 제스처가 드래그를 시작하는 코드: `GestureManager::HandleGestureLongPress` — https://github.com/chromium/chromium/blob/153.0.8010.12/third_party/blink/renderer/core/input/gesture_manager.cc
  - Chromium의 롱프레스 지연은 약 500 ms로 알려져 있으나 확인하지 않았다.
- **근거**
  - `src/components/PanelNodeRenderer.tsx:143` — `draggable={canDrag && !dragHandleSelector}`
  - `src/hooks/useTouchDrag.ts:8` — `const LONG_PRESS_MS = 450;`
  - `src/hooks/useTouchDrag.ts:246-250` — `if (!dragHandleSelector) { session.longPressTimer = setTimeout(() => { if (session) startDrag(session.startX, session.startY); }, LONG_PRESS_MS); }`
  - 핸들 모드는 패널이 `draggable=false`라 이 경합에 노출되지 않는다.
- **영향 컨테이너**: 전부(`?drag=panel`에서만). 현재 Chrome을 쓰는 Windows 터치스크린과 Android에도 해당한다.
- **예측 (미실행)**: Chromium 141 — 롱프레스 드래그가 커밋된다. Chromium 153 — 프로브 로그에 trusted dragstart나 `touchcancel`이 나타날 수 있고, 페이지가 Playwright가 가로채지 못한 네이티브 드래그 상태로 남을 수 있다. headless shell에서 실제로 네이티브 드래그가 시작되는지는 미확인이다.
- **관측 방법**: `__probe.events`에서 롱프레스 구간의 `dragstart`(`isTrusted`), `touchcancel`, ghost 유무, 루트의 `data-dragging-panel-id`. 새 컨텍스트에서 실행한다.
- **오라클**: `doc/API.ko.md` — 핸들이 없으면 패널 롱프레스(450 ms)로 드래그가 시작된다.
- **기본 분류**: `library-bug` 후보. `env-limit`으로 분류하지 않는다. 터치 전체를 `env-limit`으로 만드는 것은 S7a(핸들 터치 드래그) 실패뿐이다.
- **단계·시나리오**: P1 / B2-P1, Chromium 153 레인에서만. 스파이크 S7b가 보고 전용으로 먼저 기록한다. 레인 정의는 [HARNESS.md](./HARNESS.md) 「브라우저 레인」.

### H-SIZING

- **진술**: 패널 래퍼의 크기·overflow 계약이 단독 페이지로 만든 remote의 크기 방식과 맞지 않을 수 있고, 경계선 드래그의 px 제약이 CSS 제약과 어긋날 수 있다.
- **메커니즘**
  - (a) 래퍼 스타일은 `flex: node.size`, 부모 split 방향 축의 min/max만, 반대 축 최소 0, `overflow: auto`다. 위치 지정(`position`)이 없고 루트에는 overflow 처리가 없다. `100vh`, `min-width: 1200px`, viewport 미디어 쿼리, 절대 위치 UI를 쓰는 remote는 이중 스크롤바·넘침·클리핑 누락을 낼 수 있다. 이것은 CSS 의미론이며 통합 가이드 영역이다.
  - (b) 경계선 드래그는 px 제약을 flex 단위로 환산해 자른다. 이때 px 총량은 **split 전체 폭**(Resizer 포함)이고 flex 총량은 **인접 두 자식의 합**이다. 자식이 2개인 split에서는 Resizer 두께만큼만(수 px) 어긋난다. 자식이 3개 이상인 split에서는 환산 비율이 `두 자식 flex 합 / 전체 flex 합`만큼 작아진다. 이 (b)의 3개 이상 경우는 이 문서를 쓰면서 코드 리딩으로 추가한 것이다.
- **근거**
  - `src/components/PanelNodeRenderer.tsx:148-153` — `flex: node.size, …panelSizeStyle(…), overflow: "auto",`
  - `src/components/panelSizeStyle.ts:23-25` — `if (parentDirection === HORIZONTAL) return { minWidth: minWidth ?? 0, maxWidth, minHeight: 0 };`
  - `src/components/TreeLayout.tsx:125-135` — 루트 스타일에 overflow 없음
  - `src/components/LayoutNodeRenderer.tsx:61-67` — `const totalFlex = node.children.reduce(…); const ratioDelta = (pixelDelta / totalSize) * totalFlex; onResizeBorder(path, borderIndex, ratioDelta, totalSize);`
  - `src/tree/resize.ts:15-18` — `const totalSize = left.size + right.size; const toFlex = (px: number) => totalPixels && totalPixels > 0 ? (px / totalPixels) * totalSize : 0;`
- **영향 컨테이너**: (a) 전부, 특히 mount·iframe·same-tree의 페이지형 CSS. (b) 내용과 무관.
- **예측 (미실행)**
  - (a) 랩의 remote는 계약대로 `width: 100%; height: 100%`를 쓰므로 Tier 1에서는 깨끗할 것으로 본다. 패널보다 큰 내용은 래퍼 안에서 스크롤된다.
  - (b) 자식이 3개 이상인 split에서 `maxWidth`를 준 패널은 설정한 px보다 **작은 값에서** 경계선이 멈춘다. `minWidth`는 상태값이 설정 px 아래로 내려가고 화면은 CSS `min-width`에 걸려 멈춘다(되돌릴 때 경계선이 한동안 따라오지 않는다). 예: 같은 크기 자식 3개, 폭 1200 px, 왼쪽 패널 `maxWidth: 600` → 환산값 `600 / 1200 × 2 = 1.0` flex ≈ 400 px에서 막힌다.
- **관측 방법**: 패널별 `scrollWidth > clientWidth`, 창 폭 1280과 800에서의 `panelRect`, 경계선을 양 끝까지 끌었을 때의 px와 설정 px 비교, `__fc.getTree()`의 `size`와 실제 폭의 비율, 스크린샷.
- **오라클**: `doc/API.ko.md` "패널 크기 제약" — 제약은 "윈도우/컨테이너 리사이즈(CSS)와 경계선 드래그(`resizeBorder`)에서 동일한 px로 일관되게 보장"된다. "콘텐츠 오버플로우" — 패널보다 큰 내용은 "잘리지 않고 스크롤"된다. `doc/TODO.md` "남은 검증"의 패널 크기 제약 항목.
- **기본 분류**: 문서가 보장한 px와 수 px 넘게 어긋나면 `library-bug` 후보. remote 자신의 CSS가 원인이면 통합 가이드(버그 아님).
- **단계·시나리오**: R19가 control 패널에서 min/max와 overflow를 확인한다. 컨테이너별 sizing/overflow 표는 P1 / B2-P1.

---

## 6. Tier 2 가설

세션 1~2에서 만들지 않는 remote가 있어야 확인할 수 있다. 시나리오가 없다. run 01의 REPORT.md를 보고 무엇을 만들지 정한다. 기본 분류도 그때 정한다.

| 가설 | 진술 | 메커니즘과 근거 | 예측 (미실행) | 필요한 것 |
|---|---|---|---|---|
| H-SHADOW-HANDLE | `dragHandleSelector`가 shadow root 안의 핸들과 매칭되지 않는다 | shadow tree 밖의 리스너는 `e.target`이 host 요소로 바뀌어 보이고 `closest()`는 shadow 경계를 넘지 않는다. `src/`에 `composedPath`가 없다. `src/components/PanelNodeRenderer.tsx:62-63` `const target = e.target as HTMLElement; const isHandle = !!target.closest(dragHandleSelector);`, `src/hooks/useTouchDrag.ts:220-221` `if (!target \|\| !target.closest(dragHandleSelector)) return;` | shadow 안 핸들은 마우스·터치 모두 동작하지 않는다. host 요소가 선택자와 일치하면 remote 안 어디를 눌러도 핸들로 취급된다 | open Shadow DOM custom element |
| H-SHADOW-END | 종료 리스너가 retarget된 host에 걸려, 실제 대상이 host에서 떨어지면 종료 이벤트를 잃는다 | `src/hooks/useTouchDrag.ts:223` `const target = e.target ?? el;`, `243-245`, `src/components/TreeLayout.tsx:149`. 조건부다: custom element가 `disconnectedCallback`에서 shadow 내용을 정리할 때만 생긴다. 마우스는 shadow 안에서 시작한 드래그에만 해당한다 | 터치: 세션이 정리되지 않아 ghost와 미리보기가 남고, 이후 모든 터치 드래그가 `src/hooks/useTouchDrag.ts:213` `if (session) return;`에 막힌다 | disconnect 때 정리하는 custom element |
| H-NEST-START | 중첩 레이아웃에서 안쪽 패널의 dragstart가 바깥 패널 핸들러까지 올라가 payload를 덮어쓴다 | `src/components/PanelNodeRenderer.tsx:74-78`이 모든 조상 패널에서 실행된다: `e.dataTransfer.setData("text/panel-id", node.id);` … `if (root) root.dataset.draggingPanelId = node.id;`. 같은 키를 쓰므로 바깥 패널이 안쪽 값을 덮어쓰고, `closest("[data-tree-root]")`는 각자의 루트를 찾는다 | 안쪽 패널을 바깥 패널 위로 끌면 중첩 레이아웃을 담은 host 패널 전체가 이동 미리보기된다. 미리보기 전의 빠른 안쪽 드롭은 바깥 패널 id를 받아 `panel not found` 경고와 함께 사라진다. 바깥 패널이 `draggable: false`면 생기지 않는다 | TreeLayout을 렌더하는 remote |
| H-NEST-SCOPE | drop이 TreeLayout 인스턴스로 한정되지 않는다 | payload에 인스턴스 정보가 없고, 루트의 `data-tree-root` 값은 비교되지 않는다(`src/components/TreeLayout.tsx:61`, `124`). 패널 drop은 id가 어느 트리 것인지 확인하지 않는다: `src/components/PanelNodeRenderer.tsx:122-125` `const sourcePanelId = e.dataTransfer.getData("text/panel-id");` … `onMovePanel(sourcePanelId, node.id, position, depth);`. 루트 `onDrop`은 전파를 막지 않는다(`src/components/TreeLayout.tsx:136-143`) | 바깥 드래그를 안쪽 레이아웃 위에 놓으면 안쪽 패널이 전파를 막아 바깥 이동이 취소되고 안쪽 `onMovePanel`이 바깥 id로 호출된다. 형제 레이아웃끼리 서로의 패널 id를 받는다. `useLayoutTree`에서는 경고 후 무시(`src/hooks/useLayoutTree.ts:28-39`)지만 id가 겹치면 엉뚱한 트리가 움직인다 | 중첩 또는 형제 TreeLayout |
| H-TOUCH-ANCHOR | 터치 경로가 앵커를 문서 전체에서 찾고, 다른 트리의 id가 앵커가 되면 미리보기에서 소스 패널이 사라진다 | `src/hooks/useTouchDrag.ts:101-103`에 루트 확인이 없다. `src/tree/insert.ts:149-150` `if (!result) return tree;` 뒤에 `src/tree/move.ts:23`이 소스를 제거하고 26행의 ghost 치환은 아무것도 못 찾는다 | 바깥 패널을 중첩 레이아웃 위로 터치 드래그하면 hover 중 소스가 레이아웃에서 사라진다. 놓으면 경고 후 무시되고 소스가 다시 마운트된다. 마우스 경로는 해당 없음 | 중첩 TreeLayout, 또는 `data-panel-id`를 렌더하는 다른 라이브러리. react-resizable-panels는 옛 메이저(2.1.7에서 확인)만 이 속성을 렌더하고 최신(4.x)은 렌더하지 않는다 |
| H-TOUCH-SESSION | 터치 드래그 세션이 모듈 전역이라, host와 remote가 라이브러리 사본을 공유하는지에 따라 중첩 동작이 달라진다 | `src/hooks/useTouchDrag.ts:45-46` `let session: DragSession \| null = null; const scheduler = createRafScheduler();`, `213` `if (session) return;` | 사본 공유: 안쪽 패널만 드래그된다. 사본 중복: 안쪽과 바깥이 각각 세션을 만들어 ghost가 2개 생긴다. 끝나지 않은 세션은 그 사본을 쓰는 모든 레이아웃의 터치 드래그를 새로고침 전까지 막는다 | 자체 사본을 번들한 중첩 remote와 공유 사본 twin |
| H-STYLE-FIRSTCOPY | Resizer CSS는 문서에 한 번만 주입된다. 라이브러리 사본이 둘이면 먼저 로드된 사본의 CSS가 모두에 적용된다 | `src/components/resizerStyles.ts:10` `const STYLE_MARKER = "data-ftl-styles";`, `26` ``if (!document.head.querySelector(`[${STYLE_MARKER}]`)) {`` | 버전이 다른 사본이 섞이면 나중 사본의 Resizer가 앞 사본의 스타일로 그려진다 | 자체 사본을 번들한 remote |
| H-STORE-LATE | `ComponentStore.register`/`unregister`는 렌더를 일으키지 않는다. 늦게 등록한 remote는 다른 이유로 레이아웃이 다시 렌더될 때에야 보인다 | `src/tree/componentStore.ts:13-18`은 `Map` 조작뿐이다. `src/components/PanelNodeRenderer.tsx:132-136`은 렌더 때마다 조회하고 미등록이면 `devWarn`. `doc/API.ko.md` ComponentStore 절이 "리렌더를 일으키지 않습니다"라고 문서화한다 | 늦게 등록한 패널은 첫 리사이즈나 드래그 전까지 비어 있다. 미등록 패널은 렌더마다 경고를 낸다(dev 빌드). 문서화된 동작이므로 버그보다 통합 가이드 후보다 | 등록을 늦추는 URL 플래그 |
| H-SHADOW-LAYOUT | shadow root 안에 렌더된 TreeLayout은 Resizer CSS, 터치 hit-test, ghost 스타일을 잃는다 | `src/components/resizerStyles.ts:25-32`는 `document.head`에만 주입한다. `src/components/Resizer.tsx:45-47`의 인라인 스타일은 폭·높이뿐이다. `src/hooks/useTouchDrag.ts:101`의 `document.elementFromPoint`는 가장 바깥 host를 돌려준다. `74`행은 ghost를 `document.body`에 붙인다 | Resizer가 보이지 않고 커서·`touch-action`이 없다. 터치 드래그 앤 드롭이 앵커를 못 찾는다. ghost에 스타일이 없다. 마우스 드래그 앤 드롭과 마우스 리사이즈는 동작한다 | shadow root 안에서 TreeLayout을 쓰는 custom element |

---

## 7. 사전 등록 문서 불일치: 핸들 모드 터치 시작 조건

가설 ID는 없다. 실행 전에 알고 있는 문서와 코드의 차이다.

- **문서**
  - `doc/API.ko.md:33` (`dragHandleSelector` 설명): "터치에서는 핸들(또는 패널)을 **롱프레스**(450ms)해 드래그 시작". `doc/API.md:33`도 같은 뜻이다.
  - `doc/API.ko.md:309`: "핸들(`dragHandleSelector`)을 누르거나, 핸들이 없으면 패널을 **롱프레스**(450ms)하면 드래그가 시작". 이 문장은 롱프레스가 핸들 없는 경우에만 필요하다고 적어 33행과 다르다.
- **코드**
  - `src/hooks/useTouchDrag.ts:234` — `armed: !!dragHandleSelector,` (핸들 모드는 처음부터 armed)
  - `src/hooks/useTouchDrag.ts:145-149` — `// 핸들 모드: threshold 넘으면 드래그 시작` / `if (dist > MOVE_THRESHOLD) { startDrag(touch.clientX, touch.clientY); e.preventDefault(); }`
  - `src/hooks/useTouchDrag.ts:246-250` — 롱프레스 타이머는 `if (!dragHandleSelector)`일 때만 건다
  - `src/hooks/useTouchDrag.ts:9` — `const MOVE_THRESHOLD = 8;`
- **실제 동작(코드 기준)**: 핸들 모드에서는 롱프레스가 필요 없다. 핸들에 손가락을 대고 **8 px 넘게 움직이면** 즉시 드래그가 시작된다. 움직이지 않고 누르고만 있으면 아무 일도 일어나지 않는다. 핸들 없는 모드에서는 450 ms 안에 8 px 넘게 움직이면 스크롤로 보고 세션을 끝낸다(`src/hooks/useTouchDrag.ts:140-143`).
- **하네스 오라클**: S7a, R13, R14의 핸들 터치 드래그는 코드 기준으로 판정한다. "롱프레스 없이, 8 px 넘는 이동에서 시작한다."
- **분류**: `spec-question` (docs), sev-4. S7a나 R13에서 코드 기준 동작이 확인되면 세션 2가 발견 1건으로 등록한다. ID는 그때 [../README.md](../README.md)의 ID 대장에서 받는다. 문서를 고칠지 코드를 고칠지는 사용자가 정한다.

---

## 8. 코드에 없다고 확인된 위험

의심할 만하지만 현재 소스에는 없는 것들이다. 시나리오를 만들지 않는다. 탐색(R18)에서 이쪽으로 시간을 쓰지 않는다.

| 의심 | 확인 결과 | 근거 |
|---|---|---|
| 라이브러리가 window/document에 이벤트 리스너를 걸어 remote와 충돌한다 | 없다. `addEventListener` 호출은 전부 요소 단위다. 전역에 닿는 것은 `document.body.style.userSelect`, `document.body.appendChild(ghost)`, `document.elementFromPoint`, `document.head`의 스타일 주입뿐이다 | `src/hooks/useDragResize.ts:60-62`(Resizer 요소), `src/hooks/useTouchDrag.ts:243-245`(touchstart 대상 노드), `src/hooks/useTouchDrag.ts:253`(패널 요소), `src/components/TreeLayout.tsx:149`(dragstart 대상 노드). 전역 접근: `src/hooks/useDragResize.ts:29-30`, `52`, `src/hooks/useTouchDrag.ts:74`, `101`, `src/components/resizerStyles.ts:25-32` |
| `useId` 값이 별도 React 루트나 React 18/19 사이에서 겹치거나 형식이 달라 오동작한다 | 영향 없다. 값은 `data-tree-root` 속성에 쓰이기만 하고 읽는 코드가 없다. 조회는 전부 속성 존재 여부만 본다. (아무도 값을 비교하지 않는다는 같은 사실이 H-NEST-SCOPE의 원인이기도 하다.) | `src/components/TreeLayout.tsx:61` `const instanceId = useId();`, `124` `data-tree-root={instanceId}`. 조회: `src/components/PanelNodeRenderer.tsx:77`, `92`의 `closest("[data-tree-root]")`, `src/dnd/dropTarget.ts:47`의 `hasAttribute("data-tree-root")` |
| 중첩 레이아웃에서 드롭 위치(가장자리·depth) 계산이 바깥 레이아웃까지 올라간다 | 아니다. 조상을 따라 올라가다 가장 가까운 `data-tree-root`에서 멈춘다 | `src/dnd/dropTarget.ts:45-55` — `if (cur.hasAttribute("data-tree-root")) { rootEl = cur; break; }` |
| 마우스 경로가 다른 트리의 패널을 앵커로 잡는다 | 아니다. 마우스 경로의 앵커는 항상 dragover를 처리하는 패널 자신의 id이고, 소스 id는 자신의 가장 가까운 루트에서 읽는다. 다른 트리의 앵커를 잡는 것은 터치 경로뿐이다(H-TOUCH-ANCHOR) | `src/components/PanelNodeRenderer.tsx:92-94`, `105` — `onDropPreviewChange?.({ sourcePanelId, anchorPanelId: node.id, position, depth });` |
| secure context가 아닌 origin에서 `crypto.randomUUID`가 없어 패널 id 생성이 깨진다 | 아니다. 없으면 카운터와 난수로 대체한다 | `src/hooks/useLayoutTree.ts:20-26` — `if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") { return crypto.randomUUID(); }` |
| `package.json`의 `sideEffects: false` 때문에 번들러가 Resizer 스타일 주입을 지운다 | 실제로는 남는다. 같은 모듈의 상수를 `Resizer.tsx`가 import하므로 모듈이 포함되고, 모듈 최상위의 주입 코드도 함께 실행된다. 번들러 동작에 대한 추론이며, 작성 시점의 로컬 `dist/index.js`에 `data-ftl-styles`가 들어 있는 것만 확인했다(`dist/`는 git에 없다) | `package.json:35` `"sideEffects": false,`, `src/components/Resizer.tsx:3-10`, `src/components/resizerStyles.ts:25-32` |

npm 0.5.1 주의: 첫 행은 0.5.1에는 해당하지 않는다. 0.5.1은 터치의 `touchmove`/`touchend`/`touchcancel`을 `document`에 걸고 루트의 React `onDragEnd`를 쓴다. 그래서 baseline(`http://127.0.0.1:4390`)이 양성 대조가 된다. (0.5.1 소스는 이 문서를 쓰면서 다시 열어 보지 않았다. `git show v0.5.1:src/hooks/useTouchDrag.ts`로 확인할 수 있고, 태그가 클론에 없으면 shell에 설치된 npm 0.5.1 패키지의 `dist/index.js`에서 `onDragEnd`와 `document.addEventListener`를 찾는다. 스파이크 S5가 실행으로 확인한다.)

---

## 9. 초기 예측에서 바로잡은 것

직관이나 초기 분석과 다른 지점이다. 시나리오를 쓰거나 결과를 읽을 때 다시 틀리기 쉽다.

| # | 틀리기 쉬운 생각 | 바로잡은 내용 |
|---|---|---|
| 1 | `census`에서 `p-d`를 `p-a` 왼쪽으로 끌면 소스 `p-d`도 리마운트된다 | `p-d`는 리마운트되지 않는다. 부모(루트 split)가 같고 key가 id다. 소스가 리마운트되는 것은 부모 split이 바뀌는 이동뿐이다 |
| 2 | hover에서 움직이는 것은 소스다 | hover에서 DOM 재삽입되는 것은 `p-a`다. `p-d`는 DOM도 움직이지 않는다. Esc에서는 반대로 `p-d`가 재삽입된다 |
| 3 | 커밋할 때 한 번 더 리마운트된다 | 커밋 시점에는 추가 리마운트가 없다. 커밋된 트리가 미리보기와 같은 구조다 |
| 4 | 리마운트는 드래그당 한 번이다 | 미리보기가 달라질 때마다, 그리고 취소할 때 다시 생긴다. 루트를 벗어났다 들어와도 생긴다 |
| 5 | 루트 padding이나 workspace 여백에서 놓으면 루트 `onDrop`이 실행된다 | `drop` 이벤트 자체가 없다. dragover를 취소하는 것은 패널뿐이다. 취소 경로다. stale 미리보기 커밋 확인은 패널 위에 드롭해야 한다 |
| 6 | Chromium이 분리된 소스에 `dragend`를 보내는지 알 수 없다 | Blink 소스상 보낸다. CDP의 `drop`과 `dragCancel` 경로도 같은 함수를 거친다. 실행 확인은 S3가 한다. 걱정할 엔진은 Firefox다(bug 460801, NEW) |
| 7 | Safari/WebKit은 dragleave의 `relatedTarget`이 항상 null이라 미리보기가 깜빡인다 | WebKit bug 66547은 2026-03에 수정됐다(https://bugs.webkit.org/show_bug.cgi?id=66547). 옛 Safari 빌드에만 해당한다 |
| 8 | 두 프레임 settle 뒤에는 stale 미리보기가 거의 없다 | 릴리스 순간 커서 아래가 소스 shadow 패널일 때만 참이다. 결정 변수는 settle 시간이 아니라 커서 아래 대상이다 |
| 9 | 정지한 커서에도 dragover가 주기적으로 온다 | 실제 브라우저는 약 350 ms마다 보내지만 Playwright(CDP)는 `mouse.move` 때만 보낸다. `mouse.up`은 dragover + drop + dragend를 연달아 보낸다 |
| 10 | Linux Chromium에서는 터치로 네이티브 드래그가 시작되지 않는다 | Chromium 141까지만 참이다. 153은 Linux·Windows에서도 켜져 있다(H-TOUCH-NATIVE-RACE) |
| 11 | react-resizable-panels를 쓰는 remote는 터치 앵커를 오염시킨다 | `data-panel-id`를 렌더하는 것은 옛 메이저뿐이다(2.1.7 확인). 최신 4.x는 렌더하지 않는다 |
| 12 | 커서가 iframe에 들어가면 루트 `onDragLeave`가 미리보기를 지운다 | `relatedTarget`이 루트 안의 iframe 요소이므로 지우지 않을 것으로 본다. 미리보기는 멈춘 채 남는다(추론, R12에서 확인) |
| 13 | shadow DOM 내용이면 종료 이벤트를 항상 잃는다 | custom element가 disconnect 때 shadow 내용을 정리하는 경우에만 잃는다(H-SHADOW-END) |
| 14 | same-site iframe으로 프로세스 밖 iframe을 시험할 수 있다 | 포트만 다른 origin은 같은 site라 같은 렌더러 프로세스다. cross-site는 `127.0.0.1` 대 `localhost`로 만든다 |

---

## 10. 가설 ID가 없는 참고 사항

탐색(R18)에서 마주칠 수 있는 것들이다. 관측되면 재현 스펙을 먼저 만들고 귀속 사다리를 적용한다.

| 내용 | 근거 | 비고 |
|---|---|---|
| Resizer 위에서 패널 드래그를 놓으면 취소된다 | Resizer에는 `onPointerDown`만 있고(`src/components/Resizer.tsx:56`) split div와 루트에도 `onDragOver`가 없다. 9절 5번과 같은 이유다 | 이 문서를 쓰면서 코드 리딩으로 추가했다(미실행). 관측되면 UX 저하(sev-3) 후보 |
| 배포 번들에 `process.env.NODE_ENV`가 그대로 남아, 번들러 없이 로드하면 `devWarn` 실행 시 `ReferenceError`가 난다 | `src/utils/devWarn.ts:2` `if (process.env.NODE_ENV !== "production") {` | 랩은 소스 alias라 해당 없음. P1의 packed-tarball 확인 대상 |
| 렌더러에 메모이제이션이 없어 리사이즈·드래그 프레임마다 전체가 다시 렌더된다. store의 엘리먼트가 안정적이면 React가 건너뛴다 | `src/`에 `React.memo` 없음(`grep` 0건) | 랩은 store를 모듈 스코프에서 한 번 만든다 |
| same-tree remote가 `body`에 포털로 띄운 UI 안의 드래그 이벤트가 React 트리를 따라 패널 핸들러에 닿는다 | `src/components/PanelNodeRenderer.tsx:144-147`이 React 핸들러다 | Tier 1 remote에는 포털 UI가 없다 |
| Firefox / WebKit, 실기기 터치, OS 커서 모양 | 9절 6·7번 | run 01 범위 밖. REPORT.md의 `env-limit` 수동 확인 목록 |

---

## Amendments

(실행 뒤 이 문서를 바꿀 때 날짜, 바꾼 사람/세션, 내용을 여기에 적는다. 예측 문구 자체는 고치지 않는다.)
