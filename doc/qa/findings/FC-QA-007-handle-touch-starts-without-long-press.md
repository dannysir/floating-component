---
id: FC-QA-007
title: 핸들 모드 터치 드래그가 문서와 달리 롱프레스 없이 8px 이동만으로 시작된다
severity: sev-4
class: spec-question
status: needs-user-confirmation
confidence: high
repro_rate: 2/2
found_in: run01-tier1
variants: [control-a, control-b]
input: touch-cdp-handle
browser: chromium-153 headless-shell
playwright: 1.63.0
native_touch_drag: on
library_tree: c1da6c9dc03a4811eea42c220be309e5e73b0a4a
library_commit: ea25ff7
hypothesis: none
harness_amplified: false
decision_ref: none
root_cause_group: docs-touch-handle-start
blocked_by: none
dup_of: none
repro_spec: none
fix_commit: none
---

# FC-QA-007 핸들 모드 터치 드래그가 문서와 달리 롱프레스 없이 8px 이동만으로 시작된다

## 전제

- 레이아웃과 URL: http://127.0.0.1:4300/?layout=locks (그리고 `?layout=pair`, `?layout=row3`)
- 플래그: drag=handle(기본, `dragHandleSelector` 지정) / touch 프로젝트(CDP 터치 에뮬레이션, `hasTouch`)
- 라이브러리: src

## 절차

1. 패널 핸들 위에서 `touchStart`.
2. 기다리지 않고(롱프레스 없음) 12px, 24px로 `touchMove`.

## 기대(오라클)

- 문서: `doc/API.ko.md:33` `dragHandleSelector` — "터치에서는 핸들(또는 패널)을 **롱프레스**(450ms)해 드래그 시작". `README.ko.md:18`도 "핸들 또는 롱프레스(450ms)로 시작"이라 해석이 갈린다. `doc/API.ko.md:309`는 "핸들을 누르거나, 핸들이 없으면 패널을 롱프레스".
- 어느 쪽이 의도인지 문서끼리 일치하지 않는다 → `spec-question`(docs).

## 실제

- 핸들 모드에서는 대기 없이 8px(`MOVE_THRESHOLD`)를 넘는 첫 `touchmove`에서 드래그가 시작된다. ghost 1개(opacity 0.7). 롱프레스 타이머는 쓰이지 않는다.
- 관찰: S7a(세션 1·이번 세션 재실행 2회), R12 터치 사다리 6회, R14 2회 모두 같다. 12px 이동 뒤에는 ghost 0개(Chromium touch slop이 첫 touchmove를 억제, HARNESS 부작용 #18), 24px 이동에서 ghost 1개.
- 결함 여부: 코드 주석과 구현은 일관되게 "핸들 모드는 임계값 이동으로 시작"이다. 문서 33행만 롱프레스라고 한다.

## 증거

경로 `doc/qa/run01-tier1/evidence/FC-QA-007/` (R14-run1에서 복사).

| 파일 | 무엇을 보여 주는가 |
|---|---|
| R14-02-mid.png | 롱프레스 없이 시작된 터치 드래그의 ghost(잠긴 nav 위라 빨간 테두리·opacity 0.4) |
| R14-events.json | `touchstart` 직후 대기 없이 `touchmove`, 그 뒤 ghost 생성(관찰 JSON `obs/R14-blocked-run1.json`의 `extra.ghosts`) |

## 추정 원인

- `src/hooks/useTouchDrag.ts:145-149` — 핸들 모드(`session.armed`, 234행 `armed: !!dragHandleSelector`)는 `dist > MOVE_THRESHOLD`(9행, 8px)에서 `startDrag`. 롱프레스(450ms)는 비핸들 모드 전용.
- 문서(`doc/API.ko.md:33`, `doc/API.md:33`)가 구현과 다르다.

## 대조 실험

| 단계 | 한 것 | 결과 |
|---|---|---|
| 1 재현 | S7a·R12·R14 | 매번 같다 |
| 2~6 | 해당 없음(문서와 코드의 불일치) | — |
| 7 오라클 | 문서끼리 불일치 | `needs-user-confirmation`: 문서를 고칠지 코드를 고칠지 사용자 결정 |

## 관련

- 시나리오: S7a, R12(터치 사다리), R14. 관찰 기록: doc/qa/run01-tier1/obs/R14-blocked-run{1,2}.json, R12-touch-*-run{1,2}.json
- REPORT.md 7절(`doc/TODO.md` 대응표·문서 불일치), 5절 "사용자 결정 대기"
