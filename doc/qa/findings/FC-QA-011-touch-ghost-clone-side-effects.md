---
id: FC-QA-011
title: 터치 ghost가 소스 패널을 통째로 복제해 iframe 문서를 한 번 더 로드하고, 테마 토큰·canvas·스크롤 위치를 잃은 사본을 보여 준다
severity: sev-3
class: spec-question
status: needs-user-confirmation
confidence: high
repro_rate: 2/2
found_in: run01-tier1
variants: [control-a, orders, billing, telemetry, control-iframe]
input: touch-cdp-handle
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: H-GHOST-CLONE
harness_amplified: false
decision_ref: none
root_cause_group: touch-ghost-clone
blocked_by: none
dup_of: none
repro_spec: mfa-lab/e2e/regression/fc-qa-011-touch-ghost-clone-side-effects.spec.ts
fix_commit: none
---

# FC-QA-011 터치 ghost가 소스 패널을 통째로 복제해 iframe 문서를 한 번 더 로드하고, 테마 토큰·canvas·스크롤 위치를 잃은 사본을 보여 준다

## 전제

- 레이아웃과 URL: http://127.0.0.1:4300/?layout=pair&a=<slot>&b=control-b, touch 프로젝트(CDP 터치 에뮬레이션, headless; 실기기 아님)
- 시작 트리 `H[p-a,p-b]`, 소스 슬롯: control-a / orders / billing / telemetry / control-iframe(사다리)
- 라이브러리: src, MF on

## 절차

1. 내용 상태를 심는다(`seedContent`).
2. `p-a` 핸들에서 `touchStart` → 12px(·24px) `touchMove` → ghost 생성 직후 스냅샷·ghost 요소 스크린샷 → 500 ms 유지 → `dropPoint(p-b, right, 0)`로 이동 → `touchEnd`.

## 기대(오라클)

- 기대 동작: 드래그 시작은 내용에 부작용이 없다. ghost 1개, 끝나면 없음. 커밋 `H[p-b,p-a]`.
- 근거: **가정** + `doc/API.ko.md` "드래그 앤 드롭"(반투명 ghost가 손가락을 따라간다). 오라클이 가정뿐이라 README 6절 4번에 따라 `spec-question`, `status: needs-user-confirmation`. **권고: library-bug**(HYPOTHESES.md의 기본 분류 `library-bug 후보`와 다르게 분류한 이유는 오라클 부재).

## 실제

| 소스 | ghost | 테마 토큰(`--hb-fg`/`--hb-bg`) | 그 밖 | 커밋 |
|---|---|---|---|---|
| control-a ×2 | 1개, opacity 0.7, 624x736 | ghost `""/""` vs 원본 `#1f2328/#ffffff` | 0→500 ms 구간 카운터 변화 없음 | `H[p-b,p-a]`, `onMovePanel` 1건 |
| orders ×2 | 같다 | 유실 | content +0 | 같다 |
| billing ×2 | 같다 | 유실 | **ghost 안 `billing-canvas`가 빈 캔버스**(원본은 그림 있음) | 같다 |
| telemetry ×2 | `iframeCount 1` | 유실 | **ghost 생성 직후 mirror `loads` 1→2, 새 `docId`, `:4304` 문서 요청 1→2**(ghost의 iframe이 문서를 다시 로드). 미리보기에서 소스 재삽입으로 실제 iframe도 재로드(→3, D3b) | 같다 |
| control-iframe ×2 (사다리) | `iframeCount 1` | 유실 | mirror `loads` 1→2(ghost), →3(미리보기 재삽입). srcdoc이라 네트워크 요청은 없음 | 같다 |

- ghost 요소 스크린샷: 목록이 맨 위(`invoice 0`)부터 보인다 — 원본은 스크롤돼 있다(`cloneNode`는 `scrollTop`을 복제하지 않는다).
- 신뢰된 `dragstart` 없음(핸들 모드), ghost는 커밋 뒤 제거(I3 통과), `touchend`는 연결된 원본에, I1~I7 통과.
- 카운터 오염: ghost의 iframe 문서도 같은 slot으로 `mfe:loaded`를 보내 mirror 카운터를 올린다(관찰 그대로 기록. 프레임 안 sessionStorage 카운터도 같은 키라 다음 재로드에서 2 뛰는 것으로 예측됨).
- 심각도: 시각적 결함 + iframe remote에 추가 요청·초기화 스크립트 실행(분석 이벤트 중복 등). 데이터 손실 없음 → sev-3.
- 실행별 결과: 1회차·2회차 같은 값.

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-011/` (R13-telemetry-run1은 `R13t-`, R13-billing-run1은 `R13b-` 접두어).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| R13b-02-ghost-0-el.png | billing ghost: canvas가 비어 있고(막대는 반투명 ghost 아래 원본이 비친 것), 목록이 `invoice 0`부터(스크롤 위치 유실) |
| R13t-02-ghost-0-el.png | telemetry ghost: iframe을 품은 복제본 |
| R13t-events.json, R13b-events.json | 터치 이벤트 순서 |

## 추정 원인

- `src/hooks/useTouchDrag.ts:60-74` — ghost는 소스 패널 요소를 `cloneNode(true)`로 복제해 `document.body`에 붙인다. 복제된 `<iframe>`은 새 문서를 로드하고, `<canvas>` 비트맵·`scrollTop`·폼 상태 일부는 복제되지 않으며, `body` 바로 아래라 `[data-theme]` 조상의 CSS 변수를 상속받지 못한다.

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | 깨끗한 컨텍스트 2회 × 5소스 | 2/2 |
| 2 대조 교체 | `control-iframe`(same-origin srcdoc) | 같은 재로드 → 컨테이너 고유(iframe을 복제하면 생김) |
| 3 입력·릴리스 교체 | 마우스(HTML5 DnD)에는 ghost DOM이 없다 | 터치 경로 전용 |
| 4 하네스 점검 | ghost는 `body > [style*="z-index: 9999"]`로만 읽음(부작용 #8) | 하네스 아님 |
| 5 픽스처 점검 | control 패널에서도 토큰 유실 | 픽스처 무관 |
| 6 프로브 끄고 재실행 | 회귀 스펙은 mirror 카운터만 본다 | 재현 |
| 7 오라클 | 가정 | `needs-user-confirmation` |

## 관련

- 시나리오: R13(관찰 기록 `doc/qa/run01-tier1/obs/R13-*-run{1,2}.json`), R14 02-mid(ghost가 리마운트 전 상태 `count 3`을 보여 줌), R18 #105(소스 telemetry loads +2).
- 가설: H-GHOST-CLONE
