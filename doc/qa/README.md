# doc/qa — 실입력 검수 기록과 판정 규칙

> **이 문서는**
> - `doc/qa/`의 입구다. 검수가 어떤 순서로 진행되는지, 어떤 문서가 어디에 있는지, 발견을 어떻게 판정하고 기록하는지를 정한다.
> - 읽는 사람: 클라우드 세션의 Claude(구축·검수·수정 모두 작업 전에 읽는다)와 사용자.
> - 의존: 픽스처 설계는 [mfa/ARCHITECTURE.md](./mfa/ARCHITECTURE.md), 하네스는 [mfa/HARNESS.md](./mfa/HARNESS.md), 작업 지시는 [mfa/BRIEF-1-build.md](./mfa/BRIEF-1-build.md)와 [mfa/BRIEF-2-inspect.md](./mfa/BRIEF-2-inspect.md)가 기준이다. 이 문서는 그 내용을 반복하지 않고 링크한다.
> - 상태(2026-10-02): 이 디렉터리의 절차·레시피·예측은 전부 **미실행**이다. 브라우저에서 실행해 확인한 것은 아직 없다.

---

## 1. 목적과 진행 순서

대상은 이 저장소의 라이브러리 `@dannysir/floating-components`(`src/`)다. VS Code 스타일 트리 기반 패널 레이아웃이고, 패널 이동은 HTML5 드래그 앤 드롭(터치는 별도 경로), 경계선 리사이즈는 Pointer Events로 동작한다.

목표는 세 가지다.

1. 마이크로 프론트엔드(MFA) 환경을 이 저장소 안에 처음부터 만든다 (`mfa-lab/`).
2. 실제 브라우저에서 **실제 입력**(마우스 드래그, 경계선 리사이즈, 터치)으로 라이브러리를 검수한다.
3. 문제 1건당 문서 1개로 남기고, 이후 하나씩 고친다.

실제 입력을 고집하는 이유: 2026-10-01 검증에서 합성 이벤트를 실제 브라우저와 다른 노드에 dispatch해 버그 하나가 가려졌다 ([doc/TODO.md](../TODO.md) "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실").

| 단계 | 누가 | 하는 일 | 산출물 | 지시서 |
|---|---|---|---|---|
| 0. 문서 | 로컬 세션 (완료) | 문서만 작성. 픽스처 코드는 만들지 않음 | `doc/qa/` 문서, FC-QA-001 선등록 | — |
| 1. 구축 | 클라우드 세션 1 | `mfa-lab/` 구축, 하네스 스파이크(run 00) | `mfa-lab/`, `run00-spike/SPIKE.md`(GO 권고 포함) | [BRIEF-1](./mfa/BRIEF-1-build.md) |
| (사이) | 사용자 | SPIKE.md를 읽고 GO 결정, 작업 브랜치를 PR로 `qa/mfa-lab`에 머지 | 검수 프롬프트의 GO 한 줄 | [PROMPTS.md](./mfa/PROMPTS.md) |
| 2. 검수 | 클라우드 세션 2 | run 01: 시나리오 R01~R19 실행, 발견 기록 | `run01-tier1/REPORT.md`, `findings/`, 증거, 회귀 스펙 | [BRIEF-2](./mfa/BRIEF-2-inspect.md) |
| 3. 수정 | 이후 세션 (클라우드 또는 사용자 PC) | 발견을 1건씩 수정 | 수정 커밋, 발견 상태 갱신 | [FIXING.md](./FIXING.md) |

- 한 단계가 한 세션에 끝나지 않을 수 있다. 같은 프롬프트로 이어서 한다. 진행 상태의 유일한 기준은 [mfa/STATE.md](./mfa/STATE.md)다.
- 세션 1·2는 `src/`를 수정하지 않는다. 라이브러리 수정은 3단계에서만 한다.
- 세션을 시작하는 프롬프트와 사용자가 직접 하는 일은 [mfa/PROMPTS.md](./mfa/PROMPTS.md)에 있다.

---

## 2. 문서 지도

