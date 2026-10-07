# BRIEF-2 — 클라우드 세션 2 작업 지시서 (검수, run 01)

> 이 문서는
> - 클라우드 세션 2가 처음부터 끝까지 따라 하는 작업 지시서다. 세션 1이 만든 랩(`mfa-lab/`, Harbor Workbench)에서 실제 입력(마우스 드래그·경계선 리사이즈·CDP 터치)으로 라이브러리 `@dannysir/floating-components`(`src/`)를 검수하고, 기대와 다른 것을 발견 1건당 파일 1개로 남긴다. 결과는 `doc/qa/run01-tier1/`에 쌓인다.
> - 이 문서의 「기대와 예측」은 **실행 전에 등록한 예측(사전 등록)** 이다. 관찰 뒤에 고쳐 쓰지 않는다. 바꿀 것이 생기면 문서 끝 「Amendments」에 날짜와 함께 적는다.
> - 읽는 사람: 이 저장소만 가진 클라우드 Claude. 세션을 시작할 때와 재개할 때마다 읽는다.
> - 의존 문서: [STATE.md](./STATE.md)(체크포인트), [../README.md](../README.md)(심각도·분류·신뢰 규칙·귀속 사다리·결정 로그·ID 대장), [HARNESS.md](./HARNESS.md)(헬퍼·프로브·스냅샷·불변식·증거 규칙), [HYPOTHESES.md](./HYPOTHESES.md)(가설 H-*), [ARCHITECTURE.md](./ARCHITECTURE.md)(슬롯·프리셋·URL 플래그·계측·`ctl.mjs`), [../TEMPLATE-finding.md](../TEMPLATE-finding.md), [../TEMPLATE-report.md](../TEMPLATE-report.md), [BRIEF-1-build.md](./BRIEF-1-build.md)(GO 기준, BLOCKED.md 양식), `doc/qa/run00-spike/SPIKE.md`(세션 1의 결과).
> - 작성일 2026-10-02. 여기 적힌 절차·명령·예측은 전부 **미실행**이다. 브라우저에서 실행해 본 것은 없다. 예측은 코드 리딩(`git rev-parse HEAD:src` = `c1da6c9dc03a4811eea42c220be309e5e73b0a4a`, 마지막 `src/` 커밋 `ea25ff7`) 결과다.

용어 (자세한 정의는 [HARNESS.md](./HARNESS.md)와 [../README.md](../README.md) 용어집)

| 용어 | 뜻 |
|---|---|
| 슬롯 | 패널에 들어가는 내용의 이름. `componentKey` = `window.__mfe`의 키 = testid 접두어 (`control-a`, `orders`, `bare-0` ...) |
| 패널 id | 트리 노드의 `id`. DOM의 `[data-panel-id]`. 프리셋마다 다르다 (`p-a`, `editor`, `orders` ...) |
| `(앵커, 위치, depth)` | 드롭 대상. 헬퍼 `dropPoint(page, anchorId, position, depth)`가 그 지점의 픽셀을 준다 |
| 트리 표기 | `H[...]` 가로 split, `V[...]` 세로 split. `domTree(page)`와 `treeNotation(tree)`가 이 표기를 낸다 |
| 케이스 | 시나리오 안의 실행 단위. REPORT.md 커버리지 표의 행 하나에 해당한다. 케이스마다 깨끗한 컨텍스트에서 2회 실행한다 |
| 행 | REPORT.md 커버리지 표의 한 줄 = 시나리오 × 변형 × 입력. 상태는 `pass` / `fail(FC-QA-NNN)` / `blocked(사유)` / `not-run(사유)` |
| 판정 | 케이스 결과를 「기대와 예측」과 비교한 값. `as-ideal` / `as-predicted` / `deviates` |
| 발견 | 기대와 다른 관찰 1건의 기록 `doc/qa/findings/FC-QA-NNN-<slug>.md` |

이름 혼동 주의: 스파이크는 `S0`~`S10`, 심각도는 `sev-1`~`sev-4`, 시나리오는 `R01`~`R19`, 세션 2 단계는 `B2-00`, `R01`…, `B2-P1`, `B2-END`다.

---

## 먼저 읽을 문서

아래 순서로 읽는다. 세션 1이 B1-08에서 ARCHITECTURE.md·HARNESS.md·RECIPES.md를 실제 구축 내용으로 고쳤으므로(항목 옆 `실행 확인: <commit>`), 이 문서의 헬퍼 이름·URL 플래그가 그쪽과 다르면 **그쪽을 따른다**.

1. [STATE.md](./STATE.md) — "다음 작업" 줄, B1 체크리스트, 환경 사실(레인, MF, 터치, telemetry-x, blocked 변형), 사용자 GO 결정.
2. `doc/qa/run00-spike/SPIKE.md` — 특히 9절 HANDOFF(복원 명령, 알려진 부작용, 소요 시간), 5절 S8 비율 표, 8절 "라이브러리 버그 의심 메모", 10절 GO/NO-GO 권고.
3. 이 문서 전체.
4. `doc/qa/BLOCKED.md` — 있을 때만.
5. [../README.md](../README.md) 전체 — 판정 규칙. 4절 심각도, 5절 분류, 6절 신뢰 규칙, 7절 귀속 사다리, 8절 결정 로그, 10절 수명 주기, 11절 ID 대장.
6. [HARNESS.md](./HARNESS.md) 전체 — 헬퍼 시그니처(`lab.open`, `begin`, `teleport`, `release`, `cancelEsc`, `dropPoint`, `domTree`, `handleDrag`, `resizeBorder`, `blockRemote`, `snapshot`, `diff`, `seedContent`, `checkInvariants`, `capture`, `writeObservation`, `promote`), 「불변식」, 「stale preview 판정 규칙」, 「알려진 하네스 부작용」, 「스펙 구성」, 「증거와 라벨」.
7. [HYPOTHESES.md](./HYPOTHESES.md) 전체 — 2절(리마운트·DOM 재삽입·iframe 재로드의 구분), 4절(run 01 가설), 7절(문서 불일치), 9절(바로잡은 예측).
8. [ARCHITECTURE.md](./ARCHITECTURE.md) — 「앱 목록」(testid), 「대조 사다리와 store 등록」, 「레이아웃 프리셋」, 「핸들·잠금·URL 플래그」, 「계측 계약」, 「실행 모델」(명령과 Bash timeout).
9. [../TEMPLATE-finding.md](../TEMPLATE-finding.md), [../TEMPLATE-report.md](../TEMPLATE-report.md), [../findings/FC-QA-001-preview-remount-non-dragged-panels.md](../findings/FC-QA-001-preview-remount-non-dragged-panels.md).
10. `mfa-lab/README.md` — 실제 구축 뒤의 명령 기준.

[BRIEF-1-build.md](./BRIEF-1-build.md)는 「GO 기준」(조건부 GO 표, remote별 막히는 행)과 「중단 조건」(BLOCKED.md 양식)만 참조한다. [../FIXING.md](../FIXING.md)는 세션 2에서 따르지 않는다.

---

## 범위와 금지

이 브리프는 사용자가 승인한 계획이다. 추가 계획 승인 없이 진행한다(시작 프롬프트에 같은 문장이 있다). 세션 2는 **점검만** 한다.

| 항목 | 규칙 |
|---|---|
| 변경 범위 | `mfa-lab/`, `doc/qa/`, `.gitignore`만 |
| 절대 수정 금지 | `src/`, 루트 `package.json`, 루트 `package-lock.json`, 루트 `tsconfig.json`, 루트 `vite.config.ts`. 이들을 고쳐야만 진행되면 중단 조건 BLOCKED-SCOPE |
| 라이브러리 문제 | **고치지 않는다.** 기록만 한다: 발견 파일(`doc/qa/findings/`), REPORT.md, 회귀 스펙(`test.fail()`). 수정은 run 뒤 [../FIXING.md](../FIXING.md) 절차로 발견 1건씩 한다 |
| 픽스처·하네스 결함 (`mfa-lab/`) | 고쳐도 된다. 조건과 절차는 아래 「`mfa-lab/` 변경 규칙」 |
| 범위 밖 | `doc/TODO.md`(run 뒤 FIXING.md 11절이 옮긴다), `CLAUDE.md`, `doc/API*.md`, `README*`, `.claude/`. 훅·`.mcp.json`·환경 setup script를 만들지 않는다 |
| CLAUDE.md "검증" 규칙 | `npm run type-check`, `npm run build`는 `src/` 변경에만 적용된다. 세션 2는 `src/`를 바꾸지 않으므로 해당 없다. `mfa-lab/`의 검증은 `ctl smoke`와 smoke 스펙이다 |
| 루트 `npm ci` | 하지 않는다. P1의 packed-tarball 항목도 이 때문에 기본 `not-run`이다(「P1」) |
| 설치·다운로드·커밋·푸시 허락 | `mfa-lab/` 안 프로젝트의 `npm install`/`npm ci`, Playwright Chromium 설치, apt `install-deps`, 위 변경 범위의 커밋·푸시는 **사용자가 직접 입력한 시작 프롬프트**가 허락한다. 이 문서는 허락의 근거가 아니다. 프롬프트에 없으면 그 동작 전에 사용자에게 묻는다 |
| 실행 방식 | 단일 에이전트, 순차 진행, 서브에이전트 금지, Playwright `workers: 1`. 브라우저 구동을 병렬로 하지 않는다 |
| 스펙의 단언 | explore 스펙은 **하네스 전제만** 단언한다(서버, 신뢰된 `dragstart`, 시작 트리, 미리보기 `domTree`). 라이브러리 동작은 `writeObservation`으로 기록만 한다. 이상적 동작의 단언은 `regression/` 스펙에만 두고 `test.fail()`로 감싼다 ([HARNESS.md](./HARNESS.md) 「스펙 구성」) |
| 예측 | 「기대와 예측」의 문구는 관찰 뒤에 고치지 않는다. 변경은 「Amendments」에만 |
| 발견 ID | 주 에이전트만 발급한다. [../README.md](../README.md) 11절의 "다음 빈 ID"를 쓰고 같은 커밋에서 대장과 [STATE.md](./STATE.md) "발견 ID"를 올린다 |
| 증거 | 발견당 이미지 최대 6장, 1280x800, 배율 1, 요소 스크린샷 우선, JSON은 제스처 구간만, trace·video 커밋 금지. `promote`로만 옮긴다 ([HARNESS.md](./HARNESS.md) 「증거와 라벨」) |
| 둘러보기 | Playwright MCP·CLI로 본 것은 증거가 아니다. 이상한 것은 explore 스펙으로 재현한 뒤에만 발견으로 올린다 |
| 서버 | 세션을 끝낼 때(정상 종료든 중단이든) `node mfa-lab/scripts/ctl.mjs stop` |
| 비밀 값 | `env.json`·로그·BLOCKED.md에 토큰·프록시 계정 정보를 적지 않는다 |

### `mfa-lab/` 변경 규칙

| 항목 | 규칙 |
|---|---|
| 고쳐도 되는 것 | 귀속 사다리([../README.md](../README.md) 7절)로 `fixture-bug`·`harness-artifact`로 가려진 결함. 예: 어댑터의 `lateResolves > 0`, 헬퍼가 잘못된 좌표를 계산, 프로브가 이벤트를 놓침, `strict=1` 같은 P1 플래그 추가 |
| 고치면 안 되는 것 | 관찰 결과를 기대에 맞추려는 변경(허용 목록 확장, 대기 시간 늘리기, 단언 완화). 라이브러리 동작을 우회하는 픽스처 변경 |
| 변경 뒤 반드시 | `node mfa-lab/scripts/ctl.mjs smoke` → `node mfa-lab/scripts/ctl.mjs test smoke` → `test spike/s01`, `spike/s03`, `spike/s05`, `spike/s06` (S5는 여전히 **요구대로 실패**해야 한다) → 통과한 뒤에만 계속한다. 이미 닫은 행 중 그 변경에 영향을 받는 행(같은 헬퍼·같은 슬롯)은 explore 스펙을 다시 실행해 결과가 같은지 확인하고 REPORT.md 10절에 적는다 |
| 기록 | REPORT.md 10절 "세션 중 고친 픽스처·하네스 결함"에 무엇·커밋·재실행 결과. 결함이 관찰에 영향을 줬으면 그 관찰 기록(`obs/`)에 `contaminated` 라벨을 붙이고 다시 측정한다 |
| 커밋 | 라이브러리 관찰과 섞지 않는다. 별도 커밋 `test: [RNN] fix <무엇>` |
| 의존성 변경 | 그 프로젝트의 lockfile을 처음부터 다시 만든다(`node mfa-lab/scripts/ctl.mjs install --only <app> --fresh`). Windows용 optional 패키지가 빠지는 것을 막기 위해서다 |

### 커밋 규칙

시나리오 하나(= STATE.md 행 하나)를 닫을 때마다 한다. 스펙 하나가 초록이 될 때마다 중간(WIP) 커밋·푸시를 해도 되고 권장한다.

1. 경로를 **명시해** 스테이징한다. `git add -A`, `git add .` 금지.
2. `git status --short`와 `git diff --cached --stat`을 본다. 아래가 아무것도 출력하지 않아야 한다. `src/`, 루트 `package.json`, 루트 `package-lock.json`이 스테이징돼 있으면 커밋하지 않는다. 5 MB를 넘는 파일도 커밋하지 않는다.
   `git diff --cached --name-only | grep -E 'node_modules|/dist/|/dist-|\.run/|\.artifacts|test-results|pw-browsers'`
3. 메시지: `test: [R03] <요약>`(`mfa-lab/` 코드: explore·regression 스펙, 픽스처 수정), `docs: [R03] <요약>`(`doc/qa/`: 관찰 기록, 증거, 발견, REPORT, README 대장, STATE). 둘을 나눠 커밋한다.
4. STATE.md 갱신: 행 체크, 커밋(`git rev-parse --short HEAD`), 날짜(`date -u +%Y-%m-%dT%H:%MZ`), 시도 횟수(explore 스펙을 실행한 횟수), 결과 한 줄(`pass` / `fail(FC-QA-NNN, ...)` / `blocked(<사유>)` / `not-run(<사유>)`), "다음 작업" 줄.
5. `git push -u origin HEAD`.

### 중단 조건 (세션 2)

해당하면 더 진행하지 않는다. 절차: `doc/qa/BLOCKED.md`를 쓴다(양식은 [BRIEF-1-build.md](./BRIEF-1-build.md) 「중단 조건」) → STATE.md "차단 사항"과 "다음 작업"(같은 단계 + `(doc/qa/BLOCKED.md 참고)`)을 갱신하고 그 행은 체크하지 않는다 → 경로를 명시해 커밋·푸시 → `node mfa-lab/scripts/ctl.mjs stop` → 사용자에게 보고.

| 코드 | 조건 | 단계 | 메모 |
|---|---|---|---|
| (보고만, BLOCKED.md 없음) | STATE.md에 B1-08이 체크돼 있지 않다. 또는 시작 프롬프트에 GO 줄(`SPIKE.md를 읽었고 GO(caveat: ...)로 결정했다`)이 없다 | B2-00 | 아무것도 실행하지 않았으므로 BLOCKED.md를 쓰지 않는다. "세션 1의 작업 브랜치가 `qa/mfa-lab`에 머지되지 않았거나 GO 줄이 없다"고 보고하고 멈춘다 |
| BLOCKED-LANE | `ctl doctor`가 커밋된 레인(`mfa-lab/e2e/lane.json`)을 쓸 수 없다고 한다 | B2-00, 재개 | 레인을 조용히 바꾸지 않는다 |
| BLOCKED-ORACLE | 사전 점검의 S5가 실패하지 않는다(`:4390`에서 I1·I2가 모두 통과) | B2-00, `mfa-lab/` 변경 뒤 재실행 | S3과 S5의 이벤트 로그를 먼저 보고한다. 양성 대조가 죽은 하네스로는 검수하지 않는다 |
| BLOCKED-PREFLIGHT (이 문서가 붙인 이름) | 사전 점검의 S1·S3·S6 중 하나가 3회 시도 뒤에도 실패한다 | B2-00 | 세션 1이 통과시킨 스파이크가 새 VM에서 재현되지 않는 것이다. 이벤트 로그와 `run00-spike/evidence/baseline/`의 차이를 첨부 |
| BLOCKED-INPUT | 신뢰된 `dragstart`가 전혀 나오지 않는다 | B2-00 | 프로브 로그 전체 첨부 |
| BLOCKED-SCOPE | `src/`나 루트 패키지 파일을 고쳐야만 진행된다 | 전 단계 | 고치지 않는다. 무엇을 왜 고쳐야 한다고 봤는지 적는다 |

### 여러 세션에 걸칠 때

- 시나리오 하나가 세션 안에 끝나지 않을 수 있다. VM이 회수되면 같은 세션을 다시 열거나 푸시된 작업 브랜치에서 새 세션을 같은 프롬프트로 시작한다. 재개는 [STATE.md](./STATE.md)의 체크되지 않은 첫 행부터이고, 그 행의 파일이 일부 커밋돼 있어도 explore 스펙은 처음부터 다시 실행한다.
- 재개할 때마다 「사전 점검」의 1~9를 다시 한다(B2-00이 이미 체크돼 있어도). 10·11(디렉터리·REPORT 골격 만들기)은 건너뛴다.
- 시간이 모자라면 **둘째 묶음의 끝에서부터** `not-run(시간 부족)`으로 줄인다. 필수 묶음은 줄이지 않는다. P1은 전부 `not-run` 가능.

---

## 사전 점검

