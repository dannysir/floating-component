---
id: FC-QA-010
title: 경계선 드래그의 최소·최대 한계가 설정 px과 다르다 (자식 3개 split에서 상한이 약 2/3, 바깥으로 끌면 패널이 줄어듦)
severity: sev-3
class: library-bug
status: open
confidence: high
repro_rate: 2/2
found_in: run01-tier1
variants: [row3-size, pair-size, census-vsize]
input: mouse
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: H-SIZING
harness_amplified: false
decision_ref: none
root_cause_group: resize-flex-conversion
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-010-resize-limit-px-mismatch.spec.ts
fix_commit: none
---

# FC-QA-010 경계선 드래그의 최소·최대 한계가 설정 px과 다르다 (자식 3개 split에서 상한이 약 2/3, 바깥으로 끌면 패널이 줄어듦)

## 전제

- 레이아웃: `persist=1`로 주입한 트리(control 패널). 뷰포트 1280x800(루트 폭 1256), 800x600
  - `row3-size`: `H[p-a(minWidth 200, maxWidth 400), p-b, p-c(minWidth 150)]`, flex 1:1:1
  - `pair-size`: `H[p-a(minWidth 200, maxWidth 400), p-b]`
  - `census-vsize`: census 트리의 `p-b`에 `minHeight 120, maxHeight 300` (`V[p-b,p-c]` 안)
- 라이브러리: src

## 절차

1. 주입 트리를 `?layout=<l>&persist=1`로 연다.
2. `resizeBorder({ between: ['p-a','p-b'], delta: +400, steps: 20 })`, 이어서 `-600`, `+50`(세로는 `['p-b','p-c']`로 `+300`, `-500`, `+50`). 각 단계 뒤 폭(높이).
3. 하한 상태에서 창을 800x600으로 바꾼 뒤 `+300`, 다시 1280x800.

## 기대(오라클)

- 기대 동작: 상한 400·하한 200(세로 300·120)이 창 크기 변경(CSS)과 경계선 드래그에서 같은 px로 지켜진다(오차 3px).
- 근거: `doc/API.ko.md` "패널 크기 제약" 둘째 항목("윈도우/컨테이너 리사이즈(CSS)와 경계선 드래그(`resizeBorder`)에서 동일한 px로 일관되게 보장").

## 실제

| 트리 (1280) | 시작 | `+400`(바깥으로) | `-600` | `+50` | 상한 오차 |
|---|---|---|---|---|---|
| row3-size ×2 | p-a 400px(CSS max) | **263.3px**(줄어듦, flex 1 → 0.637) | 200px(flex 0.318, CSS min에 걸림) | **200px(따라오지 않음)**, flex 0.438 | **-136.7px** |
| pair-size ×2 | 400 | 397.5 | 200 | 248.4 | -2.5 |
| census-vsize ×2 (세로) | 300 | 296.7 | 120 | 168.2 | **-3.3** |

| 트리 (800x600, 하한에서 시작) | 창 변경 뒤 | 800에서 `+300` | 상한 오차 | 1280 복귀 |
|---|---|---|---|---|
| row3-size | 200(CSS 하한 정확, p-c 208.8) | 261.2 | **-138.8** | 400 |
| pair-size | 200 | 395.9 | **-4.1** | 400 |
| census-vsize | 120 | 295.5 | **-4.5** | 300 |

- 가장 큰 증상(row3): 이미 CSS 상한(400px)에 있는 패널의 경계선을 **바깥으로** 끌면 패널이 263px로 **줄어든다**. 사용자 눈에는 경계선이 커서 반대 방향으로 튄다.
- 하한 지연(row3): 상태 flex가 CSS 하한(200px) 아래(0.318)로 내려가 화면은 200에 멈췄다가, `+50`을 끌어도 경계선이 움직이지 않는다(상태가 200px 상당으로 올라올 때까지).
- 자식 2개 split의 상한은 2.5~4.5px 모자란다(Resizer 두께 포함 환산). 3px을 넘는 경우가 있다.
- 창 크기 변경(CSS)은 하한을 정확히 지킨다 → 두 경로의 px가 다르다.
- 실행별 결과: 1회차·2회차 같은 값.
- 심각도: 레이아웃 조작이 의도와 반대로 움직이지만 데이터 손실·고착은 없다 → sev-3(분류 기본값).

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-010/` (R19-size-1280-row3-size-run1에서 `promote`).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| 01-before.png | 시작: p-a 400px(1/3보다 작은 CSS 상한) |
| 03-after.png / tree-after.json | `+400 → -600 → +50` 뒤 p-a 200px, 트리 flex `p-a 0.438` |
| events.json | 리사이즈 3회의 포인터 이벤트 |

## 추정 원인

- `src/tree/resize.ts:15-25` — `toFlex = (px / totalPixels) * totalSize`에서 `totalSize`는 **인접 두 자식의 flex 합**(`left.size + right.size`)인데 `totalPixels`는 **split 전체 px**(`LayoutNodeRenderer.tsx:61-66`의 `rect.width`)다. 자식이 3개면 px 한계가 `2/3`로 축소된다(row3: 400 → 약 267).
- 같은 환산에 Resizer 두께(8px × 개수)가 섞여 자식 2개에서도 수 px 모자란다(`src/components/resizerConstants.ts:1`).
- `src/tree/resize.ts:27-35` — 현재 `size`가 이미 한계 밖(CSS가 잘라낸 상태)이어도 그대로 clamp해 첫 이동에서 한계값으로 점프한다(바깥으로 끄는데 줄어듦). 하한 쪽은 CSS `min-width`(`src/components/panelSizeStyle.ts:23-24`)가 화면을 지키는 동안 상태가 그 아래로 내려가 지연이 생긴다.

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 × 3트리 × 2뷰포트 | 2/2, 같은 값 |
| 2 대조 교체 | 자식 2개(pair)·세로(census-vsize) | 크기만 다르고 같은 방향의 오차 → 환산 공식 |
| 3 입력·릴리스 교체 | 창 크기 변경(CSS) | CSS 경로는 정확 → 경계선 드래그 경로만 |
| 4 하네스 점검 | `resizeBorder`는 Resizer 중앙에서 포인터 이동, S6 기준선과 같은 이벤트 | 하네스 아님 |
| 5 픽스처 점검 | control 패널만 | 픽스처 무관 |
| 6 프로브 끄고 재실행 | 회귀 스펙은 프로브 기록을 쓰지 않는다 | 재현 |
| 7 오라클 | `doc/API.ko.md` "패널 크기 제약" | 있음 |

## 관련

- 시나리오: R19, 관찰 기록: doc/qa/run01-tier1/obs/R19-size-1280-{row3-size,pair-size,census-vsize}-run{1,2}.json, R19-size-800-*-run{1,2}.json
- `doc/TODO.md` "남은 검증 — 패널 크기 제약 (0.4.0)": 경계선 드래그 쪽이 성립하지 않음
- R17·R16의 `orders|board` 리사이즈(+116.8/120)도 같은 Resizer 두께 환산의 흔적