| 경로 | 한 줄 설명 | 쓰는 시점 |
|---|---|---|
| `doc/qa/README.md` | 이 문서. 절차, 심각도, 분류, 신뢰 규칙, 귀속 사다리, 결정 로그, ID 대장 | 로컬 (ID 대장은 발견이 생길 때마다 갱신) |
| [TEMPLATE-finding.md](./TEMPLATE-finding.md) | 발견 1건 양식 (front matter + 절) | 로컬 |
| [TEMPLATE-report.md](./TEMPLATE-report.md) | run의 `REPORT.md` 양식 (커버리지 표, 수정 대기열 등) | 로컬 |
| [FIXING.md](./FIXING.md) | 발견을 하나씩 고치는 절차 | 로컬 |
| `doc/qa/findings/FC-QA-NNN-<slug>.md` | 발견 1건당 파일 1개. 전체 run 공용 | FC-QA-001은 로컬(상태 `predicted`), 나머지는 세션 2 |
| [mfa/ARCHITECTURE.md](./mfa/ARCHITECTURE.md) | 픽스처 설계: 제품(Harbor Workbench), 앱, 레지스트리, 통합 계약, 계측, 포트, 실행 모델(`ctl.mjs`) | 로컬, 세션 1이 실제 구축 내용으로 갱신 |
| [mfa/RECIPES.md](./mfa/RECIPES.md) | 설정 파일 전문과 코드 골격(미실행 표시), 출처 URL | 로컬, 세션 1이 `실행 확인: <commit>` 표시 |
| [mfa/HYPOTHESES.md](./mfa/HYPOTHESES.md) | 가설(H-*) 목록: 메커니즘, `src` 파일:줄, 예측, 오라클, 기본 분류 | 로컬 |
| [mfa/HARNESS.md](./mfa/HARNESS.md) | 브라우저 레인, Playwright 설정, 헬퍼, 프로브, 불변식 I1~I7, stale preview 판정 규칙, 알려진 하네스 부작용, 증거 규칙 | 로컬, 세션 1이 갱신 |
| [mfa/BRIEF-1-build.md](./mfa/BRIEF-1-build.md) | 세션 1 작업 지시서: 단계 B1-00~B1-08, 게이트, 스파이크 S0~S10, GO 기준, 중단 조건 | 로컬 |
| [mfa/BRIEF-2-inspect.md](./mfa/BRIEF-2-inspect.md) | 세션 2 작업 지시서: 사전 점검, 시나리오 표, 사전 등록한 기대·예측 표, 반복 절차, 분류 기본값 | 로컬 (변경은 날짜 붙은 Amendments 절에만) |
| [mfa/STATE.md](./mfa/STATE.md) | 체크포인트 대장. 세션이 끊겨도 여기서 이어감 | 모든 세션이 단계마다 갱신 |
| [mfa/PROMPTS.md](./mfa/PROMPTS.md) | 세션 시작 프롬프트 3종(구축·검수·수정), 사용자가 직접 하는 일 | 로컬 |
| `doc/qa/run00-spike/SPIKE.md` | 하네스 스파이크 결과, 이벤트 로그 기준선, GO/NO-GO 권고 | 세션 1 |
| `doc/qa/run01-tier1/REPORT.md` | run 01 결과: 커버리지 표, 발견 목록, 수정 대기열 | 세션 2 |
| `doc/qa/BLOCKED.md` | 중단 조건이 발동했을 때만 생기는 보고서 | 중단한 세션 |
| `mfa-lab/README.md` | 랩 실행 방법(클라우드·Windows). 실제 구축 뒤의 명령 기준 | 세션 1 (B1-08) |

---

## 3. 디렉터리 규칙

```
doc/qa/
  README.md  TEMPLATE-finding.md  TEMPLATE-report.md  FIXING.md
  BLOCKED.md                         중단 조건이 발동했을 때만 존재
  findings/FC-QA-NNN-<slug>.md       발견 전체. run과 무관하게 이 디렉터리 하나
  mfa/                               설계·지시 문서 (2절 표)
  run00-spike/                       세션 1: env.json, SPIKE.md, evidence/
  run01-tier1/                       세션 2: env.json, REPORT.md, obs/, evidence/FC-QA-NNN/
mfa-lab/e2e/regression/fc-qa-NNN-<slug>.spec.ts   발견별 회귀 스펙
```

- **run 디렉터리**: `runNN-<이름>`. `run00-spike`는 하네스 스파이크, `run01-tier1`은 1차 검수다. 다음 run은 `run02-<이름>`으로 만든다 (2차 범위, 수정 후 재검증 등).
- **발견은 run 아래에 두지 않는다.** 전부 `doc/qa/findings/`에 두고, 어느 run에서 나왔는지는 front matter `found_in`에 적는다.
- **증거는 run 아래에 둔다.** `doc/qa/<run>/evidence/FC-QA-NNN/`. 선별한 파일만 커밋한다. 원본은 `mfa-lab/e2e/.artifacts/`에 남고 git에서 무시된다.
- **관찰 기록**: 시나리오마다 `doc/qa/<run>/obs/<시나리오 ID>.json` (기대·예측·관찰·판정). 형식은 [HARNESS.md](./mfa/HARNESS.md) "증거와 라벨".
- **회귀 스펙**: `mfa-lab/e2e/regression/fc-qa-NNN-<slug>.spec.ts`. 파일 이름의 ID는 소문자, slug는 발견 파일과 같다.
- **slug**: 영어 소문자 kebab-case로 증상을 쓴다 (예: `preview-remount-non-dragged-panels`).
- **커밋하지 않는 것**: `mfa-lab/.run/`, `mfa-lab/e2e/.artifacts/`, `mfa-lab/e2e/test-results/`, `mfa-lab/**/dist-*/`, `node_modules/`, `dist/` (모두 `.gitignore`에 있음). 트레이스와 비디오는 커밋하지 않는다.
- **변경 범위**: 세션 1·2가 바꿀 수 있는 곳은 `mfa-lab/`, `doc/qa/`, `.gitignore`뿐이다. `src/`, 루트 `package.json`, 루트 `package-lock.json`, 루트 `tsconfig.json`, 루트 `vite.config.ts`는 랩 작업으로 바꾸지 않는다.
- **BLOCKED.md**: 중단 조건이 해소되어 막혔던 단계의 게이트를 통과하면, 통과한 세션이 그 커밋에서 삭제한다 (이력은 git에 남는다). 브리프가 다르게 정하면 브리프를 따른다.
- **커밋 위생**: 경로를 명시해서 스테이징한다 (`git add -A` 금지). 커밋 전에 `git status --short`와 `git diff --cached --stat`을 확인한다.