STATE.md 행 `B2-00`. 저장소 루트에서 실행한다. Bash timeout은 괄호 안 값(ms). 명령 명세는 [ARCHITECTURE.md](./ARCHITECTURE.md) 「실행 모델」.

| 순서 | 할 일 | 명령 (timeout) / 통과 조건 |
|---|---|---|
| 1 | 작업 트리·브랜치 확인. 브랜치 이름을 STATE.md "환경 사실 → 작업 브랜치"에 덧붙인다 | `git status --short && git log --oneline -5 && git rev-parse --abbrev-ref HEAD` (기본) |
| 2 | STATE.md 확인 | B1-08 행이 `[x]`이고 "다음 작업"이 `B2-00 (사용자 GO 결정 대기)` 또는 그 뒤 단계다. 아니면 중단(보고만) |
| 3 | GO 줄 확인·복사 | 시작 프롬프트 첫 줄 `SPIKE.md를 읽었고 GO(caveat: ...)로 결정했다`를 **그대로** STATE.md "사용자 GO 결정"에 옮겨 적는다. 없으면 중단(보고만) |
| 4 | caveat → `blocked` 행 결정 | 아래 「GO 줄과 caveat」 |
| 5 | SPIKE.md 읽기 | HANDOFF의 복원 명령·알려진 부작용·`detached 서버 생존`, S8 비율 표(`overShadow`가 0/10인지), 8절 의심 메모(해당 시나리오에서 확인할 후보로만 삼는다. 메모만으로 발견을 만들지 않는다) |
| 6 | 환경 복원 | `node mfa-lab/scripts/ctl.mjs up` (600000). 10분을 넘기면 `install`(600000), `build`(300000), `serve --baseline`, `smoke`를 따로. `doctor`가 레인을 쓸 수 없다고 하면 BLOCKED-LANE |
| 7 | 라이브러리 식별 | `git rev-parse HEAD:src`와 `git rev-list -1 HEAD -- src`가 STATE.md "라이브러리 식별"과 같다. 다르면 `src/`가 세션 1 뒤 바뀐 것이다. 중단하지 않고 STATE.md·env.json·REPORT.md 1절에 실제 값을 적고, HYPOTHESES.md의 인용 줄은 `grep`으로 다시 맞춘다 |
| 8 | 스모크 | `node mfa-lab/scripts/ctl.mjs test smoke` (600000). 초록 |
| 9 | 스파이크 재실행 | `node mfa-lab/scripts/ctl.mjs test spike/s01`, `spike/s03`, `spike/s05`, `spike/s06` (각 600000). S1·S3·S6 통과, 이벤트 순서가 `doc/qa/run00-spike/evidence/baseline/`과 같다(종류·대상·`isTrusted` 순서. 시각과 dragover 묶음 수는 무시). **S5는 요구대로 실패**해야 한다: `mfa-lab/e2e/.artifacts/results.json`과 스펙 출력에서 `:4390`의 I1·I2가 실패했는지 확인한다(스펙 자체는 "실패함"을 단언하므로 Playwright는 초록). 둘 다 통과면 BLOCKED-ORACLE. S1·S3·S6 실패는 3회까지 원인(서버, 레인, settle)을 고쳐 재시도하고 그래도 실패면 BLOCKED-PREFLIGHT |
| 10 | run 디렉터리 | `mkdir -p doc/qa/run01-tier1` → `node mfa-lab/scripts/ctl.mjs doctor --write doc/qa/run01-tier1/env.json` (기본) → env.json에 아래 키를 손으로 추가 |
| 11 | REPORT.md 골격 | [../TEMPLATE-report.md](../TEMPLATE-report.md)를 통째로 `doc/qa/run01-tier1/REPORT.md`로 복사하고 첫 안내 줄을 지운다. 1절 환경을 env.json·`lane.json`·STATE.md에서 채운다(GO 줄, caveat로 `blocked`가 된 행, 사전 점검 결과 포함). 2절 커버리지 표는 전부 `not-run`이되, 4번에서 정한 행만 `blocked(<caveat>)`로 바꾼다. `obs/`·`evidence/`는 첫 파일을 쓸 때 만든다 |
| 12 | 닫기 | STATE.md `B2-00` 체크 → `docs: [B2-00] 사전 점검` 커밋 → 푸시 |

`env.json`에 추가하는 키: `run: "run01-tier1"`, `go_line: "<프롬프트의 GO 줄 그대로>"`, `caveats: ["<표시>", ...]`(없으면 `[]`), `preflight: { s01, s03, s05, s06, s07a }`(각 `"pass"` / `"failed-as-required"` / `"fail"` / `"not-run"`), `lane_json: { lane, playwright, chromium }`(`mfa-lab/e2e/lane.json` 사본), `library: { tree, commit, source }`(`source`는 `window.__fc.lib.source`. 세션 1이 dist 대체를 썼으면 `dist`).

### GO 줄과 caveat

- caveat 표시의 어휘: `없음`, `MF: degraded`, `터치: env-limit`, `telemetry-x: env-limit`, `blocked(orders)`, `blocked(board)`, `blocked(billing)`, `blocked(telemetry)`. 여러 개면 쉼표로 이어져 있다.
- 각 caveat가 `blocked`로 만드는 run 01 행은 [BRIEF-1-build.md](./BRIEF-1-build.md) 「GO 기준」의 "조건부 GO" 표와 "remote별 막히는 행" 표를 **그대로** 적용한다. 조건이 겹치면 합집합이다. `blocked(<caveat>)`로 적는다(예: `blocked(MF degraded)`, `blocked(터치 env-limit)`).
- STATE.md "환경 사실"(MF, 터치, telemetry-x OOPIF, blocked 변형)과 GO 줄이 다르면 **합집합**을 적용하고 REPORT.md 1절에 둘을 나란히 적는다. 사용자 줄에 없는 caveat를 STATE.md가 보여 주면 그것도 적용한다.
- `telemetry-x OOPIF: no`(로드는 되지만 같은 프로세스)는 caveat가 아니다. 행을 실행하고 관찰 기록과 REPORT.md에 그 사실을 붙인다.
- `MF: degraded`에서 실행하는 orders·board 행(R03·R04·R05·R13·R17)에는 관찰 기록 `labels`에 `MF degraded (빌드 타임 통합)`을 붙인다.

### S7a (터치 게이트)의 시점

- 첫 터치 시나리오(실행 순서상 **R14**) 직전에 `node mfa-lab/scripts/ctl.mjs test spike/s07a --project touch` (600000)를 실행한다. 통과하면 env.json `preflight.s07a`에 `pass`.
- 3회 시도 뒤에도 실패하면 터치를 `env-limit`으로 적고(STATE.md 환경 사실, REPORT.md 1절·8절) R13·R14 전체, R18의 터치 동작, P1 롱프레스 항목, **R12의 입력 교체(터치) 사다리 단계**를 `blocked(터치 env-limit)`로 바꾼다. 세션 1에서는 통과했는데 지금 실패하면 REPORT.md 8절에 "세션 1과 다름"을 적는다.
- GO 줄에 이미 `터치: env-limit`이 있으면 S7a를 실행하지 않고 위와 같은 행을 막는다. R12의 터치 사다리 단계는 [BRIEF-1-build.md](./BRIEF-1-build.md) 「GO 기준」 표에 없으므로 이 문서가 **더해서** 적용한다.
- 터치가 `env-limit`이면 H-IFRAME-DEAD의 핵심 관찰(iframe 패널 위 드롭에서 마우스와 터치의 결과 차이)은 확인되지 않은 것이다. R12의 마우스 관찰이 기대와 다르면 발견은 낸다(오라클 `doc/API.ko.md` "드래그 앤 드롭"). 단, 그 발견의 제목·분류 근거에 "경로 불일치"(마우스 대 터치)를 쓰지 않고, front matter `blocked_by`에 `터치 env-limit`, "대조 실험" 표의 3단계에 `blocked(터치 env-limit)`를 적는다. REPORT.md 4절 H-IFRAME-DEAD 판정에 "터치 비교 미실행", 8절 수동 확인 항목에 "터치가 되는 환경(실기기 또는 S7a 통과 레인)에서 iframe 패널 위 핸들 터치 드롭이 커밋되는지"를 넣고, 최종 보고의 환경 한계에 그 발견 ID를 올린다. 마우스 결과만으로 그 발견을 터치 비교까지 끝난 것처럼 보고하지 않는다.
- VM(세션)이 바뀐 뒤 터치 시나리오가 남아 있으면 그 세션에서 S7a를 다시 돌린다.

---

## 시나리오 표

### 공통 규칙

- 뷰포트 1280x800, 배율 1. 모든 URL은 `http://127.0.0.1:4300/` 뒤의 쿼리다. `lab.open`이 조립한다(`layout`, `slots`, `drag`, `lock`, `iframeShield`, `flags`).
- 제스처 전에 **상태를 심는다**: 트리의 모든 프로브 슬롯에 `seedContent(page, slot)`(input `seed-<slot>`, 카운터 3회, `scrollTop = 120`). iframe 슬롯은 프레임 안 `tele-input`·`tele-scroll`에 같은 값을 넣는다. 심지 않으면 초기화를 볼 수 없다.
- 스냅샷·스크린샷 라벨: `01-before`(제스처 전), `02-mid`(hover 중. 터치는 ghost가 떠 있는 동안), `03-after`(릴리스·취소 뒤 `settle` 후). 케이스마다 최소 이 셋.
- 모든 이동은 `teleport`(이동 1회 = dragover 1회). `glide`는 P1에서만.
- 커밋은 기본 릴리스 `overShadow`. 취소 경로(잠긴 패널, iframe, 여백)는 `settled`. `immediate`는 R08에서만.
- 제스처가 끝나면 `settle` → `checkInvariants` → 결과를 관찰 기록에 넣는다. 시나리오별 허용 목록은 아래 각 항목에 적힌 것만.
- 포커스 유실은 마우스 시나리오에서 판정하지 않는다. `begin`의 핸들 `mousedown`이 먼저 포커스를 빼앗기 때문이다. DOM 재삽입의 지표는 `scrollTop`과 iframe `loads`다.
- 케이스 이름은 아래 표의 값 그대로 쓰고 실행 번호를 붙인다: `R01-hover-run1`, `R01-hover-run2`. 관찰 기록은 `doc/qa/run01-tier1/obs/<케이스>-run<N>.json`.
- 터치 케이스(R13, R14, R18-touch)는 `touch` 프로젝트로 실행하고(`--project touch`) 관찰 기록에 `input: touch-cdp-handle`, `native_touch_drag`, 그리고 문장 `Chromium CDP touch emulation, headless; not a real device`를 넣는다.
- 대조 사다리 열의 변형은 **기대와 다를 때만** 실행한다. 실행하면 REPORT.md 커버리지 표에 행을 추가한다.

### 요약

실행 순서 = STATE.md 행 순서. 번호 순이 아니다.

| 순서 | ID | 묶음 | 레이아웃 / 슬롯 (URL 쿼리) | 입력 | 가설 | 행 수 |
|---|---|---|---|---|---|---|
| 1 | R01 | 필수 | `?layout=census` (control-a..d) | mouse | H-REMOUNT, H-REINSERT | 2 |
| 2 | R02 | 필수 | `?layout=census` | mouse | H-REMOUNT | 1 |
| 3 | R03 | 필수 | `?layout=census&b=orders` / `&b=billing` / `&b=telemetry` / `&b=telemetry-x` | mouse | H-REMOUNT (변형별) | 4 |
| 4 | R05 | 필수 | `?layout=census&a=orders&b=billing&c=telemetry&d=control-d` | mouse | H-REMOUNT (가장 넓은 경우) | 1 |
| 5 | R07 | 필수 | `?layout=locks`, `?layout=locks&output=telemetry`, `?layout=locks&terminal=telemetry` | mouse | H-DRAGEND, 잠금, H-IFRAME-DEAD | 5 |
| 6 | R09 | 필수 | `?layout=row3&a=board`, `&a=board-local`, board 단독 페이지 `http://127.0.0.1:4302/` | mouse | H-FOREIGN-DRAG, H-DROP-HIJACK | 3 |
| 7 | R10 | 필수 | `?layout=row3&a=board&b=control-b`, `&a=board-local&b=control-b` | mouse | H-FOREIGN-DRAG | 3 |
| 8 | R12 | 필수 | `?layout=row3&a=control-a&b=telemetry&c=telemetry-x&iframeShield=0`, 같은 배치 `&iframeShield=1` | mouse | H-IFRAME-DEAD | 3 |
| 9 | R14 | 필수 | `?layout=locks` | touch-cdp-handle | H-DRAGEND (터치), 잠금 | 2 |
| 10 | R16 | 필수 | `?layout=workbench` + `blockRemote('http://127.0.0.1:4301')` | mouse | H-BOUNDARY | 3 |
| 11 | R17 | 필수 | `?layout=workbench` | mouse | H-RESIZE, H-REMOUNT, H-REINSERT, 잠금, `removePanel`/`insertPanel` | 4 |
| 12 | R18 | 필수 | `?layout=workbench` | mouse, touch-cdp-handle | 전부 (탐색) | 2 |
| 13 | R19 | 필수 | `?layout=census&persist=1`, `?layout=pair&persist=1`, `?layout=row3&persist=1` (트리 주입) | mouse | H-SIZING, 직렬화 | 6 |
| 14 | R04 | 둘째 | `?layout=census&a=orders` / `&a=billing` / `&a=telemetry` | mouse | H-REINSERT (변형별) | 3 |
| 15 | R06 | 둘째 | `?layout=row3&b=telemetry` | mouse | H-REINSERT | 2 |
| 16 | R08 | 둘째 | `?layout=census&a=bare-0&b=bare-1&c=bare-2&d=bare-3` | mouse | H-RAF-STALE, H-DROP-HIJACK | 3 |
| 17 | R11 | 둘째 | `?layout=row3&a=board`, `&a=board&lock=p-a:draggable`, board 단독 페이지 | mouse | H-DROP-HIJACK × 잠금 | 3 |
| 18 | R13 | 둘째 | `?layout=pair&a=control-a` / `&a=orders` / `&a=billing` / `&a=telemetry` (b=control-b) | touch-cdp-handle | H-GHOST-CLONE | 4 |
| 19 | R15 | 둘째 | `?layout=row3&a=control-a&b=telemetry&c=telemetry-x` | mouse | H-RESIZE | 2 |

행 수는 [../TEMPLATE-report.md](../TEMPLATE-report.md) 2절의 기본 행과 같다. 대조 사다리로 추가한 변형은 행을 더한다.

### R01 census, 전부 control — hover와 Esc

시작 트리 `H[p-a,V[p-b,p-c],p-d]`. 패널 id = `p-a`..`p-d`, 슬롯 `control-a`..`control-d`.

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R01-hover` | `seedContent` 4슬롯 → `01-before` → `d = begin(page, 'control-d')` → `d.teleport(dropPoint(page, 'p-a', 'left', 1))` → 전제: `domTree === 'H[p-d,p-a,V[p-b,p-c]]'`, `p-d`에 shadow → `02-mid` | 슬롯별 `frameMounts`/`frameUnmounts`, `mounts`/`unmounts`, `domMoves`, 내용 상태(input, counter, scrollTop), `diff(before, mid)` |
| `R01-esc` | 위에 이어 `d.cancelEsc()` → `03-after` → 불변식 | 누적 카운터, `domTree === treeNotation(getTree())`, `calls`에 `onMovePanel` 없음, 대상별 `dragend`(`phase: 'target'`) 기록 |

대조 사다리(기대와 다를 때): `?layout=census&a=bare-0&b=bare-1&c=bare-2&d=bare-3`(bare, S1과 같은 배치). FC-QA-001의 대조 실험 표를 함께 채운다.

### R02 census, 전부 control — hover 뒤 드롭

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R02-drop` | R01-hover와 같이 hover → `02-mid` → `d.release()` (기본 `overShadow`: `handlePoint('control-d')`로 teleport, `underCursor`가 `p-d`인지 확인, `mouse.up`) → `03-after` → 불변식 | 커밋된 트리 `H[p-d,p-a,V[p-b,p-c]]`, `calls`에 `onMovePanel('p-d','p-a','left',1)` 1건, `dragendDropEffect === 'move'`, `sawDrop === true`, 카운터 증가분(hover 대비 커밋 시점 추가분) |

### R03 census, 슬롯 B = remote

B를 `orders`, `billing`, `telemetry`, `telemetry-x`로 바꿔 가며 R01(hover + Esc)과 R02(hover + 드롭)를 반복한다. 케이스 `R03-<slot>-esc`, `R03-<slot>-drop` (예: `R03-orders-esc`). URL 예: `?layout=census&b=billing`.

| 슬롯 B | 추가로 기록할 것 |
|---|---|
| `orders` | `__mfe.orders`: `mounts`, `unmounts`, `instanceSeq`, `reactSame`, `build`. 내용 상태 `orders-input`, `orders-counter`, `orders-scroll`의 `scrollTop` |
| `billing` | `__mfe.billing`: `mountCalls`, `unmountCalls`, `rootsAlive`, `mounts`, `unmounts`. `__fc.frames.billing.lateResolves`(0이어야 한다. 0보다 크면 픽스처 결함 후보) |
| `telemetry`, `telemetry-x` | 프레임 안 `__mfe[slot].loads`·`docId`, host `__fc.frames[slot].mirror.loads`·`docIds`, `:4304` 문서 요청 수, `frameMounts`. 프레임 안 상태 `tele-input`, `tele-scroll`. `telemetry-x`는 S9 결과(OOPIF 여부)를 라벨로 붙인다 |