---

## 4. 심각도

class(5절)와 무관하게 "이 증상이 실제 사용자에게 일어난다면"의 영향으로 매긴다. 스파이크 ID(`S0`~`S10`)와 헷갈리지 않도록 심각도는 항상 `sev-N`으로 쓴다.

| 값 | 기준 | 예 (가상, 관찰 결과 아님) |
|---|---|---|
| `sev-1` | UI가 멈추거나 상태를 잃어 새로고침해야 복구됨 | 드래그 취소 뒤 미리보기와 `data-dragging-panel-id`가 남아 다음 드래그가 안 됨. 터치 세션이 해제되지 않아 이후 터치 드래그가 전부 막힘 |
| `sev-2` | 결과가 틀림 (의도하지 않은 이동이 커밋됨, remote의 기능이 깨짐) | 놓지 않은 위치로 패널 이동이 커밋됨. remote 안의 카드 드래그가 패널 이동으로 처리됨 |
| `sev-3` | 동작은 맞지만 사용 경험이 나빠짐 | 미리보기가 깜빡임. 터치 ghost가 테마 스타일을 잃음 |
| `sev-4` | 외형 또는 문서 문제 | 문서 설명과 코드 동작이 다름 |

경계가 애매하면 높은 쪽으로 매기고 이유를 "실제" 절에 적는다.

---

## 5. 분류 (class)

| class | 정의 | 판정 기준 | 예 | 후속 |
|---|---|---|---|---|
| `library-bug` | 라이브러리(`src/`)의 결함 | 오라클이 있고, 대조 사다리(7절)에서 `bare`/`control` 또는 컨테이너 대조군까지 내려가도 재현됨 | 미리보기 때문에 드래그하지 않은 패널이 리마운트됨 (FC-QA-001, 상태 `predicted`. 근거 [LayoutNodeRenderer.tsx:92](../../src/components/LayoutNodeRenderer.tsx)의 `split-${i}` 키) | 수정 대기열 → [FIXING.md](./FIXING.md) |
| `fixture-bug` | `mfa-lab/`의 앱·어댑터·설정 결함 | 대조군은 깨끗하고 특정 remote에서만 재현되거나, remote 단독 페이지에서도 재현됨 | host의 mount 어댑터가 cleanup 뒤에 도착한 모듈로 mount를 호출함 (`lateResolves > 0`) | 세션이 `mfa-lab/`에서 고치고 REPORT.md에 기록 |
| `harness-artifact` | Playwright·CDP 입력 방식 때문에 생긴 현상. 실제 사용자에게는 일어나지 않음 | 이벤트 순서가 스파이크 기준선과 다르거나, 9절의 알려진 부작용에만 의존함 | Esc 취소 때 대상 패널에 `dragleave`가 오지 않음 | 새로운 것이면 [HARNESS.md](./mfa/HARNESS.md) "알려진 하네스 부작용"에 추가 |
| `spec-question` | 관찰은 확실하지만 무엇이 옳은 동작인지 근거(오라클)가 없음 | 기대의 근거가 "가정"뿐임 | 핸들 모드 터치 시작 조건: [API.ko.md](../API.ko.md) 33행은 롱프레스(450ms)라고 하는데, 코드([useTouchDrag.ts:145-149, 234, 246-250](../../src/hooks/useTouchDrag.ts))는 롱프레스 없이 8px 넘는 이동으로 시작함 | 사용자 결정 대기 (상태 `needs-user-confirmation`) |
| `env-limit` | 이 환경에서는 확인할 수 없음 | 관찰 수단이 없음 | OS 커서 모양(`not-allowed`), 실기기 터치, Firefox/WebKit | REPORT.md "환경 한계와 수동 확인" |