대조 사다리: orders → `b=orders-local` → `b=control-b` → `b=bare-1`. billing → `b=billing-local` → `b=control-mount`. telemetry → `b=control-iframe` → `b=control-b`. `MF: degraded`면 orders 행에 라벨을 붙이고 twin 비교는 `blocked(MF degraded)`.

### R05 census, 루트 가장자리 (가장 넓은 리마운트)

`?layout=census&a=orders&b=billing&c=telemetry&d=control-d`.

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R05-hover-esc` | `seedContent` → `01-before` → `d = begin(page, 'control-d')` → `d.teleport(dropPoint(page, 'p-a', 'top', 2))` (루트 위쪽 5% 띠. `p-a`의 조상 split은 1개이므로 루트 가장자리 depth = 2) → 전제: `domTree === 'V[p-d,H[p-a,V[p-b,p-c]]]'` → `02-mid` → `d.cancelEsc()` → `03-after` → 불변식 | 세 remote의 카운터(R03의 열)와 `p-d`의 `frameMounts`·`domMoves` |

대조 사다리: 전부 control(`?layout=census`에서 같은 제스처) → bare.

### R07 locks — 취소 경로

시작 트리 `H[nav,editor,V[terminal,output]]`. `nav`는 `draggable/droppable/resizable: false`, `minWidth = maxWidth = 200`. 기본 슬롯 `editor=control-a`, `terminal=control-b`, `output=control-c`. 미리보기 전제: `terminal → (editor, left, 0)`이면 `domTree === 'H[nav,terminal,editor,output]'`(소스 `terminal`의 부모가 바뀌어 리마운트되는 제스처. S3과 같다).

| 케이스 | URL | 절차 | 기록할 것 |
|---|---|---|---|
| `R07-esc` | `?layout=locks` | `seedContent` → `01-before` → `t = begin(page, 'control-b')` → `t.teleport(dropPoint(page, 'editor', 'left', 0))` → 전제 확인 → `02-mid` → `t.cancelEsc()` → `03-after` → 불변식 | 대상별 `dragend` 레코드(`phase: 'target'`, `isConnected: false`), 슬롯별 `frameMounts`(terminal, output, editor)와 `domMoves`, `calls` 비어 있음, 트리 불변 |
| `R07-nav` | `?layout=locks` | 같은 hover → `t.teleport(handlePoint(page, 'nav'))` → `settle` → `02-mid` → `t.release({ mode: 'settled' })` → 불변식 | `underCursorAtDrop === 'locked'`, `sawDrop === false`, `dragendDropEffect === 'none'`, `dragleave` 유무, 트리 불변 |
| `R07-iframe` | `?layout=locks&output=telemetry` | 같은 hover(`output`이 리마운트되므로 telemetry 문서가 다시 로드된다) → `settle` → `t.teleport(panelRect('output') 중앙)` (`underCursor.isIframe === true`) → `settle` → `02-mid` → `t.release({ mode: 'settled' })` → 불변식 | 마지막 `dragover`가 찍힌 프레임(`frame` URL), 호스트 `domTree`가 hover 때와 같은지(미리보기가 지워지지 않았는지), `underCursorAtDrop === 'iframe'`, `sawDrop === false`, telemetry `loads`·`mirror.loads`, 트리 불변 |
| `R07-padding` | `?layout=locks` | 같은 hover → `t.teleport(workspace 여백: [data-testid="workspace"] rect의 left+6, top+6)` → `settle` → `02-mid` → `t.release({ mode: 'settled' })` → 불변식 | `underCursorAtDrop === 'outside'`, 루트 `dragleave` 뒤 `domTree`가 원래 트리로 돌아갔는지, `sawDrop === false`, 트리 불변, 카운터 누적 |
| `R07-iframe-source` | `?layout=locks&terminal=telemetry` | `seedContent`(프레임 안) → `t = begin(page, 'telemetry')` → 같은 hover → `02-mid` → `t.cancelEsc()` → `03-after` → 불변식 | 소스 iframe의 `loads`(소스 자신의 재로드 = D3b 하위 관찰), `output`(control-c)의 `frameMounts`, 대상별 `dragend` 레코드, 트리 불변 |

허용 목록: 없음. 대조 사다리: `R07-iframe`에서 다르면 `output=control-iframe`.

### R09 remote 안의 네이티브 드래그 (칸반 카드)

| 케이스 | 열기 | 절차 | 기록할 것 |
|---|---|---|---|
| `R09-board` | `?layout=row3&a=board` | `01-before` → 카드 `board-card-c1` 중앙으로 `mouse.move` → `mouse.down` → 6px `mouse.move` → `settle` → 전제: 프로브에 신뢰된 `dragstart`(대상 testid `board-card-c1`) → `02-mid`(스냅샷에 `dom.draggingPanelId`) → `board-col-1` 중앙으로 teleport → `settle` → `mouse.up` → `settle` → `03-after` → 불변식 | `dom.draggingPanelId`(드래그 중), `dragstart`의 `types`·`effectAllowed`, `__mfe.board.dnd.cardMoves`·`lastTypes`·`lastDragend`, `drop` 레코드의 `stopped`(capture만 있고 bubble 없음), `calls`, 트리 불변 |
| `R09-board-local` | `?layout=row3&a=board-local` | 같은 절차 (testid `board-local-card-c1`, `board-local-col-1`) | 같다 |
| `R09-standalone` | `lab.openStandalone('board')` | 같은 절차 | `data-dragging-panel-id`를 가진 요소가 없음, `lastTypes`, `lastDragend.dropEffect` |

`begin`은 패널 핸들 전용이므로 여기서는 `page.mouse`를 스펙 안에 직접 쓴다(헬퍼를 바꾸지 않는다). `MF: degraded`면 `R09-board`에 라벨을 붙이고 board 대 board-local 비교는 `blocked(MF degraded)`.

### R10 remote 내용을 옆 패널로

`?layout=row3&a=board&b=control-b`. 시작 트리 `H[p-a,p-b,p-c]`.

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R10-card` | `01-before` → `board-card-c1`에서 R09처럼 드래그 시작 → `dropPoint(page, 'p-b', 'right', 0)`로 teleport → `02-mid`(`domTree`) → 릴리스: `handlePoint(page, 'board')`로 teleport, `underCursor`가 `p-a`인지 확인, `mouse.up` → `03-after` → 불변식 | hover 중 `domTree`(미리보기 유무), `calls`의 `onMovePanel`, 커밋된 트리, `cardMoves`(+0이어야 한다), `dragend`의 `dropEffect` |
| `R10-img` | 같은 절차를 `board-img`로 | 같다 |
| `R10-board-local` | `?layout=row3&a=board-local&b=control-b`에서 카드·이미지 둘 다 | 같다 |

대조(기대와 다를 때 추가 행): `&lock=p-a:draggable`로 같은 동작(예측: 미리보기 없음, 이동 없음). `MF: degraded`면 remote 대 twin 비교는 `blocked(MF degraded)`.

### R12 iframe 패널이 드롭 대상이 되는가

`?layout=row3&a=control-a&b=telemetry&c=telemetry-x&iframeShield=0`. 시작 트리 `H[p-a,p-b,p-c]`. 대상 지점은 `dropPoint(page, 'p-b', 'right', 0)`(iframe 본문 안의 점. `underCursor.panelId === 'p-b'`, `isIframe === true`).

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R12-telemetry` | `seedContent` → `01-before` → `a = begin(page, 'control-a')` → `a.teleport(dropPoint('p-b','right',0))` → `settle` → `02-mid` → `a.nudge()` → `a.release({ mode: 'settled' })` → `03-after` → 불변식 | 프레임별 `dragenter`/`dragover` 레코드(`frame` URL이 `:4304`인지, top 프레임의 `p-b` 대상 dragover가 있는지), 프레임 안 `__mfe.telemetry.seen.dragover`, hover 중 `domTree`(변화 없음이 예측), `underCursorAtDrop === 'iframe'`, `sawDrop`, `dragendDropEffect`, 트리 |
| `R12-telemetry-x` | 같은 절차를 `p-c`(`dropPoint('p-c','left',0)`)로 | 같다. S9의 OOPIF 결과와 하네스 충실도 단서를 라벨로 |
| `R12-shield` | `...&iframeShield=1`에서 `p-b`, `p-c` 각각: 같은 hover → `02-mid` → `a.release()` (`overShadow`) → 불변식 | hover 중 `domTree`(`p-b` 오른쪽과 `p-c` 왼쪽 모두 `H[p-b,p-a,p-c]`가 예측), 커밋된 트리, `calls` |

대조 사다리: `b=control-iframe`(srcdoc). 입력 교체(사다리 3단계): `touch` 프로젝트에서 `handleDrag(page, 'control-a', [dropPoint('p-b','right',0)], 'end')` → 터치 경로가 iframe 패널을 대상으로 잡는지(예측: 커밋). 마우스와 다르면 그 차이가 H-IFRAME-DEAD의 핵심 관찰이다. 이 단계는 `R12-telemetry`가 기대와 다를 때 **반드시** 실행한다(터치 라벨을 붙인 추가 행). 터치가 `env-limit`이면 실행하지 않고 `blocked(터치 env-limit)` 행으로 적는다(「S7a (터치 게이트)의 시점」의 규칙을 따른다).

### R14 locks — 터치 취소와 두 번째 드래그

`?layout=locks`, `touch` 프로젝트. S7a 통과가 전제다.

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R14-blocked` | `seedContent` → `01-before` → `handleDrag(page, 'control-b', [dropPoint(page,'editor','left',0), handlePoint(page,'nav')], 'end')`. 중간 스냅샷: 첫 waypoint 뒤 `domTree === 'H[nav,terminal,editor,output]'`(전제), 둘째 waypoint 뒤 ghost 스타일(`opacity 0.4`, outline 빨강) → `02-mid` → 종료 → `03-after` → 불변식 | `TouchResult`: ghost 개수·스타일, 종료 시 손가락 아래 분류(`locked`), `onMovePanel` 호출 없음, 트리 불변, 대상별 `touchend` 레코드(`isConnected: false`), I3(ghost 없음), 카운터(terminal·output `frameMounts`) |
| `R14-second` | 같은 페이지에서 이어서 `handleDrag(page, 'control-b', [dropPoint(page,'editor','left',0)], 'end')` → `03-after` → 불변식 | 두 번째 드래그가 시작됐는지(ghost 생성), `onMovePanel('terminal','editor','left',0)` 1건, 커밋된 트리 `H[nav,terminal,editor,output]` |

허용 목록: 없음.

### R16 remote 하나가 죽은 workbench

`blockRemote(page, 'http://127.0.0.1:4301')`을 `lab.open` **전에** 호출하고 `lab.open({ layout: 'workbench', expectState: { orders: 'error' } })`. 시작 트리 `H[nav,orders,V[H[board,billing],H[telemetry,telemetry-x]]]`. 허용 목록 `{ I6: [/127\.0\.0\.1:4301/], I7: ['orders'] }`.

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R16-load` | 열기 → `settle` → `01-before`(뷰포트) → 불변식 | `error-orders`·`retry-orders` 존재, `__fc.frames.orders.state === 'error'`, 다른 5슬롯 `ready`, 콘솔 에러가 `:4301` 요청 실패뿐인지, `shell-error` 없음 |
| `R16-others` | `b = begin(page, 'billing')` → `b.teleport(dropPoint('board','left',0))` → 전제 `domTree`가 `H[nav,orders,V[H[billing,board],H[telemetry,telemetry-x]]]` → `02-mid` → `b.release()` → 불변식 → `resizeBorder(page, { between: ['orders','billing'], delta: 120, steps: 10 })` → 불변식 | 커밋된 트리, `calls`(`onMovePanel`, `onResizeBorder`), `ResizeResult`(방향, 3px 오차), 에러 카드가 여전히 orders에만 |
| `R16-dead-drag` | `o = begin(page, 'orders')` → `o.teleport(dropPoint('billing','right',0))` → `02-mid` → `o.release()` → `03-after` → 불변식 | `dragstart`가 핸들에서 시작됐는지, 커밋된 트리(orders가 billing 오른쪽), 에러 카드가 옮겨진 패널 안에 있는지, 새 콘솔 에러 없음 |

`MF: degraded`면 전부 `blocked(MF degraded)`(remote를 네트워크로 막을 수 없다). `blocked(orders)`도 전부 `blocked`.

### R17 workbench 순회

`?layout=workbench`. 제품 기본 화면에서 모든 드래그 가능한 패널을 한 번씩 옮기고, 모든 경계선을 조절하고, Nav 토글로 `board`를 닫았다 연 뒤, 전·후 PNG를 **직접 열어** 시각 점검표와 대조한다. 각 제스처 뒤 `settle` → 불변식(허용 목록 없음) → 스냅샷. 시작 트리 T0 = `H[nav,orders,V[H[board,billing],H[telemetry,telemetry-x]]]`, Resizer 4개(`nav` 옆에는 없다).

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R17-resize` | `seedContent` 전 슬롯 → `01-before`(뷰포트) → 4개 경계선을 순서대로 `+120`, 다시 `-120`: `between: ['orders','board']`, `['board','billing']`, `['telemetry','telemetry-x']`, `['board','telemetry']`(세로). 각각 뒤 불변식 → 마지막에 `begin(page, 'nav', { expectStart: false })`로 `nav`가 시작되지 않음을 확인 | 각 `ResizeResult`(방향, 3px 오차, `gotpointercapture`, `userSelect` 복원), `calls`의 `onResizeBorder` 8건, `nav` 폭 200±1 유지, `orders` 폭 ≥ 320, 아래 행 높이 ≥ 160, `.ftl-resizer` 개수 4, 각 패널 `scrollWidth <= clientWidth`(넘침 없음) |
| `R17-moves` | 아래 M1~M5를 순서대로. 각 이동: `begin` → `teleport(dropPoint(...))` → 전제: 미리보기 `domTree`가 아래 표의 값 → `02-mid-M<n>`(뷰포트) → `release()` → `settle` → 불변식 → `03-after-M<n>` | 이동마다 커밋된 트리 표기, `calls`, 슬롯별 카운터 증가분(`diff`)과 iframe `loads`, 내용 상태 유지 여부 |
| `R17-nav-toggle` | `nav-toggle-board` 클릭(`page.click`) → `settle` → 불변식 → `03-after-close` → 다시 클릭 → `settle` → 불변식 → `03-after-open` | `calls`의 `removePanel`·`insertPanel`, 트리 표기(아래), `__mfe.board.mounts` +1(새 패널은 새로 마운트되는 것이 정상), 슬롯별 카운터 증가분(닫기·열기 각각 `diff`. 예측 표 참고), 콘솔 에러 0 |
| `R17-visual` | `01-before`, 각 `02-mid-M<n>`, `03-after-M<n>`, 토글 전후 PNG를 Read 도구로 연다. 아래 점검표의 항목마다 "이상 없음 / 이상(설명)"을 관찰 기록에 적는다 | 점검표 결과. 이상이 있으면 R18 규칙대로 explore 스펙으로 재현한 뒤 발견 |

이동 표 (코드 리딩으로 계산한 예측 트리. 미실행). 소스 전부 `overShadow`로 커밋.

| 이동 | 소스 → `(앵커, 위치, depth)` | 미리보기·커밋 트리 (예측) |
|---|---|---|
| M1 | `orders` → `('billing','right',0)` | `H[nav,V[H[board,billing,orders],H[telemetry,telemetry-x]]]` |
| M2 | `board` → `('telemetry','left',0)` | `H[nav,V[H[billing,orders],H[board,telemetry,telemetry-x]]]` |
| M3 | `billing` → `('orders','bottom',0)` | `H[nav,V[V[orders,billing],H[board,telemetry,telemetry-x]]]` (앵커가 새 split으로 감싸이고 단일 자식 split이 풀린다: `src/tree/insert.ts:66-71`, `src/tree/helpers.ts:45`) |
| M4 | `telemetry` → `('orders','right',0)` | `H[nav,V[V[H[orders,telemetry],billing],H[board,telemetry-x]]]` |
| M5 | `telemetry-x` → `('board','bottom',4)` (루트 아래쪽 5% 띠. `board`의 조상 split 3개 → depth 4) | `V[H[nav,V[V[H[orders,telemetry],billing],board]],telemetry-x]` (루트가 새 V로 감싸인다: `src/tree/insert.ts:49-52`) |
| 토글 닫기 | `removePanel('board')` | `V[H[nav,V[H[orders,telemetry],billing]],telemetry-x]` |
| 토글 열기 | `insertPanel({ panel: { id:'board', componentKey:'board' }, at: { anchorId:'billing', position:'left' } })` | `V[H[nav,V[H[orders,telemetry],H[board,billing]]],telemetry-x]` |

`dropPoint`가 띠가 4px 미만이라 `HarnessError`를 던지면 그 이동만 다른 앵커·위치로 바꾸고 바꾼 값과 예측 트리를 관찰 기록에 적는다(Amendments에도).

시각 점검표 (PNG마다)

| 항목 | 보는 것 |
|---|---|
| 잘림 | 패널 헤더·내용이 패널 경계 밖으로 나가거나 잘리지 않는가. 스냅샷 `dom.panels[].rect`와 비교 |
| 넘침·스크롤바 | 스크롤바는 패널 body 안(`<slot>-scroll`)에만 있는가. 패널 wrapper나 workspace에 바깥 스크롤바가 생기지 않았는가 |
| 리사이저 | hover 때만 보이므로 PNG에는 없는 것이 정상(알려진 부작용 9). 개수와 위치는 `dom.resizers`로 본다 |
| shadow | `02-mid`에서만 소스 패널이 반투명 + 점선. `03-after`에는 없음(I2) |
| ghost | 마우스 시나리오이므로 어디에도 없음(I3) |
| 에러 카드·스켈레톤 | `error-*`, `loading-*`가 보이지 않는가(R16 외) |
| 상태 배지 | 헤더의 `status-<slot>` 숫자(`f.. c..` / `f.. l..`)가 스냅샷 `counters`와 같은가 |
| 고정 크기 | `nav` 폭 200, 하단 행 높이 ≥ 160, `orders` 폭 ≥ 320 |