- 가설별 기본 분류는 [HYPOTHESES.md](./mfa/HYPOTHESES.md), 검수 중 적용하는 기본값은 [BRIEF-2](./mfa/BRIEF-2-inspect.md) "분류 기본값"이 기준이다.
- **통합 가이드는 class가 아니다.** "iframe 내용 안에서는 드래그를 시작할 수 없다"처럼 버그가 아니라 사용법으로 안내할 내용은 발견 파일을 만들지 않고 REPORT.md "통합 가이드 후보"에 적는다 (결정 D4).
- 9절에 이미 있는 하네스 부작용과 일치하는 관찰은 발견 파일을 만들지 않는다. 관찰 기록(`obs/`)에 라벨만 남긴다.
- 회귀 스펙은 `library-bug`와, 후보 오라클을 적을 수 있는 `spec-question`에 만든다. 나머지 class는 `repro_spec: none`.

---

## 6. 신뢰 규칙

AI가 보고한 발견을 믿을 수 있게 하는 규칙이다. 하나라도 빠지면 발견으로 올리지 않는다.

1. **깨끗한 컨텍스트에서 2회 재현한다.** 매번 새 브라우저 컨텍스트와 새 페이지 로드에서 시작한다. `repro_rate`를 `재현 횟수/시도 횟수`로 적는다 (예: `2/2`). 간헐적 재현(예: `1/3`)도 기록하되 `confidence: low`로 둔다.
2. **증거 묶음을 첨부한다.** 동작 전·중·후 PNG, `events.json`(프로브 이벤트 로그), `tree-before.json`/`tree-after.json`(스냅샷), `console.txt`, 카운터 변화. 발견당 이미지 최대 6장, 1280x800·배율 1, 가능하면 요소 스크린샷. JSON은 해당 동작 구간만 남긴다. 세부는 [HARNESS.md](./mfa/HARNESS.md) "증거와 라벨".
3. **스크린샷은 직접 열어서 본다.** Read 도구로 적어도 동작 중(mid) PNG를 열고 스냅샷 JSON과 대조한다. **스크린샷만으로는 발견을 판정하지 않는다.** 스냅샷만으로도 판정하지 않는다. 둘이 어긋나면 원인부터 찾는다.
4. **오라클을 적는다.** 기대 동작의 근거를 명시한다: API 문서의 절, `doc/TODO.md`, 사용자 결정(D1~D6), 또는 "가정". 근거가 "가정"뿐이면 `spec-question`이다.
5. **대조 실험을 한다.** 7절 귀속 사다리의 결과를 발견 파일 "대조 실험" 절에 표로 적는다.
6. **검수 중에는 `src/`를 수정하지 않는다.** 라이브러리 문제는 기록만 한다. 픽스처·하네스(`mfa-lab/`) 결함은 [BRIEF-2](./mfa/BRIEF-2-inspect.md) "범위와 금지"의 규칙대로 고치고 REPORT.md에 남긴다. `mfa-lab/`을 바꾼 뒤에는 스모크와 스파이크 S1·S3·S5·S6을 다시 실행하고 나서 계속한다.
7. **회귀 스펙을 남긴다.** 확정한 발견마다 이상적인 동작을 단언하는 최소 재현 스펙을 `test.fail()`로 감싸 `mfa-lab/e2e/regression/`에 둔다. 버그가 있는 동안은 스위트가 초록이고, 수정이 들어가면 "예상과 달리 통과"로 알려준다 ([FIXING.md](./FIXING.md) "`test.fail()` 결과 읽는 법").
8. **발견 1건 = 근본 원인 1개.** 같은 원인의 다른 증상은 `duplicate`(`dup_of`)로 두거나 같은 `root_cause_group`으로 묶는다.
9. **예측과 관찰을 섞지 않는다.** 사전 등록한 예측([BRIEF-2](./mfa/BRIEF-2-inspect.md) "기대와 예측")은 관찰 뒤에 고쳐 쓰지 않는다. "추정 원인"은 반증 실험을 하기 전까지 가설로 표시한다.
10. **환경을 기록한다.** 발견마다 `library_tree`, `library_commit`, `input`, `browser`, `playwright`, `native_touch_drag`를 적는다. 터치 발견에는 다음 문장을 그대로 넣는다: `Chromium CDP touch emulation, headless; not a real device` (라벨 규칙은 [HARNESS.md](./mfa/HARNESS.md) "증거와 라벨").
11. **통과도 기록한다.** REPORT.md 커버리지 표의 모든 행은 `pass` / `fail(ID)` / `blocked(사유)` / `not-run(사유)` 중 하나다.
12. **탐색 중 본 이상 동작은 스펙으로 재현한 뒤에만 발견으로 올린다** (R18).
13. **양성 대조가 살아 있어야 한다.** 스파이크 S5(npm 0.5.1 빌드에서 알려진 버그가 **실패로 잡혀야 함**)가 실패하지 않으면 하네스를 믿을 수 없으므로 중단한다. 세션 2 사전 점검에서 다시 실행한다.
14. Playwright MCP·CLI로 자유롭게 둘러본 결과는 증거가 아니다.

---

## 7. 귀속 사다리

기대와 다른 관찰이 나오면 아래 7단계를 순서대로 적용해 "라이브러리 / 컨테이너 고유 현상 / 픽스처 / 하네스" 중 어디에 속하는지 가린다. 슬롯·대조군의 정의는 [ARCHITECTURE.md](./mfa/ARCHITECTURE.md) "대조 사다리와 store 등록".

| 단계 | 하는 일 | 판독 |
|---|---|---|
| 1 | 깨끗한 컨텍스트에서 2회 재현하고 `repro_rate`를 적는다 | 재현되지 않으면 관찰 기록에만 남긴다 |
| 2 | **대조 교체**: 같은 레이아웃·같은 패널 자리·같은 동작에서 슬롯 내용만 바꾼다 (아래 컨테이너별 사다리) | 처음 나타나는 단계로 귀속한다 (아래 판독 표) |
| 3 | **입력·릴리스 교체**: 마우스 ↔ 터치(`touch-cdp-handle`), 릴리스 방식 `overShadow` ↔ `settled` ↔ `immediate` | 특정 릴리스 방식에서만 나오면 [HARNESS.md](./mfa/HARNESS.md) "stale preview 판정 규칙"을 적용한다 |
| 4 | **하네스 점검**: 이벤트 순서를 스파이크 기준선(`run00-spike/SPIKE.md`)과 비교하고 9절 목록과 대조한다 | 순서가 비정상이거나 알려진 부작용에만 의존하면 `harness-artifact` |
| 5 | **픽스처 점검**: remote의 단독 페이지(레이아웃 없이 같은 내용. orders `http://127.0.0.1:4301/`, board `:4302/`, billing `:4303/`)에서 같은 동작을 한다 | 단독 페이지에서도 나타나면 `fixture-bug` |
| 6 | 뜻밖의 결과는 **프로브를 끄고**(`window.__probe` 주입 없이. 스펙에서 `test.use({ probe: false })`) 다시 실행한다 | 프로브가 있을 때만 나타나면 `harness-artifact` |
| 7 | **오라클을 적는다** | 오라클이 없으면 `spec-question` |

### 컨테이너별 대조 사다리 (2단계)

왼쪽이 가장 단순하다. 오른쪽으로 갈수록 변수가 하나씩 늘어난다.

| 컨테이너 종류 | 사다리 | 단계마다 더해지는 것 |
|---|---|---|
| `same-tree` | `bare-*` → `control-*` / twin(`orders-local`, `board-local`) → remote(`orders`, `board`) | bare: 라이브러리 + 맨 div. control: + 패널 프레임 + host 트리 안의 내용. twin: remote의 실제 소스를 host 번들로. remote: + Module Federation 로딩 |
| `mount` | `billing-local` → `control-mount` → `billing` | billing-local: 같은 내용을 host 트리 안에서. control-mount: + 별도 React 루트(host의 React 사본 사용). billing: + 자체 번들 React + 다른 origin의 모듈 |
| `iframe` | `control-*` → `control-iframe` → `telemetry` → `telemetry-x` | control: iframe 없음. control-iframe: + iframe 요소(`srcdoc`, same-origin `about:srcdoc`). telemetry: + cross-origin same-site 문서. telemetry-x: + cross-site 문서 |

예 (URL 플래그는 [ARCHITECTURE.md](./mfa/ARCHITECTURE.md) "레이아웃 프리셋"): `?layout=census&b=orders`에서 본 현상을 `b=orders-local`, `b=control-b`, `b=bare-1`로 바꿔 가며 같은 동작을 반복한다.

| 처음 나타나는 단계 | 뜻 | 기본 class |
|---|---|---|
| `bare` 또는 `control` | 라이브러리 핵심 동작 | `library-bug` (오라클이 있을 때) |
| 컨테이너 대조군(`control-iframe`, `control-mount`). `control`에서는 안 나타남 | 컨테이너 고유 현상. "iframe이다", "별도 루트다"라는 사실에서 나오며 픽스처 탓이 아님 | [HYPOTHESES.md](./mfa/HYPOTHESES.md)의 해당 가설 기본 분류를 따른다 (예: 드래그하지 않은 iframe 패널이 DOM 재삽입으로 재로드되면 `library-bug`, 결정 D3a) |
| twin과 remote 둘 다. `control`은 깨끗함 | remote 내용과 라이브러리의 상호작용 | 5단계로 가른다. 단독 페이지에서도 나타나면 `fixture-bug`, 레이아웃 안에서만 나타나면 `library-bug` 후보 |
| twin은 깨끗하고 remote에서만 | Module Federation 로딩 또는 배포 형태 | `fixture-bug` (반증 전까지) |
| 컨테이너 대조군은 깨끗하고 remote에서만 | remote 코드 또는 host 어댑터 | `fixture-bug` (반증 전까지) |