### R18 탐색 세션

`?layout=workbench`. 시나리오에 없는 동작 약 30회(마우스 약 20회 `explore/r18-charter-mouse.spec.ts`, 터치 약 10회 `explore/r18-charter-touch.spec.ts`를 `--project touch`로). 규칙:

1. 제스처마다 **하기 전에** 의도를 기록한다(번호, 설명, 쓰는 헬퍼). 로그는 `doc/qa/run01-tier1/obs/R18-log.json`에 쓴다: `[{ n, input, description, invariants: [...], diff: <슬롯별 분류 요약>, note }]`.
2. 제스처 뒤 반드시 `settle` → `checkInvariants`(허용 목록 없음) → `snapshot`. 하나라도 실패하면 **거기서 멈추고** 그 상태를 `capture`한 뒤 페이지를 새로 연다.
3. 이상한 것(불변식 실패, 예측에 없는 카운터 변화, 화면 이상)은 발견이 아니다. 먼저 `explore/r18-x<nn>-<slug>.spec.ts`로 **재현 스펙**을 쓰고 깨끗한 컨텍스트에서 2회 실행한다. 재현되면 그때 「시나리오 반복 절차」 6번부터 진행한다. 재현되지 않으면 로그에 `not-reproduced`로 남긴다.
4. 이미 다른 시나리오가 다루는 현상(리마운트, 재삽입, stale preview 시그니처)이 나오면 새 발견을 만들지 않고 해당 발견의 "관련" 절에 날짜와 함께 한 줄 덧붙인다.
5. [HYPOTHESES.md](./HYPOTHESES.md) 8절 "코드에 없다고 확인된 위험"에는 시간을 쓰지 않는다.

제스처 후보(전부 쓸 필요 없다. 섞어서 약 30회): Resizer 위에서 패널 놓기(10절 참고 사항: 취소 예측), 상단 바 위에서 놓기, 드래그 시작 직후 이동 없이 Esc, `glide(point, 30)`로 모든 패널을 가로지른 뒤 `overShadow` 커밋, 네 루트 가장자리 각각에 놓기, 경계선을 끝까지 밀었다 되돌리기, 리사이즈 직후 드래그, Esc 직후 즉시 새 드래그, iframe에 들어갔다 나와서 다른 패널에 놓기, `telemetry-x`를 `telemetry` 위에 놓기, Nav 토글 직후(board가 로딩 중일 때) 다른 패널 드래그, 입력창에 글자를 치고 다른 패널 드래그 뒤 값 확인, 목록을 스크롤한 뒤 다른 패널 드래그, `page.setViewportSize(800x600)` 뒤 드래그·리사이즈, 다시 1280x800. 터치: 각 패널로 핸들 드래그, `touchCancel`로 끊기, `nav` 위에서 떼기, 연속 두 번 터치 드래그, 터치 드래그 뒤 마우스 드래그.

### R19 `doc/TODO.md` "남은 검증" 확인

`doc/TODO.md` "남은 검증"의 두 항목을 control 패널에서 확인한다. 원문:

> - [ ] **직렬화 (0.3.0)** — 저장→새로고침→복원 시 레이아웃+컴포넌트 복구 / 미등록 키 시 dev 경고+빈 패널 / DnD·split·insert 후 정상
> - [ ] **패널 크기 제약 (0.4.0)** — `minWidth`/`maxWidth`(가로 split), `minHeight`/`maxHeight`(세로 split)가 윈도우 리사이즈·경계선 드래그 모두에서 같은 px로 지켜지는지 / 패널보다 큰 콘텐츠가 `overflow:auto`로 스크롤되는지

범위: "split·insert 후 정상"의 `splitPanel`은 run 01 범위 밖([ARCHITECTURE.md](./ARCHITECTURE.md) 「공개 API 커버리지」), `insertPanel`은 R17의 Nav 토글(persist 없이)이 다룬다. R19는 DnD만 본다. REPORT.md 7절 대응표에 그렇게 적는다.

`persist=1`의 동작: localStorage 키 `harbor.layout.<layout>.v1`을 로드 때 읽어 초기 트리로 쓰고(검증 없음), 커밋된 트리가 바뀔 때마다 `JSON.stringify(tree)`를 저장한다([ARCHITECTURE.md](./ARCHITECTURE.md) 「핸들·잠금·URL 플래그」). 임의 트리 주입: 같은 origin의 아무 페이지(`?layout=pair`)를 연 뒤 `page.evaluate`로 `localStorage.setItem(키, JSON)`을 하고 `?layout=<l>&persist=1`로 다시 연다. `lab.open`은 트리의 모든 슬롯이 ready가 될 때까지 기다리므로 미등록 슬롯이 있는 트리는 `expectState`에 실제 슬롯만 적는다(그래도 기다리면 `page.goto` 뒤 `window.__fc.ready`만 기다린다. HARNESS.md의 as-built를 확인한다).

주입 트리 (슬롯은 control-a..d)

| 이름 | 키 | 트리 |
|---|---|---|
| `row3-size` | `harbor.layout.row3.v1` | `{"type":"split","direction":"horizontal","size":1,"children":[{"type":"panel","id":"p-a","size":1,"componentKey":"control-a","minWidth":200,"maxWidth":400},{"type":"panel","id":"p-b","size":1,"componentKey":"control-b"},{"type":"panel","id":"p-c","size":1,"componentKey":"control-c","minWidth":150}]}` |
| `pair-size` | `harbor.layout.pair.v1` | `{"type":"split","direction":"horizontal","size":1,"children":[{"type":"panel","id":"p-a","size":1,"componentKey":"control-a","minWidth":200,"maxWidth":400},{"type":"panel","id":"p-b","size":1,"componentKey":"control-b"}]}` |
| `census-vsize` | `harbor.layout.census.v1` | census 트리에서 `p-b`에 `"minHeight":120,"maxHeight":300`을 더한 것 |
| `pair-unregistered` | `harbor.layout.pair.v1` | pair 트리에서 `p-b`의 `componentKey`를 `"nope-slot"`으로 바꾼 것 |

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R19-persist-roundtrip` | `lab.open({ layout:'census', flags:{ persist:'1' } })` → `seedContent` → `d = begin('control-d')` → `teleport(dropPoint('p-a','left',1))` → `release()` → `settle` → T1 = `getTree()` → `localStorage.getItem('harbor.layout.census.v1')` 읽기 → `page.reload()` → `__fc.ready` 대기 → `settle` → 불변식 | 저장된 JSON이 T1과 같은지, reload 뒤 `getTree()`가 T1과 깊은 비교로 같은지, `domTree === treeNotation(T1)`, 모든 슬롯 `ready`, 내용 상태(초기화되는 것이 정상: store는 직렬화되지 않는다), 콘솔 에러 0 |
| `R19-persist-unregistered` | `pair-unregistered` 주입 → `?layout=pair&persist=1` 열기(`expectState: { 'control-a': 'ready' }`) → `settle` → 불변식(I7 허용 목록 `['nope-slot']`) | `[data-panel-id="p-b"]`가 존재하고 자식 요소가 없는지, `shell-error` 없음, 콘솔 에러 0(prod 빌드는 `devWarn`을 제거한다), 트리에 `p-b`가 있음 |
| `R19-persist-dnd` | 위 페이지에 이어 `a = begin('control-a')` → `teleport(dropPoint('p-b','right',0))` → 전제 `domTree === 'H[p-b,p-a]'` → `release()` → 불변식 → 그리고 `R19-persist-roundtrip`의 reload 뒤 페이지에서 `b = begin('control-b')` → `teleport(dropPoint('p-c','bottom',0))` → `release()` → 불변식 | 커밋된 트리와 `calls`, localStorage 갱신 여부, 빈 패널이 앵커·드롭 대상으로 동작하는지 |
| `R19-size-1280` | `row3-size` 주입 → `?layout=row3&persist=1` → 1280x800에서 `panelRect` 3개 → `resizeBorder({ between:['p-a','p-b'], delta:+400, steps:20 })` → `p-a` 폭 → `resizeBorder(delta:-600)` → `p-a` 폭 → `resizeBorder(delta:+50)` → `p-a` 폭. 같은 순서를 `pair-size`(`?layout=pair&persist=1`)에서. 세로: `census-vsize`(`?layout=census&persist=1`)에서 `between:['p-b','p-c']`로 `+300`, `-500`, `+50`하며 `p-b` 높이 | 각 단계의 px(기대 상한 400 / 하한 200, 세로 300 / 120, 허용 오차 3px), 그 시점의 `getTree()` `size` 비율과 실제 폭의 관계(상태가 CSS 한계 아래로 내려갔는지), 되돌릴 때 경계선이 즉시 따라오는지 |
| `R19-size-800` | 위 세 트리 각각: 1280에서 `p-a`(세로는 `p-b`)를 하한까지 민 상태로 `page.setViewportSize({ width:800, height:600 })` → `settle` → `panelRect` → 다시 `resizeBorder(delta:+300)` → px → `page.setViewportSize({ width:1280, height:800 })` → `panelRect` | 창 크기 변경 뒤 하한(200 / 150 / 120)이 지켜지는지, 800 폭에서 경계선 드래그의 상한 px, 1280으로 돌아온 뒤의 px. 창 크기 변경(CSS)과 경계선 드래그(`resizeBorder`)의 한계 px가 같은지 |
| `R19-overflow` | `row3-size`에서 `p-a`를 하한 200까지 민 상태에서 `control-a-scroll`의 `scrollHeight > clientHeight`, `[data-panel-id="p-a"]`의 `scrollWidth`·`clientWidth`·`scrollHeight`·`clientHeight`, PanelFrame body(`body-control-a`)의 같은 값, 요소 스크린샷 | 내용이 잘리지 않고 스크롤되는지, 스크롤바가 어느 요소에 생기는지(이중 스크롤바 여부) |

### 둘째 묶음

실행 순서 14~19(R04, R06, R08, R11, R13, R15). 시간이 모자라면 이 묶음의 **끝(R15)에서부터** `not-run(시간 부족)`으로 줄인다(「여러 세션에 걸칠 때」). 절차 표기와 허용 목록 규칙은 필수 묶음과 같다.

### R04 census, 슬롯 A = remote — 재삽입

R01과 같은 제스처(`p-d` → `(p-a, left, 1)`, hover + Esc)를 슬롯 A만 바꿔 반복한다. 보는 것은 `p-a`의 **재삽입**(fiber 유지, DOM 노드만 이동)이다. `p-b`·`p-c`의 리마운트도 함께 기록한다(FC-QA-001 증거). 시작 트리 `H[p-a,V[p-b,p-c],p-d]`.

| 케이스 | URL | 절차 | 기록할 것 |
|---|---|---|---|
| `R04-orders` | `?layout=census&a=orders` | `seedContent` 4슬롯 → `01-before` → `d = begin(page, 'control-d')` → `d.teleport(dropPoint(page, 'p-a', 'left', 1))` → 전제: `domTree === 'H[p-d,p-a,V[p-b,p-c]]'` → `02-mid` → `d.cancelEsc()` → `03-after` → 불변식 | `p-a`의 `diff` 분류(`reinserted`가 예측. `remounted`면 H-REMOUNT로 넘긴다), `domMoves['p-a']`, `__fc.frames.orders.frameMounts`(+0)와 `__mfe.orders.mounts`(+0), 내용 상태(`orders-input`·`orders-counter` 유지, `orders-scroll`의 `scrollTop` 0), `p-b`·`p-c`의 frame·content 증가분 |
| `R04-billing` | `?layout=census&a=billing` | 같다 | 위와 같되 `__mfe.billing.mountCalls`·`unmountCalls`(+0), `rootsAlive`(1), `billing-scroll`의 `scrollTop`, `__fc.frames.billing.lateResolves`(0) |
| `R04-telemetry` | `?layout=census&a=telemetry` | 같다(`seedContent`는 프레임 안 `tele-input`·`tele-scroll`) | `__fc.frames.telemetry.frameMounts`(+0)인데 프레임 안 `loads`(+1)·`docId` 변경·`mirror.loads`(+1)·`:4304` 문서 요청(+1)인지, 프레임 안 상태 초기화, `diff` 분류(`reloaded`) |

허용 목록: 없음. 대조 사다리(기대와 다를 때): orders → `a=orders-local` → `a=control-a`(= R01) → `a=bare-0`. billing → `a=billing-local` → `a=control-mount`. telemetry → `a=control-iframe` → `a=control-a`. `MF: degraded`면 `R04-orders`에 라벨을 붙이고 twin 비교는 `blocked(MF degraded)`. `blocked(<remote>)`면 그 변형 행은 `blocked`.

### R06 row3, B = telemetry — 재삽입의 방향

`?layout=row3&b=telemetry`(`a=control-a`, `c=control-c` 기본). 시작 트리 `H[p-a,p-b,p-c]`. 리마운트가 없는 이동(루트 split 안에서 순서만 바뀐다)에서 어느 패널이 DOM 재삽입되는지, 그래서 iframe이 **언제** 재로드되는지(hover 때인지 취소 때인지) 본다. 한 케이스 안에서 hover + Esc 뒤 같은 페이지에서 hover + 드롭을 이어서 한다. 카운터는 **구간별 증가분**으로 적는다: `diff(01-before, 02-mid)`, `diff(02-mid, 03-after)`, `diff(03-after, 04-mid-drop)`, `diff(04-mid-drop, 05-after-drop)`.

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R06-a` | `seedContent` 3슬롯(`p-b`는 프레임 안) → `01-before` → `c = begin(page, 'control-c')` → `c.teleport(dropPoint(page, 'p-a', 'left', 1))`(depth 0과 같은 트리를 만든다. depth 1의 띠가 더 넓다) → 전제: `domTree === 'H[p-c,p-a,p-b]'` → `02-mid` → `c.cancelEsc()` → `03-after` → 불변식 → 같은 페이지에서 `c2 = begin(page, 'control-c')` → 같은 teleport → 전제 확인 → `04-mid-drop` → `c2.release()` → `05-after-drop` → 불변식 | 구간별 `domMoves`(`p-a`, `p-b`, `p-c`), 프레임 안 `loads`·`docId`·`mirror.loads`·문서 요청 수(어느 구간에서 +1인지), 모든 슬롯의 frame·content 증가분(+0이어야 재삽입이다), 내용 상태(`scrollTop`, 프레임 안 값), 커밋된 트리 `H[p-c,p-a,p-b]`, `calls`에 `onMovePanel('p-c','p-a','left',1)` 1건 |
| `R06-b` | 새 페이지. 같은 순서를 `a = begin(page, 'control-a')` → `a.teleport(dropPoint(page, 'p-c', 'right', 1))` → 전제 `domTree === 'H[p-b,p-c,p-a]'`로 | 같다. 커밋된 트리 `H[p-b,p-c,p-a]`, `onMovePanel('p-a','p-c','right',1)` 1건 |

허용 목록: 없음. 대조 사다리: `b=control-iframe` → `b=control-b`.

### R08 census bare — stale preview와 후속 영향

`?layout=census&a=bare-0&b=bare-1&c=bare-2&d=bare-3`. 시작 트리 `H[p-a,V[p-b,p-c],p-d]`. `bare-*`는 PanelFrame이 없다(`__fc.frames`에 키 없음, 핸들 testid `handle-bare-<n>`, 내용 카운터는 `__mfe['bare-<n>'].mounts`). 메커니즘과 시그니처는 [HARNESS.md](./HARNESS.md) 「stale preview 판정 규칙」. 릴리스 모드 `immediate`는 이 시나리오에서만 쓴다.

stale 유도 절차(세 케이스 공통. 예측은 전부 미실행)