- `control-mount`는 `billing`과 두 가지가 다르다: host의 React 사본을 쓰고, 그래서 `unmount`를 `queueMicrotask`로 미룬다. 두 슬롯의 결과가 다르면 두 차이를 모두 적는다.
- Module Federation이 저하 모드(`MF: degraded`)면 remote와 twin이 같은 모듈이다. remote 대 twin 비교는 `blocked(MF degraded)`로 적는다.
- `fixture-bug`는 컨테이너 대조군이 깨끗할 때만 붙인다.

---

## 8. 결정 로그

사용자가 내린 결정이다. 2026-10-02 기준으로 확정됐고, 세션은 이를 바꾸지 않는다. 발견이 결정에 근거하면 front matter `decision_ref`에 적는다.

| ID | 결정 | 문서·판정에 미치는 영향 |
|---|---|---|
| D1 | MFA는 마이크로 프론트엔드 아키텍처를 뜻한다 | 픽스처는 shell + 팀별 remote 구조 |
| D2 | 기존 remote 프로젝트는 없다. MFA 원칙으로 아키텍처를 설계해 이 저장소 안에 처음부터 만든다. 범위는 설계에 위임한다 | `mfa-lab/` 전체. 범위는 [ARCHITECTURE.md](./mfa/ARCHITECTURE.md) |
| D3 | 미리보기 때문에 드래그하지 않은 패널이 넓게 리마운트되는 것은 **결함**이다 | `library-bug`. FC-QA-001로 선등록 |
| D3a | 드래그하지 않은 패널이 React 리마운트 **없이** DOM 재삽입으로 초기화되는 것(iframe 재로드, 스크롤·포커스 초기화)도 결함이다 | `library-bug`. D3와 **별도 발견**으로 기록 |
| D3b | 드래그한 패널 자신의 리마운트·재삽입은 별도 발견이 아니다 | 같은 발견 안의 하위 관찰로 적는다 (`doc/TODO.md`에 소스 리마운트가 이미 기록돼 있음) |
| D4 | "iframe 내용 안에서 드래그를 시작할 수 없다"는 버그가 아니라 통합 가이드다 | 발견 파일을 만들지 않는다. REPORT.md "통합 가이드 후보" |
| D5 | 로컬 세션은 문서만 쓴다. 클라우드 세션 1이 구축하고 세션 2가 검수한다. 수정은 그 뒤에 발견 1건씩 한다 | 1절의 단계 |
| D6 | 클라우드 세션의 커밋·푸시·설치 허락은 `CLAUDE.md`가 아니라 사용자가 직접 입력하는 프롬프트에 적는다. 범위는 `mfa-lab/`, `doc/qa/`, `.gitignore` | [PROMPTS.md](./mfa/PROMPTS.md) |

새 결정이 필요하면 세션이 정하지 않는다. 발견을 `needs-user-confirmation`으로 두고 사용자에게 묻는다. 사용자가 답하면 사용자(로컬 세션)가 이 표에 D7부터 추가한다. 클라우드의 구축·검수·수정 세션은 이 표를 고치지 않는다.

---

## 9. 알려진 하네스 부작용 (요약)

아래는 입력을 Playwright·CDP로 만들기 때문에 생기는 차이다. **라이브러리 버그로 보고하지 않는다.** 전체 목록과 판정 세부는 [HARNESS.md](./mfa/HARNESS.md) "알려진 하네스 부작용". 모두 문서와 소스 리딩에 근거하며 미실행이다.