1. `seedContent` 4슬롯(bare는 input만 있다) → `01-before`.
2. `d = begin(page, 'bare-3')` → `pt = dropPoint(page, 'p-b', 'left', 0)` → `d.teleport(pt)`.
3. 전제: `domTree === 'H[p-a,V[H[p-d,p-b],p-c]]'`(앵커 `p-b`가 새 H로 감싸이고 소스 `p-d`가 그 안으로 들어간다. 소스 자신이 리마운트되는 이동이다: `src/tree/insert.ts:66-71`) **그리고** `underCursor(page, pt.x, pt.y).panelId === 'p-a'`(미리보기 DOM에서 커서가 소스가 아닌 `p-a` 위에 있다. 루트 split이 세 칸에서 두 칸이 되면서 `p-a`가 넓어져 커서 자리를 덮는다는 계산이다. 아니면 `HarnessError`: 이 지점으로는 stale을 유도할 수 없다).
4. `02-mid` → `r = d.release({ mode: 'immediate' })` → `03-after` → `checkInvariants`(허용 목록 없음. 실패가 곧 관찰이다).
5. 예측: `mouse.up`의 `dragover`가 `p-a`에 떨어져 `(p-a, right, 0)` 미리보기를 rAF로 예약하고(`src/components/PanelNodeRenderer.tsx:103-106`), 이어진 `drop`이 `(p-b, left, 0)` 이동을 커밋해 트리가 `H[p-a,V[H[p-d,p-b],p-c]]`가 되며(`src/components/TreeLayout.tsx:136-143`), 커밋 뒤 실행된 rAF가 미리보기 `H[p-a,p-d,V[p-b,p-c]]`를 켠다. 시그니처: `r.underCursorAtDrop === 'other-droppable'`, I1 통과, I2 실패(`p-d`에 shadow), I5 실패(`domTree !== treeNotation(getTree())`), 마지막 `dragover`(대상 `p-a`)가 `drop`·`dragend`와 한 프레임 안.
6. 시그니처가 나오지 않으면 같은 케이스를 새 컨텍스트에서 다시 한다. run1·run2를 포함해 최대 5회. 5회 모두 안 나오면 `R08-stale`은 `pass`(관찰 기록에 `not-reproduced`, `repro_rate 0/5`), `R08-chip`·`R08-resize`는 `not-run(R08-stale 미재현)`.

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R08-stale` | 위 1~6 | `r.underCursorAtDrop`, I1·I2·I5 결과, `dom.panels['p-d'].shadow`, `domTree`와 `treeNotation(getTree())`, 마지막 `dragover`와 `drop`·`dragend`의 `t` 차이(이벤트 로그), `calls`(`onMovePanel('p-d','p-b','left',0)` 1건은 정상 커밋이다), `treeVersion`, 카운터(이 구간은 `contaminated`로 표시한다. 리마운트 측정은 R01~R05가 한다) |
| `R08-chip` | 새 컨텍스트에서 stale 유도(1~5. 시그니처가 나올 때까지 최대 5회 새 페이지) → `01-before`(stale 상태) → ext-chip 드래그를 `page.mouse`로 직접(`begin`은 패널 핸들 전용이다): `[data-testid="ext-chip"]` 중앙으로 `mouse.move` → `mouse.down` → 오른쪽으로 6px `mouse.move` → `settle` → 전제: 프로브에 신뢰된 `dragstart`(대상 testid `ext-chip`, `types`에 `application/x-harbor-chip`), `dom.draggingPanelId === null` → `panelRect(page, 'p-c')` 중앙으로 `mouse.move` 1회 → `settle` → `02-mid` → `mouse.up` → `settle` → `03-after` → 불변식 | `calls`의 `onMovePanel`(패널 드래그 없이 생긴 호출. 예측: `onMovePanel('p-d','p-a','right',0)` 1건), 커밋된 트리(예측 `H[p-a,p-d,V[p-b,p-c]]`), `treeVersion` 증가, `drop` 레코드(대상 `p-c`. `stopped`가 없어야 루트까지 버블된 것이다), `dragend`의 `dropEffect`, `03-after`의 I1·I2·I5(예측: `finishDrag`가 stale을 지워 전부 통과) |
| `R08-resize` | 새 컨텍스트에서 stale 유도(1~5) → `01-before`(stale 상태. 렌더된 트리 `H[p-a,p-d,V[p-b,p-c]]`, 커밋된 트리 `H[p-a,V[H[p-d,p-b],p-c]]`) → `r1 = resizeBorder(page, { between: ['p-a','p-d'], delta: 120, steps: 10 })` → `02-mid` → `r2 = resizeBorder(page, { between: ['p-d','p-b'], delta: 120, steps: 10 })` → `03-after` → 불변식 | `calls`의 `onResizeBorder`(`path`, `borderIndex`), `treeVersion`(예측: `r1` +1, `r2` 그대로), `getTree()`에서 `size`가 바뀐 노드(예측 `r1`: 커밋 트리의 `p-a`와 `V`. `p-d`는 아님), `r1`·`r2`의 `ResizeResult`(끈 경계선 양쪽 rect 변화. 예측 `r1`: `p-a` 커짐, `p-d` 폭 그대로, `V` 작아짐. `r2`: 변화 없음 — 렌더 트리의 `borderIndex 1`이 커밋 트리에는 없다 `src/hooks/useLayoutTree.ts:56`), 리사이즈 뒤 `domTree`·I5, I4 |

허용 목록: 없음. 대조(기대와 다를 때, 또는 stale이 유도되지 않을 때): stale 없는 새 페이지에서 `R08-chip`의 chip 드롭만(예측: `calls` 비어 있음, `drop` 레코드 `stopped: true` — 미리보기가 없으면 패널 `handleDrop`이 전파를 막는다 `src/components/PanelNodeRenderer.tsx:119-120`). 시그니처가 나오면 발견 1건(`library-bug`, `harness_amplified: true`), 이후 같은 시그니처는 `dup_of`(「분류 기본값」).

### R11 board 안의 copy 드래그 — `dropEffect` 덮어쓰기

`?layout=row3&a=board`(`b=control-b`, `c=control-c` 기본). 시작 트리 `H[p-a,p-b,p-c]`. board의 copy 전용 쌍(소스 `board-copy-src`: `effectAllowed = 'copy'`, 타입 `application/x-harbor-copy`. 존 `board-copy-zone`: `dropEffect = 'copy'`)을 같은 패널 안에서 끌어다 놓는다. `begin`은 패널 핸들 전용이므로 R09처럼 `page.mouse`를 직접 쓴다(헬퍼를 바꾸지 않는다).

공통 절차: `01-before` → `board-copy-src` 중앙으로 `mouse.move` → `mouse.down` → 오른쪽으로 6px `mouse.move` → `settle` → 전제: 프로브에 신뢰된 `dragstart`(대상 testid `board-copy-src`, `types`에 `application/x-harbor-copy`) → `02-mid` → `board-copy-zone` 중앙으로 `mouse.move` 1회 → `settle` → `mouse.up` → `settle` → `03-after` → 불변식.

| 케이스 | 열기 | 기록할 것 |
|---|---|---|
| `R11-board` | `lab.open({ layout: 'row3', slots: { a: 'board' } })` | `dragstart` bubble 레코드의 `effectAllowed`(예측 `'move'`)·`types`(`text/panel-id`가 더해지는지), 드래그 중 `dom.draggingPanelId`(예측 `'p-a'`), 존 위 `dragover` bubble 레코드의 `dropEffect`(예측 `'move'`), `drop` 레코드 유무와 `stopped`, `__mfe.board.dnd.copyDrops`(예측 +1)·`lastDragend.dropEffect`(예측 `'move'`)·`lastTypes`, `calls` 비어 있음, 트리 불변, hover 중 `domTree` 불변(소스 패널 안이라 미리보기 없음) |
| `R11-locked` | `lab.open({ layout: 'row3', slots: { a: 'board' }, lock: 'p-a:draggable' })` | 같다. 예측: `effectAllowed 'copy'` 유지, `dom.draggingPanelId === null`, `drop` 레코드 없음, `copyDrops` +0, `lastDragend.dropEffect 'none'` |
| `R11-standalone` | `lab.openStandalone('board')` | 같다(레이아웃 없음). 예측: `dropEffect 'copy'`, `copyDrops` +1, `drop` 레코드가 bubble까지 있음 |

허용 목록: 없음. 귀속 사다리 5단계(단독 페이지)가 `R11-standalone`으로 표에 들어 있다. `MF: degraded`면 `R11-board`·`R11-locked`에 라벨 `MF degraded (빌드 타임 통합)`. `blocked(board)`면 R11 전체 `blocked(board)`.

### R13 pair — 터치 ghost

`?layout=pair&a=<slot>&b=control-b`, `touch` 프로젝트(`--project touch`). S7a 통과가 전제다(「S7a (터치 게이트)의 시점」). 시작 트리 `H[p-a,p-b]`. ghost는 소스 패널을 `cloneNode(true)`로 복제해 `body`에 붙인 것이다(`src/hooks/useTouchDrag.ts:60-74`). 복제 직후와 500 ms 뒤를 보고, 그다음 `p-b` 오른쪽으로 커밋한다. 복합 헬퍼 `handleDrag`에는 중간 대기가 없으므로 `touch.ts`의 기본 동작(`openTouch`)을 스펙에서 직접 조합한다(헬퍼를 바꾸지 않는다). ghost는 `body > [style*="z-index: 9999"]`로만 읽고 내용 질의는 `[data-tree-root]` 아래로 한정한다.

공통 절차: `seedContent` 2슬롯 → `01-before` → `t = openTouch(page)` → `h = handlePoint(page, '<slot>')` → `t.touchStart(h)` → `t.touchMove({ x: h.x + 12, y: h.y })`(8px 초과 이동으로 드래그 시작. 아직 `p-a` 안이라 미리보기 없음) → 전제: `dom.ghosts.length === 1`, `domTree === 'H[p-a,p-b]'` → `capture('02-ghost-0')`(뷰포트)와 ghost 요소 스크린샷 `capture('02-ghost-0-el', { element: page.locator('body > [style*="z-index: 9999"]') })` → `t.hold(500)` → `snapshot('02-ghost-500')` → `t.touchMove(dropPoint(page, 'p-b', 'right', 0))` → 전제: `domTree === 'H[p-b,p-a]'` → `02-mid` → `t.touchEnd()` → `03-after` → 불변식.

| 케이스 | 슬롯 A | 추가로 기록할 것 |
|---|---|---|
| `R13-control` | `control-a` | (전 케이스 공통) ghost의 `rect`·`opacity`(`0.7`)·`outline`(없음)·`iframeCount`, ghost와 트리 안 원본의 `getComputedStyle(el).getPropertyValue('--hb-fg')`·`('--hb-bg')` 비교(예측: ghost에서 빈 문자열), `02-ghost-0`과 `02-ghost-500` 사이의 모든 카운터 변화(예측: 없음), 소스 `p-a`의 `domMoves`(미리보기 `H[p-b,p-a]`에서 +1. D3b), 커밋된 트리 `H[p-b,p-a]`, `calls`에 `onMovePanel('p-a','p-b','right',0)` 1건, I3(ghost 제거), 프로브의 `touchend` 레코드(`phase`, `isConnected`), 신뢰된 `dragstart`가 **없음**(핸들 모드는 `draggable=false`) |
| `R13-orders` | `orders` | `__mfe.orders.mounts`(+0), 내용 상태 유지(`scrollTop`은 재삽입으로 0) |
| `R13-billing` | `billing` | ghost 안 `[data-testid="billing-canvas"]`의 `toDataURL()`이 같은 크기의 빈 canvas와 같은지(트리 안 원본은 다르다), `mountCalls`·`unmountCalls`(+0), `rootsAlive` 1 |
| `R13-telemetry` | `telemetry` | `02-ghost-0`→`02-ghost-500` 구간의 `mirror.loads`(예측 +1)·`docIds`(새 값)·`:4304` 문서 요청 수(+1), `dom.ghosts[0].iframeCount`(1), 프레임 안 `__mfe.telemetry.loads`(ghost 문서가 같은 sessionStorage 키를 올려 다음 재로드 때 2 뛴다 — 관찰 기록에 적는다), 미리보기 구간(`02-ghost-500`→`02-mid`)의 실제 iframe 재로드(`loads`·`docId`·문서 요청. D3b), `frameMounts`(+0) |

허용 목록: 없음. 터치 라벨(「공통 규칙」)을 모든 관찰 기록에 넣는다. 대조 사다리: telemetry → `a=control-iframe`. billing → `a=billing-local` → `a=control-mount`. orders → `a=orders-local`. `MF: degraded`면 `R13-orders`에 라벨. 터치 `env-limit`이면 R13 전체 `blocked(터치 env-limit)`.

### R15 iframe 옆 경계선 리사이즈

`?layout=row3&a=control-a&b=telemetry&c=telemetry-x`. 시작 트리 `H[p-a,p-b,p-c]`, Resizer 2개(`p-a|p-b`, `p-b|p-c`). 포인터를 iframe 쪽으로 150px 끌고 iframe 본문 위에서 놓는다(`releaseOver`). 그다음 같은 경계선을 반대로 끌어 Resizer가 다시 잡히는지 본다. `telemetry`는 same-site(같은 프로세스), `telemetry-x`는 cross-site(OOPIF 여부는 S9가 기록했다). 중앙 = `panelRect`의 `{ x: left + width / 2, y: top + height / 2 }`(리사이즈 전에 계산한다. 150px 이동 뒤에도 iframe 안이다).

| 케이스 | 절차 | 기록할 것 |
|---|---|---|
| `R15-telemetry` | `seedContent`(프레임 안 포함) → `01-before` → `c = panelRect(page, 'p-b')의 중앙` → `r1 = resizeBorder(page, { between: ['p-a','p-b'], delta: 150, steps: 15, releaseOver: c })` → `02-mid` → 불변식 → `r2 = resizeBorder(page, { between: ['p-a','p-b'], delta: -150, steps: 15 })` → `03-after` → 불변식 | `r1`·`r2`의 `ResizeResult`(방향, 3px 오차, `gotpointercapture`·`lostpointercapture` 유무, 릴리스 뒤 `userSelect`), 프로브의 `pointerup` 레코드가 어느 프레임(`top`)에 찍혔는지, 캡처 중 프레임 안 `__mfe.telemetry.seen.pointermove` 증가량(예측 0), `calls`의 `onResizeBorder` 수와 `path`, `p-b`의 `loads` 변화 없음(리사이즈는 재로드가 아니다), I4, `r2`가 방향대로 움직였는지(= Resizer가 다시 잡힘) |
| `R15-telemetry-x` | 새 페이지. `c = panelRect(page, 'p-c')의 중앙` → `r1 = resizeBorder(page, { between: ['p-b','p-c'], delta: 150, steps: 15, releaseOver: c })` → `02-mid` → 불변식 → `r2 = resizeBorder(page, { between: ['p-b','p-c'], delta: -150, steps: 15 })` → `03-after` → 불변식 | 같다. 캡처 유실의 징후를 따로 적는다: `lostpointercapture` 레코드, top 프레임에 `pointerup` 없음, `r2`의 크기 변화 0(Resizer가 다시 잡히지 않음. `activePointerId` 잔존 `src/hooks/useDragResize.ts:19`. sev-1 후보), `body.style.userSelect === 'none'` 잔존(I4 실패). S9의 OOPIF 결과를 라벨로 붙인다 |

허용 목록: 없음. 대조 사다리(`R15-telemetry`가 기대와 다를 때): `b=control-iframe`. `telemetry-x: env-limit`이면 `R15-telemetry-x`는 `blocked(telemetry-x env-limit)`.

---

## 기대와 예측

사전 등록 표다. 각 케이스의 `writeObservation`에 `expected`·`predicted`를 **이 표의 문구 그대로** 옮겨 적는다.

규칙

| 항목 | 규칙 |
|---|---|
| 기대 | 오라클이 말하는 이상적 동작. 오라클은 `doc/API.ko.md`의 절 이름, `doc/TODO.md`의 절, 사용자 결정 D3/D3a/D3b/D4([../README.md](../README.md) 결정 로그), 코드 주석, 또는 "가정" |
| 예측 | 코드 리딩이 말하는 실제 동작. 전부 **미실행**. 근거는 `src` 파일:줄(`c1da6c9d` 트리 기준) |
| 판정 어휘 | `as-ideal`(기대대로) / `as-predicted`(기대와 다르고 예측대로) / `deviates`(기대와도 예측과도 다름) |
| 발견 | **기대와 다른 모든 관찰**에 발견을 낸다. 예측됐든 아니든 같다. `as-predicted`도 발견이다. 단, 같은 근본 원인이 이미 발견으로 있으면 그 발견에 증거를 더한다(FC-QA-001, stale preview 시그니처의 `dup_of`) |
| `deviates` | 발견을 내고, REPORT.md 4절에 해당 가설을 `refuted`로 적는다. 예측이 틀린 것이지 기대가 틀린 것이 아니다 |
| 수정 금지 | 이 표의 문구는 관찰 뒤 고치지 않는다. 틀린 예측은 REPORT.md 4절과 발견 파일에 "예측과 다름"으로 남긴다. 줄 번호 갱신·오탈자만 허용하고 그 밖의 변경은 「Amendments」 |
| 카운터 표기 | `+N`은 `01-before` 대비 증가분. `frame` = `__fc.frames[slot].frameMounts`(언마운트도 같은 수), `content` = `__mfe[slot].mounts`(언마운트도 같은 수), `moves` = `__probe.domMoves[panelId]`, `loads` = iframe 문서 안 `__mfe[slot].loads`(mirror도 같은 수) |

### R01, R02 — census 전부 control

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R01-hover` | 드래그하지 않은 `p-a`·`p-b`·`p-c`의 내용은 unmount·재삽입·재로드되지 않는다. input·counter·scrollTop 유지 | D3, D3a | 미리보기 `H[p-d,p-a,V[p-b,p-c]]`. `p-b`·`p-c`: frame +1, content +1, input·counter·scrollTop 초기화(split 키 `split-1` → `split-2`). `p-a`: frame +0, content +0, moves +1, scrollTop 0으로 초기화. `p-d`(소스): 변화 없음, DOM도 안 움직임 | `src/components/LayoutNodeRenderer.tsx:92`, `src/components/TreeLayout.tsx:99-108, 161`, `src/tree/insert.ts:43-47` |
| `R01-esc` | 원래 배치로 복귀, 카운터 변화 없음, I1~I7 통과 | D3, D3a, `doc/TODO.md` "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실" | `p-b`·`p-c` 누적 frame +2, content +2. `p-d` moves +1(취소 때 재삽입). `p-a` 추가 변화 없음. I1~I7 통과. `calls` 비어 있음. `dragend`는 window 레코드(소스가 리마운트되지 않았으므로 연결된 노드) | 위와 같음, `src/components/TreeLayout.tsx:144-150` |
| `R02-drop` | 커밋은 미리보기 상태에서 아무것도 더하지 않는다. 드래그하지 않은 패널의 카운터는 +0 | D3 | `p-b`·`p-c` 누적 frame +1, content +1(hover 분만. 커밋 시점 추가 없음). 커밋된 트리 = 미리보기. `calls`에 `onMovePanel('p-d','p-a','left',1)` 1건. `dragendDropEffect 'move'` | `src/components/TreeLayout.tsx:136-143`, `src/hooks/useDropPreview.ts:22-26` |

### R03 — census 슬롯 B = remote

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R03-orders-esc` | `orders` content +0, 입력값·카운터·스크롤 유지 | D3 | content +2, frame +2, `instanceSeq` +2, 상태 전부 초기화, `reactSame true` 유지 | R01과 같음. lazy는 이미 풀려 있어 리마운트가 동기 렌더 |
| `R03-orders-drop` | 같다 | D3 | content +1, frame +1 | R02와 같음 |
| `R03-billing-esc` | `mountCalls`·`unmountCalls` +0, `rootsAlive` 1 유지, 상태 유지 | D3 | `unmountCalls` +2, `mountCalls` +2, content +2(새 루트마다 `App` 마운트), `rootsAlive` 1(settle 뒤), 상태 초기화. `lateResolves` 0(0이 아니면 픽스처 결함 후보: cleanup 뒤 도착한 모듈로 mount) | R01과 같음. 어댑터 규약은 [ARCHITECTURE.md](./ARCHITECTURE.md) 「host 어댑터」 |
| `R03-billing-drop` | 같다 | D3 | 각 +1 | |
| `R03-telemetry-esc` | `loads` +0, 프레임 안 입력·스크롤 유지 | D3 | `loads` +2, `docId` 두 번 바뀜, mirror +2, `:4304` 문서 요청 +2, frame +2, 프레임 안 상태 초기화 | R01과 같음. iframe 요소가 새로 만들어진다 |
| `R03-telemetry-drop` | 같다 | D3 | `loads` +1, frame +1 | |
| `R03-telemetry-x-esc` / `-drop` | 같다 | D3 | telemetry와 같은 수. OOPIF 여부와 무관(리마운트는 host DOM의 일) | |

### R05 — 루트 가장자리

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R05-hover-esc` | `p-a`·`p-b`·`p-c` 모두 변화 없음 | D3 | 미리보기 `V[p-d,H[p-a,V[p-b,p-c]]]`. hover: `p-a`(orders) content +1·frame +1, `p-b`(billing) `mountCalls`·`unmountCalls` +1, `p-c`(telemetry) `loads` +1·frame +1. 옛 `split-1` fiber가 다른 노드(`H[p-a,V[…]]`)에 재사용돼 그 아래가 전부 새로 마운트된다. `p-d`: frame +0, moves +0. Esc: 셋 다 한 번 더(누적 +2), `p-d` moves +1 | `src/tree/insert.ts:49-52, 155-157`, `src/components/LayoutNodeRenderer.tsx:92` |