| 부작용 | 이유 | 다루는 법 |
|---|---|---|
| Esc 취소 때 대상에 `dragleave`가 오지 않는다 | Playwright의 드래그 취소는 `dragend`만 보낸다 ([playwright#33853](https://github.com/microsoft/playwright/issues/33853)) | 그 `dragleave` 유무에만 달린 차이는 `harness-artifact` |
| 커서가 멈춰 있으면 `dragover`가 반복되지 않는다 | 실제 브라우저는 약 350ms마다 다시 보내지만([HTML 명세](https://html.spec.whatwg.org/multipage/dnd.html)) CDP 드래그는 마우스 이동 때만 보낸다 | 같은 지점으로 다시 이동해 흉내 낸 결과는 "emulated"로 표시 |
| OS 커서 모양을 볼 수 없다 | headless에는 커서가 없고 스크린샷에도 찍히지 않는다 | 대용: `dragend`의 `dataTransfer.dropEffect`와 `drop` 이벤트 부재. 글리프 자체는 수동 확인 |
| 리사이즈 중 `mousedown`/`mousemove`/`mouseup`이 없다 | 리사이저가 `pointerdown`을 취소한다 ([useDragResize.ts:20](../../src/hooks/useDragResize.ts)) | 정상. 결함으로 보지 않는다 |
| cross-site iframe 위에서 드래그 이벤트가 어느 문서에 닿는지 불확실하다 | CDP가 가로챈 드래그의 프레임 전달은 확인되지 않았다 | 스파이크 S9에서 기록. 충실하다고 확인되기 전까지 `telemetry-x` 행에 단서를 단다 |
| 마우스를 떼는 순간 `dragover`·`drop`·`dragend`가 연달아 온다 | CDP의 drop 처리 방식. 라이브러리의 취소되지 않는 rAF([PanelNodeRenderer.tsx:103-106](../../src/components/PanelNodeRenderer.tsx)) 경합을 사람보다 훨씬 자주 일으킨다 | 진짜 경합이지만 빈도는 하네스가 키운 것. `harness_amplified: true`로 **1건만** 기록. 규칙은 [HARNESS.md](./mfa/HARNESS.md) "stale preview 판정 규칙" |
| 터치는 실기기가 아니다 | CDP `Input.dispatchTouchEvent` 에뮬레이션. Chromium 141과 153은 롱프레스 시 네이티브 드래그 시작 여부가 다르다 | 터치 결과에 라벨(6절 10번). 실기기는 수동 확인 |

---

## 10. 발견의 수명 주기

발견의 상태는 **발견 파일의 front matter `status`가 유일한 기준**이다.

| status | 뜻 | 이 상태로 바꾸는 주체 | 다음 |
|---|---|---|---|
| `predicted` | 코드 리딩으로 선등록. 실행 관찰 없음 | 로컬 세션 (FC-QA-001) | 관찰되면 `open` |
| `open` | run에서 2회 재현했고 증거·오라클·대조 실험·회귀 스펙을 갖춤 | 검수 세션 | `fixed`, `duplicate`, `wontfix`, `needs-user-confirmation` |
| `needs-user-confirmation` | 관찰은 확실하지만 결함 여부나 분류가 사용자 결정에 달림 | 검수 세션. 수정 세션이 오라클 문제를 발견했을 때도 | 사용자 결정 뒤 `open` 또는 `wontfix` |
| `fixed` | `src/` 수정이 커밋됐고 회귀 스펙이 `test.fail()` 없이 통과함. `fix_commit` 기록됨 | 수정 세션 | `verified`, 재발하면 `open` |
| `verified` | 수정 뒤의 **별도 run**에서 회귀 스펙과 원래 시나리오가 통과함 | 이후 run의 세션 또는 사용자. 고친 세션 자신은 바꾸지 못함 | 끝. 재발하면 `open` |
| `wontfix` | 고치지 않기로 함 | 사용자만 결정. 세션은 사용자의 명시적 지시가 있을 때 기록 | 끝 |
| `duplicate` | 다른 발견과 근본 원인이 같음. `dup_of`에 대상 ID | 검수 세션, 수정 세션 | 대상 발견을 따름 |

- `predicted` 발견이 run에서 재현되지 않으면 상태는 `predicted`로 둔다. 관찰 내용과 `repro_rate: 0/N`을 적고 REPORT.md "가설 판정"에 `refuted`로 올린다. 닫을지는 사용자가 정한다 (`wontfix`).
- 관찰 내용("실제", "증거")은 나중에 고쳐 쓰지 않는다. 추가 관찰·수정·재검증은 "관련" 절에 날짜를 붙여 덧붙인다.
- 양식은 [TEMPLATE-finding.md](./TEMPLATE-finding.md), 수정 절차는 [FIXING.md](./FIXING.md).

---

## 11. ID 대장

- 형식은 `FC-QA-NNN` (세 자리, 0으로 채움). run과 무관하게 전체에서 하나의 순번을 쓴다.
- **ID는 재사용하지 않는다.** `duplicate`·`wontfix`가 되거나 잘못 올린 발견이어도 번호는 그대로 남는다.
- 번호는 세션의 주 에이전트만 부여한다. 발견 파일을 만드는 커밋에서 아래 표에 행을 추가하고 "다음 빈 ID"를 올린다. [mfa/STATE.md](./mfa/STATE.md) "발견 ID"의 값도 함께 올린다. 둘이 다르면 이 문서가 기준이다.
- 상태는 이 표에 적지 않는다 (발견 파일이 기준).

| ID | 발견 파일 | found_in | 한 줄 요약 |
|---|---|---|---|
| FC-QA-001 | [FC-QA-001-preview-remount-non-dragged-panels.md](./findings/FC-QA-001-preview-remount-non-dragged-panels.md) | `pre-run` (실행 전 선등록) | 미리보기 때문에 드래그하지 않은 패널이 리마운트됨 (D3) |

**다음 빈 ID: FC-QA-002**

---

## 12. 용어집

| 용어 | 뜻 |
|---|---|
| MFA | 마이크로 프론트엔드 아키텍처. 한 화면을 팀별로 따로 빌드·배포하는 앱 여러 개로 구성하는 방식 |
| shell / host | 화면의 뼈대를 소유한 앱. 여기서는 `mfa-lab/apps/shell`이며 이 라이브러리로 패널 레이아웃을 그리는 유일한 앱 (`http://127.0.0.1:4300`) |
| remote | shell의 패널 안에 내용을 공급하는 팀별 앱. `mfe-orders`, `mfe-board`, `mfe-billing`, `mfe-telemetry` |
| 픽스처 / 랩 | 검수를 위해 만든 MFA 환경 전체(`mfa-lab/`). 제품 이름은 Harbor Workbench(가상의 물류 콘솔) |
| 하네스 | 브라우저를 구동하고 결과를 기록하는 Playwright 프로젝트 (`mfa-lab/e2e`) |
| 슬롯 | 패널에 넣는 내용의 이름. 라이브러리의 `componentKey`와 같고, 계측 키(`window.__mfe[slot]`)와 testid의 기준이다. 예: `orders`, `control-a`, `bare-0` |
| 컨테이너 종류 | remote가 패널에 들어가는 방식. `same-tree`(host와 같은 React 트리, Module Federation), `mount`(별도 React 루트, `mount(el)`/`unmount(el)` 계약), `iframe` |
| bare / control | 랩 계측용 대조 패널. `bare-*`는 맨 div와 핸들만, `control-*`는 패널 프레임 안의 단순한 내용(입력창, 스크롤 목록, 카운터) |
| twin | remote의 실제 소스를 shell 번들에 직접 넣어 host 트리에서 렌더한 것. `orders-local`, `board-local`, `billing-local` |
| 컨테이너 대조군 | 컨테이너 방식만 같고 내용은 단순한 대조 슬롯. `control-iframe`(srcdoc iframe), `control-mount`(host 안의 mount 모듈) |
| 대조 사다리 | 단순한 슬롯에서 remote까지 변수를 하나씩 늘려 가며 같은 동작을 반복하는 순서 (7절) |
| 리마운트 | React가 컴포넌트 인스턴스를 버리고 새로 만드는 것. state(입력값, 카운터)와 DOM 노드가 모두 새것이 된다. 지표: `__fc.frames[slot].frameMounts`, `__mfe[slot].mounts` 증가 |
| DOM 재삽입 | 컴포넌트 인스턴스와 state는 그대로인데 같은 DOM 노드가 부모에서 빠졌다가 다시 들어가는 것. React는 자식 순서를 바꿀 때 제거 후 삽입을 한다 (`enableMoveBefore`가 꺼져 있음, [ReactFeatureFlags.js](https://raw.githubusercontent.com/facebook/react/main/packages/shared/ReactFeatureFlags.js)). 스크롤 위치·포커스가 초기화되고 iframe은 재로드된다. 지표: `__probe.domMoves[panelId]` 증가, 마운트 수는 그대로 |
| iframe 재로드 | iframe 요소가 문서에서 떨어졌다 붙으면 안의 문서가 처음부터 다시 로드되는 것. 리마운트로도, DOM 재삽입으로도 일어난다. 지표: iframe 문서 안의 `__mfe[slot].loads`, host 쪽 `__fc.frames[slot].mirror.loads` |
| 미리보기 / shadow | 드래그 중 놓일 위치를 미리 보여 주려고 레이아웃을 임시 트리로 다시 그리는 것. 드래그 중인 패널은 반투명 + 점선 테두리(shadow 스타일)로 표시된다 |
| ghost | 터치 드래그 중 손가락을 따라다니는 패널 복제본. `body`에 붙는다 |
| 프로브 | 하네스가 페이지에 주입하는 기록 장치(`window.__probe`). 이벤트 로그와 DOM 이동 로그를 남긴다 |
| 불변식 | 동작이 끝난 뒤 항상 참이어야 하는 조건 I1~I7 ([HARNESS.md](./mfa/HARNESS.md) "불변식") |
| 레인 | 하네스가 쓰는 Playwright 버전과 Chromium 빌드의 조합. 세션 1이 하나를 정해 `mfa-lab/e2e/lane.json`에 기록한다 ([HARNESS.md](./mfa/HARNESS.md) "브라우저 레인") |
| 스파이크 | 본 검수 전에 하네스가 믿을 만한지 확인하는 짧은 실행 (run 00, S0~S10) |
| 오라클 | "무엇이 옳은 동작인가"의 근거. API 문서, `doc/TODO.md`, 사용자 결정, 또는 "가정" |
| 양성 대조 | 이미 알려진 버그가 있는 빌드(npm 0.5.1, `http://127.0.0.1:4390`)에서 하네스가 그 버그를 **잡아내는지** 확인하는 실행 (S5). 못 잡으면 하네스를 믿을 수 없다 |
| run | 한 번의 검수 실행 단위. 디렉터리 `doc/qa/runNN-<이름>/` |
| 발견 | 기대와 다른 관찰 1건의 기록. `doc/qa/findings/FC-QA-NNN-<slug>.md` |
| 회귀 스펙 | 발견을 재현하는 최소 테스트. 고쳐지기 전에는 `test.fail()`로 감싸 둔다 |
| GO | 스파이크 결과를 보고 세션 2를 시작해도 된다고 사용자가 내리는 결정 ([BRIEF-1](./mfa/BRIEF-1-build.md) "GO 기준") |