### R07 — locks 취소 경로

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R07-esc` | I1~I7 통과, 트리 불변, `calls` 비어 있음. 드래그하지 않은 `output`·`editor`는 변화 없음 | `doc/TODO.md` "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실"(수정 주장), D3, D3a | 통과(I1~I7). `dragend`가 분리된 원본 노드에 간다: `phase 'target'`, `isConnected false`, 같은 `eid`의 window 레코드 없음. 카운터: `terminal`(소스) frame +2(D3b 하위 관찰), `output` frame +2(D3: FC-QA-001 대상. split이 풀려 부모가 바뀐다), `editor` moves +1(D3a) | `src/components/TreeLayout.tsx:144-150, 80-83`, `src/tree/helpers.ts:45`, `src/components/LayoutNodeRenderer.tsx:92` |
| `R07-nav` | 놓으면 이동이 취소되고 원래 배치로 돌아간다. `drop` 없음 | `doc/API.ko.md` "패널 잠금 → 드래그 중 동작" | `underCursorAtDrop 'locked'`, `sawDrop false`, `dragendDropEffect 'none'`, `dragleave` + `dragend`, 트리 불변, I1~I7 통과. 카운터는 `R07-esc`와 같음 | `src/components/PanelNodeRenderer.tsx:98-101`, `TreeLayout.tsx:144-150` |
| `R07-iframe` | iframe 패널도 다른 패널과 같은 드롭 대상이다. 그 위에서 놓으면 거기로 이동이 커밋된다 | `doc/API.ko.md` "드래그 앤 드롭"(드롭 타겟 규칙에 iframe 예외가 없다) | 마지막 `dragover`가 `:4304` 프레임에 찍힌다. host `domTree`는 hover 때 그대로(루트 `dragleave`의 `relatedTarget`이 루트 안의 iframe 요소라 미리보기를 지우지 않는다. 추론). `sawDrop false`, `dragend`만 → 취소. 트리 불변. I1~I7 통과. `output`(telemetry) `loads` +2(hover 리마운트 + 취소 복귀) | `src/components/PanelNodeRenderer.tsx:144-147`, `src/components/TreeLayout.tsx:151-158` |
| `R07-padding` | 패널 밖에서 놓으면 취소. 깨끗하게 끝난다 | 가정(문서에 여백 릴리스 규정 없음) + `doc/TODO.md` 수정 주장 | 루트 `dragleave`(`relatedTarget`이 루트 밖) → 미리보기가 먼저 지워져 `domTree`가 원래대로. `drop` 없음(여백은 dragover를 취소하지 않는다), `dragend` → `finishDrag`(멱등). I1~I7 통과. 카운터 `R07-esc`와 같음 | `src/components/TreeLayout.tsx:151-158, 80-83` |
| `R07-iframe-source` | 소스가 iframe 패널이어도 취소가 깨끗하다. 드래그하지 않은 `output`은 변화 없음 | `doc/TODO.md` 수정 주장, D3 | 통과. `terminal`(telemetry) `loads` +2(소스 자신의 재로드. D3b 하위 관찰), `output` frame +2(D3), `editor` moves +1. `dragend`는 분리된 헤더 노드에 `isConnected false`로 | 위와 같음 |

### R09, R10, R11 — remote 안의 네이티브 드래그

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R09-board` | 카드 순서가 바뀐다. 루트에 `data-dragging-panel-id`가 붙지 않는다. window 버블 단계 `drop` 리스너가 실행된다 | `src/components/PanelNodeRenderer.tsx:73`의 주석(내부 네이티브 드래그는 패널 드래그로 오인되지 않아야 한다), H-DROP-HIJACK은 가정 | 루트에 `data-dragging-panel-id="p-a"`. `dragstart` `types`에 `text/panel-id`와 `application/x-harbor-card`, `effectAllowed 'move'`. `cardMoves` +1(카드 이동은 된다). `drop` 레코드 `stopped: true`(버블 없음). `calls` 비어 있음, 트리 불변. `dragend` 뒤 I1 통과(카드 노드에 건 리스너가 `finishDrag`) | `src/components/PanelNodeRenderer.tsx:71-81, 94, 115-120`, `src/components/TreeLayout.tsx:144-150` |
| `R09-board-local` | 같다 | 같다 | 같다(라이브러리 코어 동작) | |
| `R09-standalone` | 깨끗함 | — | `data-dragging-panel-id` 없음, `types`는 카드 타입만, `lastDragend.dropEffect 'move'` | 레이아웃이 없다 |
| `R10-card` | 옆 패널은 카드를 무시한다. 미리보기 없음, 패널 이동 없음 | `PanelNodeRenderer.tsx:73` 주석 | hover에서 미리보기 `H[p-b,p-a,p-c]`와 `p-a` shadow. 드롭에서 `onMovePanel('p-a','p-b','right',0)` 1건, board 패널 전체가 이동. `cardMoves` +0 | `src/components/PanelNodeRenderer.tsx:71-81, 103-106`, `TreeLayout.tsx:136-143` |
| `R10-img` | 같다 | 같다 | `<img>`도 같다 | |
| `R10-board-local` | 같다 | 같다 | 같다 | |
| `R11-board` | copy 드롭이 성공하고 `dragend`의 `dropEffect`는 `'copy'`(단독 페이지와 같다) | 가정(레이아웃은 패널 드래그가 아닌 드래그에 투명해야 한다) | 드롭은 성공(`copyDrops` +1)하지만 `lastDragend.dropEffect 'move'`. 소스 `effectAllowed`가 패널 `handleDragStart`에서 `'move'`로 덮이고, 존이 준 `dropEffect 'copy'`가 패널 `handleDragOver`에서 `'move'`로 덮인다 | `src/components/PanelNodeRenderer.tsx:76, 85-86` |
| `R11-locked` | 같다 | 같다 | 드롭 **거부**(`copyDrops` +0, `dragend dropEffect 'none'`). `effectAllowed`는 `'copy'`로 남는데(잠긴 패널은 `handleDragStart`가 74행에서 끝난다) 패널이 `dropEffect`를 `'move'`로 강제한다. HTML 명세에서 허용되지 않는 `dropEffect`는 작업 없음(https://html.spec.whatwg.org/multipage/dnd.html) | `src/components/PanelNodeRenderer.tsx:74, 85-86` |
| `R11-standalone` | — | — | `copyDrops` +1, `dropEffect 'copy'` | |

### R12 — iframe 패널 위 드롭

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R12-telemetry` | iframe 패널도 드롭 대상이다. hover에서 미리보기 `H[p-b,p-a,p-c]`, 놓으면 커밋 | `doc/API.ko.md` "드래그 앤 드롭"(마우스와 터치에 같은 드롭 규칙. iframe 예외 없음) | `dragenter`/`dragover`가 `:4304` 프레임에 찍히고 top 프레임의 `p-b` 대상 `dragover`는 없다. `seen.dragover` 증가. `domTree` 불변(미리보기 없음). `underCursorAtDrop 'iframe'`, `sawDrop false`, `dragend`만. 트리 불변. I1~I7 통과 | `src/components/PanelNodeRenderer.tsx:144-147` |
| `R12-telemetry-x` | 같다 | 같다 | 같다. 이벤트가 어느 프레임 프로브에 찍히는지는 S9 결과에 따름(하네스 충실도 단서) | |
| `R12-shield` | (shield는 우회책이다. 기대는 shield 없이도 위와 같아야 한다는 것) | 같다 | `pointer-events: none`으로 `dragover`가 `p-b`/`p-c`에 닿아 미리보기 `H[p-b,p-a,p-c]`, `overShadow`로 커밋. `calls` 1건 | `src/components/PanelNodeRenderer.tsx:78`(마우스 경로만 `data-dragging-panel-id`) |
| (사다리 3단계) 터치로 같은 동작 | 마우스와 같다 | 같다 | 터치는 `document.elementFromPoint` → `<iframe>` → `closest('[data-panel-id]')`로 `p-b`를 잡아 **커밋된다**. 마우스와 결과가 갈린다 | `src/hooks/useTouchDrag.ts:101-103` |

### R14 — 터치 취소

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R14-blocked` | 핸들 터치 드래그가 시작되고, `nav` 위에서 ghost가 차단 표시로 바뀌며, 떼면 취소된다. I1~I7 통과 | `doc/API.ko.md` "패널 잠금 → 드래그 중 동작"(터치: ghost 흐려지고 빨간 테두리), `doc/TODO.md` 수정 주장 | 통과. 핸들 모드는 롱프레스 없이 8px 초과 이동에서 시작(문서 33행과 다름 — 7절 문서 불일치). ghost 1개, `nav` 위에서 `opacity 0.4` + 빨간 outline, `touchend` → `endSession(false)`. `onMovePanel` 0건, 트리 불변, ghost 제거. `touchend`는 분리된 원본 노드에 `isConnected false`. `terminal` frame +2, `output` frame +2(D3), `editor` moves +1 | `src/hooks/useTouchDrag.ts:9, 145-149, 85-93, 160, 243-245, 176` |
| `R14-second` | 두 번째 드래그가 정상 동작하고 커밋된다 | 같다 | 통과. 모듈 전역 `session`이 해제돼 새 세션이 열린다. `onMovePanel('terminal','editor','left',0)` 1건, 트리 `H[nav,terminal,editor,output]` | `src/hooks/useTouchDrag.ts:169-187, 213` |

### R16 — 죽은 remote

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R16-load` | 에러 카드는 orders 패널에만. 나머지 5슬롯 ready. shell 전체가 비지 않는다 | 가정(패널 하나가 죽어도 레이아웃은 조작 가능해야 한다) | 통과(경계는 픽스처가 패널마다 둔다. `shareStrategy 'loaded-first'`가 전제) | `src/components/PanelNodeRenderer.tsx:155`(라이브러리에 경계 없음), [ARCHITECTURE.md](./ARCHITECTURE.md) 「패널 프레임과 경계」 |
| `R16-others` | 다른 패널의 드래그·리사이즈가 동작한다 | 같다 | 통과 | |
| `R16-dead-drag` | 죽은 패널도 핸들로 끌 수 있다 | 같다(핸들이 경계 밖) | 통과. 에러 카드가 함께 이동 | |

### R17 — workbench 순회

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R17-resize` | 8번 모두 방향대로 3px 안에서 변한다. `userSelect` 복원. `nav` 200 유지, `orders` ≥ 320, 하단 ≥ 160. `nav`는 드래그가 시작되지 않는다 | `doc/API.ko.md` `resizeBorder`, "패널 크기 제약", "패널 잠금" | 통과. 패널은 포인터보다 조금 덜 움직인다(Resizer 8px 포함 환산) | `src/components/LayoutNodeRenderer.tsx:61-66`, `src/components/resizerConstants.ts:1`, `src/hooks/useLayoutTree.ts:60-63` |
| `R17-moves` | 커밋 = 미리보기, I1~I7 통과, 드래그하지 않은 패널의 상태 유지 | D3, D3a, `doc/API.ko.md` "드롭 타겟 우선순위" | 트리는 위 이동 표대로. 매 이동에서 드래그하지 않은 패널의 리마운트(frame·content·`mountCalls`·`loads` 증가)와 재삽입(moves, scrollTop 0)이 나온다. 어느 패널이 어느 쪽인지는 이동마다 다르므로 관찰로 적는다. 전부 FC-QA-001과 D3a 발견의 증거다. I1~I7은 통과 | `src/components/LayoutNodeRenderer.tsx:92`, `src/tree/insert.ts:49-52, 66-71`, `src/tree/helpers.ts:45` |
| `R17-nav-toggle` | `removePanel`로 board가 사라지고 split이 풀린다. `insertPanel`로 billing 왼쪽에 다시 생긴다. 다른 패널 상태 유지 | `doc/API.ko.md` `removePanel`, `insertPanel` | 트리는 표대로. 닫기: `V[V[H[orders,telemetry],billing],board]`가 단일 자식으로 풀려 안쪽 내용이 한 단계 올라오면서(`src/tree/helpers.ts:45`) key `split-0` fiber의 노드가 V→H로 바뀌어 `orders` content +1·frame +1, `telemetry` `loads` +1·frame +1, `billing`은 부모 fiber가 바뀌어 `mountCalls`·`unmountCalls` +1·frame +1. 열기: `board` content +1(새 마운트), `billing`이 새 split `H[board,billing]`으로 감싸여(`src/tree/insert.ts:66-71`) `mountCalls`·`unmountCalls` +1 더(누적 +2). `orders`·`telemetry`는 열기에서 추가 없음. `nav`·`telemetry-x`는 변화 없음. 전부 FC-QA-001 증거(사용자 조작이 아닌 API 호출로 생긴 리마운트지만 같은 메커니즘) | `src/tree/helpers.ts:45`, `src/tree/insert.ts:66-71`, `src/components/LayoutNodeRenderer.tsx:92` |
| `R17-visual` | 점검표 전 항목 이상 없음 | 가정 | 이상 없음(remote는 계약대로 `width/height 100%`). 상태 배지의 숫자가 리마운트 수만큼 올라 있는 것은 FC-QA-001의 가시화이지 시각 결함이 아니다 | |

### R18 — 탐색

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R18-mouse`, `R18-touch` | 모든 제스처 뒤 I1~I7 통과 | 불변식 | 통과. 단, Resizer 위에서 놓기와 상단 바·여백에서 놓기는 취소(드롭 없음. sev-3 후보로 관찰), `glide` 커밋은 리마운트 횟수를 키운다(FC-QA-001 증거). 새 종류의 현상이 나오면 재현 스펙으로 | [HYPOTHESES.md](./HYPOTHESES.md) 10절, `src/components/Resizer.tsx:56`(`onPointerDown`만) |

### R19 — 직렬화와 크기 제약

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R19-persist-roundtrip` | 저장 → 새로고침 → 복원 시 레이아웃과 컴포넌트가 복구된다 | `doc/API.ko.md` "ComponentStore → Persistence", `doc/TODO.md` "남은 검증" | 통과. `JSON.parse(localStorage)`가 T1과 같고 복원된 트리가 같은 슬롯을 그린다. 내용 상태는 초기화(store는 직렬화되지 않는다. 결함 아님) | 트리에 원시값만 있다(`src/tree/types.ts:7-30`) |
| `R19-persist-unregistered` | 미등록 키의 패널은 빈 상태로 렌더되고(dev 모드에서만 경고) 앱은 살아 있다 | `doc/API.ko.md` "createComponentStore" 셋째 항목 | 통과. `p-b` 요소 존재, 내용 없음, 콘솔 조용(prod) | `src/components/PanelNodeRenderer.tsx:132-136` |
| `R19-persist-dnd` | 복원 뒤·빈 패널이 있어도 DnD가 정상 동작한다 | `doc/TODO.md` "남은 검증"(DnD 후 정상) | 통과. 빈 패널도 핸들러가 같다 | `src/components/PanelNodeRenderer.tsx:139-156` |
| `R19-size-1280` | 상한 400·하한 200(세로 300·120)이 창 크기 변경(CSS)과 경계선 드래그에서 **같은 px**로 지켜진다(오차 3px) | `doc/API.ko.md` "패널 크기 제약" 둘째 항목 | **`row3-size`(자식 3개): 경계선 드래그의 상한이 설정 px보다 작은 곳에서 멈춘다.** px→flex 환산이 split 전체 px에 인접 두 자식의 flex 합을 곱하므로 비율이 `2/3`이 된다: 400 → 약 267px(루트 폭 1256 기준). 하한: 상태 `size`가 200px에 해당하는 값 아래로 내려가고 화면은 CSS `min-width`에 걸려 200에서 멈춘다. 되돌릴 때(`+50`) 상태가 200px 상당을 넘을 때까지 경계선이 따라오지 않는다(지연). **`pair-size`(자식 2개): 상한 약 397~398px**(Resizer 8px만큼 덜 움직임. 3px 안이 아닐 수 있다. 관찰로 적는다). **`census-vsize`**: `p-b`·`p-c`뿐인 세로 split이므로 pair와 같은 수 px 오차 | `src/components/LayoutNodeRenderer.tsx:61-67`, `src/tree/resize.ts:15-25`, `src/components/panelSizeStyle.ts:23-24`, `src/hooks/useLayoutTree.ts:64-70` |
| `R19-size-800` | 창 폭 800에서도 하한·상한이 같은 px | 같다 | 창 크기 변경(CSS)은 하한 200/150/120을 정확히 지킨다. 경계선 드래그의 상한은 1280 때와 같은 비율로 어긋난다(row3 약 2/3) | 같다 |
| `R19-overflow` | 패널보다 큰 내용은 잘리지 않고 스크롤된다 | `doc/API.ko.md` "콘텐츠 오버플로우" | 통과. 스크롤은 PanelFrame body(`overflow:auto`) 안에서. 패널 wrapper(`overflow:auto`)와 body가 둘 다 스크롤 컨테이너라 이중 스크롤바가 생길 수 있다(픽스처 CSS 문제면 `fixture-bug`) | `src/components/PanelNodeRenderer.tsx:151`, [ARCHITECTURE.md](./ARCHITECTURE.md) 「CSS와 크기」 |

### R04, R06 — DOM 재삽입

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R04-orders` | `p-a`에 아무 변화 없음 | D3a | hover: frame +0, content +0, moves +1, `orders-scroll`의 `scrollTop` 0으로 초기화, input·counter 유지. Esc: 추가 변화 없음 | React keyed 자식 이동 = 제거 후 삽입(`enableMoveBefore` false. [HYPOTHESES.md](./HYPOTHESES.md) 2절), `src/components/LayoutNodeRenderer.tsx:88-121` |
| `R04-billing` | 같다 | D3a | 같다. `mountCalls`·`unmountCalls` +0, `rootsAlive` 1, scrollTop 초기화 | |
| `R04-telemetry` | 같다 | D3a | frame +0인데 `loads` +1, `docId` 변경, 문서 요청 +1(재삽입된 iframe이 다시 로드). Esc 추가 없음 | https://html.spec.whatwg.org/multipage/iframe-embed-object.html |
| `R06-a` | 재로드 없음, 상태 유지 | D3a, D3b | 리마운트 없음. hover(`H[p-c,p-a,p-b]`): `p-a`·`p-b` moves +1(telemetry at B: `loads` +1), `p-c` 그대로. Esc: `p-c`(소스)만 moves +1. 드롭: hover 이후 추가 없음 | `placeChild`의 `lastPlacedIndex` 규칙([HYPOTHESES.md](./HYPOTHESES.md) 2절) |
| `R06-b` | 같다 | D3a, D3b | hover(`H[p-b,p-c,p-a]`): `p-a`(소스)만 moves +1. Esc: `p-b`·`p-c` moves +1(telemetry `loads`가 **취소 때** +1). 드롭: 추가 없음 | 같다 |

### R08 — stale preview와 후속 영향

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R08-stale` | 드래그가 끝났으면 미리보기도 없다 | 불변식(진행 중인 드래그가 없으면 미리보기 없음) | `immediate` 릴리스로 소스가 아닌 패널 위에서 놓으면 stale preview: I1 통과, I2 실패(소스에 shadow), I5는 위치에 따라. 시그니처: `underCursorAtDrop 'other-droppable'`, 마지막 `dragover`가 `drop`/`dragend`와 한 프레임 안. 비율은 S8 표 재사용. 5회 안에 안 나오면 `not-reproduced` | `src/components/PanelNodeRenderer.tsx:103-106`, `src/utils/rafScheduler.ts:4-10`, `src/components/TreeLayout.tsx:80-83`, `src/hooks/useDropPreview.ts:22-26` |
| `R08-chip` | 패널 드래그가 아닌 드롭은 패널을 움직이지 않는다 | 가정(투명성) + 위 불변식 | ext-chip 드롭이 패널 `handleDrop`을 `isPreviewActive`로 통과해 루트 `onDrop`에 닿고 **stale 이동이 커밋된다**: `calls`에 `onMovePanel` 1건, `treeVersion` +1, 프로브의 `dragstart` 대상은 `ext-chip`이고 `data-dragging-panel-id` 없음 | `src/components/PanelNodeRenderer.tsx:94, 119`, `src/components/TreeLayout.tsx:136-143` |
| `R08-resize` | 보이는 경계선을 끌면 그 양쪽 패널이 변한다 | `doc/API.ko.md` `resizeBorder` | 렌더된(미리보기) 트리의 `path`가 커밋된 트리에 적용돼 엉뚱한 쌍이 변하거나(`treeVersion` +1인데 끈 경계선 양쪽 rect는 그대로) 경로가 없어 무시된다(`treeVersion` 그대로) | `src/components/LayoutNodeRenderer.tsx:56-67, 95`, `src/hooks/useLayoutTree.ts:51-56` |

### R13 — 터치 ghost

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R13-control` | 드래그 시작은 내용에 부작용이 없다. ghost 1개, 끝나면 없음. 커밋 `H[p-b,p-a]` | 가정 + `doc/API.ko.md` "드래그 앤 드롭"(ghost) | 정적 복제. ghost가 `[data-theme]` 토큰을 잃는다(계산된 스타일 `--hb-fg` 등이 비어 있음). 커밋에서 `p-a`(소스) moves +1(D3b). `onMovePanel` 1건 | `src/hooks/useTouchDrag.ts:60-74` |
| `R13-orders` | 같다 | 같다 | 정적 복제, 토큰 유실. content +0 | |
| `R13-billing` | 같다 | 같다 | ghost 안 canvas가 비어 있다(`cloneNode`는 비트맵을 복제하지 않는다). 토큰 유실 | |
| `R13-telemetry` | 같다 | 같다 | ghost의 iframe이 문서를 한 번 더 로드: mirror `loads` +1, 새 `docId`, `:4304` 문서 요청 +1, `dom.ghosts[0].iframeCount === 1`. 프레임 안 sessionStorage `harbor.loads.telemetry`도 +1 돼 다음 재로드 때 숫자가 2 뛴다(카운터 오염. 관찰 기록에 적는다). 커밋에서 소스 재삽입으로 실제 iframe도 재로드(`loads` +1 더. D3b) | 같다, [ARCHITECTURE.md](./ARCHITECTURE.md) 「IframeRemote와 mirror」 |

### R15 — iframe 옆 리사이즈

| 케이스 | 기대 (이상) | 오라클 | 예측 (미실행) | 근거 |
|---|---|---|---|---|
| `R15-telemetry` | 포인터가 iframe 위를 지나고 iframe 위에서 놓아도 리사이즈가 끝까지 따라오고 깨끗이 끝난다 | `doc/API.ko.md` `resizeBorder`(Pointer Events + `setPointerCapture`) | 통과(same-site, 같은 프로세스). `gotpointercapture` 1건, 캡처 중 프레임 안 `seen.pointermove` 증가 없음, 방향·3px, `userSelect` 복원 | `src/hooks/useDragResize.ts:20-30, 45-58` |
| `R15-telemetry-x` | 같다 | 같다 | **열린 질문.** 프로세스 밖 iframe 위의 포인터 캡처는 근거가 없다. 가정하지 말고 기록한다. 캡처가 끊기면 `userSelect`가 `none`으로 남고 그 Resizer는 다시 잡히지 않는다(`activePointerId` 잔존) | `src/hooks/useDragResize.ts:19, 45-58` |

### FC-QA-001의 갱신

[../findings/FC-QA-001-preview-remount-non-dragged-panels.md](../findings/FC-QA-001-preview-remount-non-dragged-panels.md)는 상태 `predicted`로 선등록돼 있다. R01·R02·R03·R05가 그 파일의 「기대와 예측」 표를 확인하는 실행이다. 그 파일 "실행 뒤 할 일"을 따르되 아래를 지킨다.

| 시점 | 할 일 |
|---|---|
| R01 뒤 | 드래그하지 않은 패널의 리마운트(frame·content 증가)가 1건이라도 관찰되면: front matter를 채운다(`status: open`, `confidence`, `repro_rate`, `variants: [control-b, control-c]`, `input`, `browser`, `playwright`, `native_touch_drag`). `found_in`은 `pre-run` 그대로. "실제" 절에 R01 표를 그 파일의 「기대와 예측」과 같은 형식으로 적는다(표는 고치지 않는다). 증거를 `promote({ run:'run01-tier1', findingId:'FC-QA-001', ... })`로 `doc/qa/run01-tier1/evidence/FC-QA-001/`에 올린다. 회귀 스펙 `mfa-lab/e2e/regression/fc-qa-001-preview-remount-non-dragged-panels.spec.ts`를 쓴다: `census` 전부 control, hover + Esc 뒤 `p-b`·`p-c`의 `frameMounts`·`mounts` 증가분이 0임을 단언, `test.fail()`. `repro_spec`에 경로. README 11절은 바꾸지 않는다(ID는 이미 있다) |
| R02, R03, R05 뒤 | "실제" 절에 행을 추가한다(`variants`에 슬롯을 더한다). 이미지 한도 6장을 넘기지 않도록 `promote`의 `images`를 고른다(R01 3장 + R05 2장 권장) |
| R07, R14, R17 | `output`의 리마운트(부모가 바뀌는 리마운트), 터치 입력, workbench의 리마운트는 "실제"의 하위 항목으로 한 줄씩. 소스 자신의 리마운트는 "하위 관찰(D3b)"로 |
| 관찰되지 않았을 때 | [../README.md](../README.md) 10절을 따른다: `status: predicted` 유지, `repro_rate: 0/N`, 관찰값과 미리보기 `domTree`를 "실제"에 적고 REPORT.md 4절 H-REMOUNT를 `refuted`로. FC-QA-001 "실행 뒤 할 일" 4번은 `needs-user-confirmation`이라 적혀 있는데 이 브리프는 README를 따른다. 그 사실을 FC-QA-001 "관련" 절에 날짜와 함께 한 줄 적는다 |

D3a(리마운트 없는 재삽입·재로드)는 FC-QA-001이 아니라 **새 발견**이다(R01의 `p-a`, R04, R06, R07의 `editor`). 첫 관찰 때 ID를 발급한다(`FC-QA-002`가 비어 있으면 그것).

---

## 시나리오 반복 절차

시나리오 하나(STATE.md 행 하나)마다 아래를 한다.

| 단계 | 할 일 | 세부 |
|---|---|---|
| 0 | 준비 | 「시나리오 표」의 해당 항목과 「기대와 예측」의 해당 표, [HYPOTHESES.md](./HYPOTHESES.md)의 해당 가설을 읽는다. GO caveat로 `blocked`인 케이스는 실행하지 않고 REPORT.md에 이미 적힌 상태를 유지한다 |
| 1 | explore 스펙 작성 | `mfa-lab/e2e/explore/rNN-<slug>.spec.ts`를 **실행 직전에** 쓴다. 케이스마다 `for (const run of [1, 2]) test(\`<케이스>-run${run}\`, ...)`로 두 번 선언한다(테스트마다 새 컨텍스트). 전제만 단언한다: `lab.open` 성공, `begin`의 신뢰된 `dragstart`, 시작 `domTree`, 미리보기 `domTree`가 표의 값. 라이브러리 동작은 `snapshot`·`diff`·`checkInvariants`로 읽어 `writeObservation`으로 기록한다. `capture('01-before')`, `capture('02-mid')`, `capture('03-after')`. 허용 목록은 시나리오 표에 적힌 것만, 이유 주석과 함께 |
| 2 | 실행 | `node mfa-lab/scripts/ctl.mjs test explore/rNN-<slug>` (600000). 터치는 `--project touch`. 결과는 `mfa-lab/e2e/.artifacts/`와 `doc/qa/run01-tier1/obs/<케이스>-run<N>.json` |
| 3 | 빨간 스펙 | 하네스·픽스처 문제다. 미리보기 `domTree`가 다르면 먼저 `dropPoint`와 좌표를 의심한다. 좌표가 맞는데도 다르면 그 전제 단언을 관찰로 바꾸고 귀속 사다리로 넘긴다. `settle.stable === false`인 단계는 `unsettled`로 표시하고 그 케이스를 다시 실행한다. 헬퍼·픽스처를 고쳤으면 「`mfa-lab/` 변경 규칙」의 재실행을 먼저 한다 |
| 4 | 읽기 | 관찰 JSON을 읽는다. **`02-mid.png`를 Read 도구로 반드시 연다**(`01-before`, `03-after`도 권장). [HARNESS.md](./HARNESS.md) 「스크린샷은 직접 열어 본다」의 대조 항목을 확인한다. 스크린샷과 스냅샷이 어긋나면 둘 다 남기고 원인부터 찾는다 |
| 5 | 판정 | 케이스마다 `as-ideal` / `as-predicted` / `deviates`. 두 실행이 다르면 3회째를 돌리고 `repro_rate`를 적는다. 판정은 관찰 JSON의 `verdict`에 들어간다. 스펙이 사전 등록 값과 비교해 계산한 판정과 Claude가 스크린샷을 보고 내린 판정이 다르면 스펙의 비교 로직(하네스)을 고쳐 다시 실행한다. 사전 등록 문구는 손대지 않는다 |
| 6 | 귀속 | 기대와 다른 케이스마다 [../README.md](../README.md) 7절 귀속 사다리를 적용한다: ① 2회 재현(끝남) ② 대조 교체(시나리오 표의 사다리 열. 추가 행) ③ 입력·릴리스 교체 ④ 하네스 점검(이벤트 순서를 `run00-spike/evidence/baseline/`과 비교, 알려진 부작용 대조) ⑤ 픽스처 점검(단독 페이지) ⑥ 뜻밖의 결과는 `test.use({ probe: false })`로 재실행 ⑦ 오라클. 결과를 발견의 "대조 실험" 표에 적는다 |
| 7 | 분류 | 「분류 기본값」으로 class·`decision_ref`·`severity`·기존 발견 여부를 정한다 |
| 8 | 발견 작성 | 새 ID: [../README.md](../README.md) 11절 "다음 빈 ID". [../TEMPLATE-finding.md](../TEMPLATE-finding.md)의 코드 블록을 `doc/qa/findings/FC-QA-NNN-<slug>.md`로 복사해 채운다. 증거: 해당 explore 케이스 끝에 `promote({ run:'run01-tier1', findingId:'FC-QA-NNN', caseDir, images:[...] })` 한 줄을 추가하고 그 케이스를 다시 실행한다(6장 이하). 회귀 스펙 `mfa-lab/e2e/regression/fc-qa-NNN-<slug>.spec.ts`: `test.fail()` + `annotation: { type:'issue', description:'FC-QA-NNN' }`, 이상적 동작을 단언하는 최소 재현. `node mfa-lab/scripts/ctl.mjs test regression/fc-qa-NNN`으로 1회 실행해 "예상대로 실패"인지와 실패 이유가 오라클 단언인지(`results.json`) 확인한다. "예상과 달리 통과"면 재현되지 않는 것이므로 발견을 올리지 않는다. README 11절 표에 행 추가 + "다음 빈 ID" 갱신, STATE.md "발견 ID" 갱신 |
| 9 | 기존 발견에 더하기 | FC-QA-001(「FC-QA-001의 갱신」), stale preview 시그니처(`dup_of`), D3a 발견(첫 관찰 뒤)은 새 파일 대신 그 파일의 "실제"·"관련"에 날짜와 함께 덧붙이고 `variants`를 늘린다. 증거 디렉터리는 발견당 하나 |
| 10 | REPORT.md | 2절 해당 행의 상태·"기대 대비"·관찰 기록 경로. 추가 행(사다리 변형). 3절 발견 목록. 4절 가설 판정(결정 가능해진 가설). 6절 통합 가이드 후보(D4 등). 8절 환경 한계(새로 안 것). 10절(픽스처 수정, Amendments 요약) |
| 11 | STATE.md | 행 체크, 커밋, 날짜, 시도 횟수, 결과(`pass`: 모든 케이스 `as-ideal` / `fail(FC-QA-NNN, ...)`: 발견이나 기존 발견의 증거 추가가 있음 / `blocked(...)` / `not-run(...)`), "다음 작업" |
| 12 | 커밋·푸시 | 「커밋 규칙」. `test: [RNN] ...`(explore·regression 스펙), `docs: [RNN] ...`(obs, evidence, findings, README, REPORT, STATE) |

관찰 JSON의 필드는 [HARNESS.md](./HARNESS.md) `writeObservation`의 것이다: `run`, `scenario`, `case`, `expected`, `predicted`, `observed`, `verdict`, `labels`(`input`, `browser`, `playwright`, `native_touch_drag`, `MF degraded ...`, `emulated`, `harness_amplified`, `contaminated`, `unsettled`, 터치 문장), `lib`, `invariants`, `artifacts`.

---

## 분류 기본값

관찰에 적용하는 초기값이다. 귀속 사다리의 결과가 다르면 사다리가 우선한다. 결정은 [../README.md](../README.md) 8절(D1~D6)이고 세션은 새 결정을 만들지 않는다.

| 관찰 | class | `decision_ref` | 발견 처리 | 심각도 초기값 |
|---|---|---|---|---|
| 드래그하지 않은 패널이 React 리마운트된다(frame·content·`mountCalls`·`loads` 증가. 미리보기 변화·취소·부모 변경·split 풀림 모두) | `library-bug` | D3 | **FC-QA-001**에 증거 추가. 새 발견 아님. `root_cause_group: split-index-key` | sev-2 |
| 드래그하지 않은 패널이 리마운트 없이 DOM 재삽입된다(moves 증가, scrollTop 0, iframe `loads` 증가인데 frame +0) | `library-bug` | D3a | **별도 발견 1건**(모든 컨테이너를 `variants`로 묶는다. iframe 재로드는 같은 원인의 결과) | sev-2(iframe 재로드) / sev-3(스크롤만) |
| 드래그한 패널 자신의 리마운트·재삽입·재로드 | — | D3b | 별도 발견 아님. 위 두 발견의 "실제"에 "하위 관찰(D3b)"로 | — |
| iframe 내용 안에서 드래그를 시작할 수 없다 | (class 아님) | D4 | 발견 파일 없음. REPORT.md 6절 "통합 가이드 후보" | — |
| iframe 패널이 마우스 드롭 대상이 되지 않는데 터치는 된다(R12 + 사다리 3단계) | `library-bug`(경로 불일치) | — | 발견 1건. shield CSS와 host가 그리는 핸들을 6절 가이드 후보로 함께 적는다. 터치 사다리 단계가 `blocked(터치 env-limit)`면 「S7a (터치 게이트)의 시점」의 규칙(마우스 관찰로 발견은 내되 "경로 불일치"를 주장하지 않고 `blocked_by: 터치 env-limit`) | sev-3 |
| stale preview 시그니처([HARNESS.md](./HARNESS.md) 「stale preview 판정 규칙」) | `library-bug`, `harness_amplified: true` | — | 발견 **1건**. 이후 같은 시그니처는 `dup_of`. 그 제스처의 카운터는 `contaminated`로 표시하고 `overShadow`로 재측정 | sev-2(`R08-chip`의 stale 커밋이 관찰되면) / sev-3 |
| 시그니처 밖의 stale preview(`underCursorAtDrop 'source'`, Esc·잠긴 패널 뒤) | 조사 | — | 새 후보. 사다리 4단계(하네스) 먼저 | sev-1 후보 |
| 취소 뒤 `data-dragging-panel-id`·shadow·ghost 잔존, 터치 세션 미해제(R07, R14) | `library-bug` | — | 발견. 단, stale 시그니처면 위의 중복 | sev-1 |
| 내용의 네이티브 드래그가 패널 이동이 된다(R09·R10) | `library-bug` | — | 발견. 오라클은 `src/components/PanelNodeRenderer.tsx:73` 주석 | sev-2 |
| `dropEffect` 덮어쓰기, copy 드롭 거부, drop 전파 중단(R09·R11·R08-chip) | `spec-question`(버그 권고) | — | 발견, `status: needs-user-confirmation`. 단독 페이지와의 차이를 대조 결과로. 후보 오라클이 있으므로 회귀 스펙을 만든다 | sev-2 |
| 터치 ghost의 부작용(iframe 재로드, 빈 canvas, 토큰 유실) | `spec-question`([../README.md](../README.md) 6절 4번: 오라클이 "가정"뿐) | — | 발견 1건(`variants`로 묶음), `status: needs-user-confirmation`, 본문에 "권고: library-bug". [HYPOTHESES.md](./HYPOTHESES.md)의 기본 분류 `library-bug 후보`와 다르면 그 사실을 적는다 | sev-3 |
| 리사이즈의 `userSelect` 누수·캡처 유실(R15, R17) | `library-bug` | — | 발견. `telemetry-x`(OOPIF)에서만이면 `variants`에 그 사실 | sev-1(Resizer가 다시 잡히지 않음) / sev-3 |
| CSS 한계와 경계선 드래그 한계의 px 차이가 3px 초과(R19) | `library-bug` | — | 발견. `root_cause_group: resize-flex-conversion`. remote 자신의 CSS가 원인이면 가이드 후보 | sev-3 |
| 직렬화 복원·미등록 키·복원 뒤 DnD가 문서와 다름(R19) | `library-bug` | — | 발견 | sev-2 |
| 핸들 모드 터치가 롱프레스 없이 8px 이동으로 시작한다(S7a·R13·R14에서 확인) | `spec-question`(docs) | — | 발견 1건, `status: needs-user-confirmation`, `repro_spec: none`. 문서를 고칠지 코드를 고칠지는 사용자가 정한다 | sev-4 |
| 롱프레스 중 네이티브 `dragstart`·`touchcancel`(P1, 레인 B) | `library-bug` 후보 | — | 발견. `env-limit`으로 분류하지 않는다 | sev-2 |
| [HARNESS.md](./HARNESS.md) 「알려진 하네스 부작용」과 일치 | `harness-artifact` | — | 발견 파일 없음. 관찰 기록에 라벨만. 새 부작용이면 발견을 만들고 HARNESS.md 추가를 REPORT.md에 제안 | — |
| remote 하나에서만 재현되고 컨테이너 대조군·twin은 깨끗 | `fixture-bug` | — | 「`mfa-lab/` 변경 규칙」대로 고치고 REPORT.md 10절. `lateResolves > 0`도 여기 | — |
| 관찰할 수단이 없음(OS 커서, 실기기, OOPIF 캡처 등) | `env-limit` | — | REPORT.md 8절. 발견 파일은 수동 확인 항목이 "그 자체로 결함 의심"일 때만 | — |

컨테이너 대조군 규칙

- 현상이 `control-iframe`·`control-mount`에서는 나오고 `control-*`에서는 안 나오면 **컨테이너 고유 현상**이다. "iframe이다 / 별도 루트다"라는 사실에서 나오는 것이므로 픽스처 탓이 아니고, 분류는 [HYPOTHESES.md](./HYPOTHESES.md)의 해당 가설 기본값을 따른다(예: 드래그하지 않은 iframe 패널의 재로드 → D3a `library-bug`).
- `fixture-bug`는 **컨테이너 대조군이 깨끗할 때만** 붙인다.
- `control-mount`와 `billing`은 두 가지가 다르다(host의 React 사용, `unmount`를 `queueMicrotask`로 지연). 둘의 결과가 다르면 두 차이를 모두 적는다.
- `telemetry`에는 twin이 없다. iframe 고유 현상은 `control-iframe`으로 가린다.

MF degraded

- `MF: degraded`에서는 remote와 twin이 같은 모듈이다. R16 전체와 모든 remote 대 twin 비교는 `blocked(MF degraded)`. orders·board를 쓰는 다른 행은 실행하고 라벨 `MF degraded (빌드 타임 통합)`을 붙인다. REPORT.md 1절·8절에 적는다.

심각도는 [../README.md](../README.md) 4절 기준으로 최종 결정한다. 애매하면 높은 쪽으로 매기고 이유를 "실제" 절에 적는다. 분류를 정할 수 없으면 `needs-user-confirmation`으로 두고 REPORT.md 5절 "사용자 결정 대기"에 질문·선택지·권고를 적는다.

---

## P1

STATE.md 행 `B2-P1`. 필수·둘째 묶음의 발견을 **모두 쓴 뒤에만** 한다. 전부 `not-run(사유)` 가능. 결과는 REPORT.md 2-3절.

| 항목 | 가설 | 입력 | 절차 (미실행) | 기본 상태 |
|---|---|---|---|---|
| 핸들 없는 모드의 상호작용, 남아 있는 `draggable` | H-HANDLE-STALE | mouse | `?layout=pair&a=billing&b=control-b`: `billing-stopprop` 체크 → `begin('billing')` → `cancelEsc()` → 스냅샷의 `dom.panels['p-a'].draggable` → `billing-text`(또는 `billing-scroll`) 위에서 `mouse.down` → 6px 이동 → `settle` → 프로브에 `dragstart`가 있는지, `data-dragging-panel-id`가 붙는지 → Esc. 이어서 `?drag=panel`에서 `billing-range` 슬라이더 드래그와 `billing-text` 텍스트 선택이 패널 드래그와 충돌하는지 | 실행 |
| 드래그 가능한 패널 롱프레스 | H-TOUCH-NATIVE-RACE | touch-cdp-longpress | 레인 B(Chromium 153)에서만. `?layout=pair&drag=panel`, `touch` 프로젝트: `longPressDrag(page, 'p-a', [dropPoint('p-b','right',0)], 'end')`. 새 컨텍스트. 프로브의 롱프레스 구간 `dragstart`(`isTrusted`)·`touchcancel`, ghost, `data-dragging-panel-id` 기록. 페이지가 네이티브 드래그 상태로 남을 수 있으므로 케이스마다 새 페이지 | 레인 A·C면 `not-run(Chromium 141: 네이티브 터치 드래그 off)` |
| 크기·넘침 조합 | H-SIZING | mouse | `?layout=census&b=<remote>`를 orders·billing·telemetry·control-iframe·control-mount로, 뷰포트 1280x800과 800x600: 패널·body·내용의 `scrollWidth/clientWidth`, `scrollHeight/clientHeight`, 이중 스크롤바, iframe 요소 크기 = body 크기, orders 표(`min-width 480`)가 좁은 패널에서 가로 스크롤되는지 | 실행 |
| workbench glide churn | H-REMOUNT | mouse | `?layout=workbench`: `begin('billing')` → `glide(dropPoint('telemetry-x','right',0), 40)` → `release()`. 슬롯별 카운터 증가분(미리보기 변화 횟수에 비례할 것으로 예측) | 실행 |
| dev 모드 host 콘솔 확인 | — | mouse | `ctl.mjs`에 dev 명령이 없다. 추가하려면 `mfa-lab/` 변경 규칙을 따른다. shell만 Vite dev 서버로 띄우고 remote는 preview인 채로 S1·S3·R01을 돌려 `devWarn` 콘솔 문구를 모은다 | `not-run(ctl에 dev 모드 없음)` |
| packed-tarball 확인 | — | mouse | 루트에서 `npm run build && npm pack`이 필요하다. 세션 2는 루트 `npm ci`를 하지 않으므로 하지 않는다 | `not-run(루트 npm ci 금지)` |

---

## 종료 조건

STATE.md 행 `B2-END`. 전부 참이어야 닫는다.

| 조건 | 확인 방법 |
|---|---|
| 커버리지 표의 모든 행이 `pass` / `fail(FC-QA-NNN)` / `blocked(사유)` / `not-run(사유)` 중 하나다 | REPORT.md 2절. 빈 칸 없음 |
| 모든 발견이 완전하다 | 발견 파일마다: front matter 전부 채움(`none` 포함), `repro_rate` 2회 이상, "증거" 표와 `evidence/FC-QA-NNN/`(이미지 6장 이하), "기대(오라클)"의 근거, "대조 실험" 표, class, `repro_spec`(해당 class), README 11절 대장과 STATE.md "발견 ID" 일치 |
| FC-QA-001의 상태가 결정됐다 | `open`(증거 첨부) 또는 `predicted` 유지 + REPORT.md 4절 `refuted` |
| 회귀 스위트가 2회 연속 초록이다 | `node mfa-lab/scripts/ctl.mjs stop` → `up`(600000) → `test regression`(600000) 2회, 터치 발견이 있으면 `test regression --project touch` 2회. 초록 = 모든 `test.fail()` 스펙이 "예상대로 실패". "예상과 달리 통과"가 나오면 그 발견은 재현되지 않는 것이다: `confidence: low`로 내리고 "관련" 절에 기록하고 REPORT.md 3절에 적는다. 전제 실패로 "예상대로 실패"가 된 것은 없는지 `results.json`으로 확인 |
| REPORT.md가 완성됐다 | 0 요약, 1 환경(GO 줄, caveat 행, 사전 점검), 2 커버리지(2-1, 2-2, 2-3), 3 발견 목록, 4 가설 판정(모든 가설, `untested`는 사유), 5 수정 대기열(`library-bug`·`open`만, `root_cause_group`별, 양식의 권장 순서 규칙 적용, "사용자 결정 대기", "라이브러리 수정 대상이 아닌 발견"), 6 통합 가이드 후보(관찰로 확인된 것만), 7 `doc/TODO.md` 대응표(5행 모두 결과 채움. R19 범위 메모 포함), 8 환경 한계와 수동 확인(GO caveat, OOPIF, 세션 1과 달라진 것 포함), 9 2차 범위 권고(5후보 모두 근거·권고·순서), 10 세션 기록 |
| 수정 금지 경로의 diff가 비어 있다 | `git diff --stat <시작 커밋>..HEAD -- src package.json package-lock.json tsconfig.json vite.config.ts`와 `git status --short -- src package.json package-lock.json tsconfig.json vite.config.ts`가 아무것도 출력하지 않는다. `<시작 커밋>`은 STATE.md의 값 |
| 서버가 내려가 있다 | `node mfa-lab/scripts/ctl.mjs stop` → `node mfa-lab/scripts/ctl.mjs status`가 전부 내려감 |
| 전부 푸시됐다 | `git status --short`가 비어 있고 `git log origin/<작업 브랜치>..HEAD`가 비어 있다 |
| STATE.md가 닫혀 있다 | B2 행 전부 체크(`blocked`·`not-run`도 체크), "다음 작업"이 `B2-END 완료 (사용자: REPORT.md 확인, PR 머지)` |

최종 보고에 넣을 것: 작업 브랜치 이름, 커버리지 요약(pass / fail / blocked / not-run 수), 발견 목록(ID, 제목, 심각도, class, status), 수정 대기열 순서, 사용자 결정 대기 질문, 환경 한계(수동 확인 항목), `mfa-lab/`에서 고친 것, 사용자가 할 일(REPORT.md 읽기, 작업 브랜치를 PR로 `qa/mfa-lab`에 머지 커밋으로 합치기, 결정 대기 답하기, [../FIXING.md](../FIXING.md) 11절로 수정 대기열을 `doc/TODO.md`에 옮기기).

---

## Amendments

이 문서를 바꿔야 할 때 여기에 날짜, 바꾼 사람/세션, 내용을 적는다. 「기대와 예측」의 문구는 어떤 경우에도 고쳐 쓰지 않고, 바뀐 헬퍼 이름·막힌 행·대체한 앵커 같은 운영상 변경만 적는다. 세션 1(B1-08)과 세션 2가 쓴다.

| 날짜 | 세션 | 내용 |
|---|---|---|
| 2026-10-07 | 세션 1 (B1-08) | 헬퍼 시그니처: `snapshot(page, step)`, `checkInvariants(page, opts?)`, `expectInvariants(page, opts?)`, `capture(page, testInfo, label, opts?)`, `finishCase(page, testInfo, since?)`(케이스 끝 `events.json`·`console.txt`). 이 문서의 `snapshot`·`checkInvariants`·`capture` 호출은 `lab` 대신 `page`(와 `test.info()`)를 넘긴다. `diff(before, after)`, `seedContent(page, slot)`(iframe 슬롯은 프레임 안 `tele-input`·`tele-scroll`), `writeObservation`, `promote`는 이름 그대로다. 위치: `mfa-lab/e2e/helpers/{snapshot,invariants,evidence}.ts` |
| 2026-10-07 | 세션 1 (B1-08) | `teleport`: 대상 요소가 바뀌는 이동이면 같은 점으로 한 번 더 움직인다(Blink가 그 갱신의 dragover를 미룸). teleport당 dragover 1회는 그대로다. 터치 `handleDrag`: 시작 이동이 12px → 24px 두 번이다(Chromium touch slop). 8px 문턱 바로 위의 터치 시작은 이 하네스로 볼 수 없다 |
| 2026-10-07 | 세션 1 (B1-08) | Playwright 실행 인자에 `--site-per-process`가 있다. 이 인자 없이는 `telemetry-x`가 OOPIF가 아니었다. `telemetry-x OOPIF: yes`(인자 기준) |
| 2026-10-07 | 세션 1 (B1-08) | S9 관찰: cross-origin iframe(`telemetry`, `telemetry-x`) 위의 CDP 마우스 드래그 이벤트는 host에도 iframe 문서에도 오지 않는다(HARNESS 부작용 #7). R07의 iframe 경우·R12·R15의 iframe 위 마우스 관찰에는 하네스 충실도 단서를 붙이고, 사다리 3단계(터치)와 `control-iframe` 대조를 함께 적는다 |
| 2026-10-07 | 세션 1 (B1-08) | blocked 행 없음: MF on(기본 설정 단), 터치 ok, `telemetry-x` 로드됨, remote 막힘 없음. S7b: 레인 B headless shell에서 네이티브 `dragstart`·`touchcancel` 미관찰 |
| 2026-10-07 | 세션 1 (B1-08) | 스모크 스펙 `smoke/orders`의 (c) 케이스는 `EXPECT_ORDERS_STAMP`가 있을 때만 돈다(없으면 skipped 1). S8 스펙은 환경 변수 `S08_RUN_ID`로 실행을 구분한다 |
