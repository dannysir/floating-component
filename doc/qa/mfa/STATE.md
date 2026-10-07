# STATE — 체크포인트 대장

> 이 문서는
> - 클라우드 세션 1(구축)과 세션 2(검수)의 진행 상태를 적는 대장이고, 재개할 때의 **유일한 기준**이다. 클라우드 VM은 회수될 수 있고 실행 중이던 프로세스는 복원되지 않는다. 푸시된 이 파일만 남는다.
> - 읽는 사람: 세션을 시작하거나 재개하는 클라우드 Claude(가장 먼저 읽는다), 그리고 진행을 확인하는 사용자.
> - 의존 문서: [BRIEF-1-build.md](./BRIEF-1-build.md)(B1 단계의 내용과 게이트), [BRIEF-2-inspect.md](./BRIEF-2-inspect.md)(B2 단계와 시나리오 R01~R19).
> - 초기 상태(2026-10-02 작성)다. 아직 아무 단계도 실행되지 않았다.

## 다음 작업

`R02`

이 줄은 항상 한 줄이다. 단계를 닫을 때마다 다음 단계 ID로 바꾼다. 중단 조건으로 멈췄으면 같은 단계 ID 뒤에 `(doc/qa/BLOCKED.md 참고)`를 붙인다. B1-08을 닫으면 `B2-00 (사용자 GO 결정 대기)`로 적는다.

## 재개 명령

저장소 루트에서 실행한다. 푸시하지 않은 작업은 사라졌다고 본다.

```bash
git status --short && git log --oneline -5 && git rev-parse --abbrev-ref HEAD
# B1-02가 체크된 뒤부터:
node mfa-lab/scripts/ctl.mjs up            # Bash timeout 600000
node mfa-lab/scripts/ctl.mjs test smoke    # Bash timeout 600000
```

그다음 아래 체크리스트에서 **체크되지 않은 첫 행**부터 진행한다. 세션 1의 전체 절차는 [BRIEF-1-build.md](./BRIEF-1-build.md) "재개 절차", 세션 2는 [BRIEF-2-inspect.md](./BRIEF-2-inspect.md) "사전 점검"에 있다. `doc/qa/BLOCKED.md`가 있으면 먼저 읽는다.

## 갱신 규칙

- 단계 하나(세션 2는 시나리오 하나)를 닫을 때마다 이 파일을 갱신하고 커밋·푸시한다.
- 완료: `[ ]`를 `[x]`로. 커밋: 그 단계 작업을 담은 마지막 커밋의 `git rev-parse --short HEAD`. 날짜: `date -u +%Y-%m-%dT%H:%MZ`. 시도 횟수: 게이트를 실행한 횟수.
- 결과 한 줄에 쓰는 말

| 세션 | 값 |
|---|---|
| 세션 1 (B1) | `통과` / `실패: <이유>` / `blocked(<변형>): <이유>` / `http-only`(이 경우 체크하지 않는다) |
| 세션 2 (B2, R) | `pass` / `fail(FC-QA-NNN, ...)` / `blocked(<이유>)` / `not-run(<이유>)` |

- `blocked(...)`와 `실패`로 닫은 행도 체크한다. 체크하지 않으면 재개할 때 그 행으로 되돌아간다. 중단 조건으로 멈춘 단계와 `http-only` 단계만 체크하지 않고 둔다.
- "시작 커밋"은 한 번 적은 뒤 덮어쓰지 않는다.

## 체크리스트

| 완료 | 단계 | 커밋 | 날짜(UTC) | 시도 횟수 | 결과 한 줄 |
|---|---|---|---|---|---|
| [x] | B1-00 환경 탐침 | e89991c | 2026-10-07T00:58Z | 1 | 통과 (Node v22.22.0, npm ping ok, 레인 후보 B, 트리 해시 일치) |
| [x] | B1-01 브라우저 확보 (S0) | 78f858f | 2026-10-07T01:01Z | 1 | 통과 (레인 B 첫 시도, rAF 62/s, CDP 터치 trusted) |
| [x] | B1-02 shell + `ctl.mjs` + 계측 | 803de8b | 2026-10-07T01:08Z | 1 | 통과 (`ctl smoke` OK, `smoke/shell` 5/5, 소스 alias + dedupe, 루트 node_modules 없음) |
| [x] | B1-03a 프로브·마우스 드래그 (S1) | e032a1c | 2026-10-07T01:09Z | 2 | 통과 (1회차: 대상이 바뀌는 teleport에서 Blink가 dragover를 미룸 → teleport에 같은 점 재이동 추가) |
| [x] | B1-03b 불변식·취소 경로 (S2~S4) | 97d303d | 2026-10-07T01:12Z | 1 | 통과 (S1~S4 + I1~I7, S3·S4의 dragend는 분리된 원본에만 기록) |
| [x] | B1-03c npm 0.5.1 양성 대조 (S5) | 69e663b | 2026-10-07T01:13Z | 1 | 통과 (S5 요구대로 실패: I1·I2 둘 다 실패) |
| [x] | B1-03d 리사이즈 (S6) | 3930df3 | 2026-10-07T01:14Z | 1 | 통과 (+148.1 px, 오차 1.9 px, gotpointercapture, userSelect 복원) |
| [x] | B1-03e 터치 (S7a, S7b) | 831126e | 2026-10-07T01:16Z | 2 | 통과 (S7a: 1회차 touch slop으로 첫 12px touchmove 억제 → 12+24px로 분할. S7b 기록: 네이티브 dragstart·touchcancel 없음) |
| [x] | B1-03f rAF 경합 비율 표 (S8) | 2b7fd5c | 2026-10-07T01:19Z | 1 | 통과 (overShadow 0/10; settled×other 6/10, immediate×other 8/10. S10 선택: 풀 바이너리 S1~S3 통과, 기준선 동일) |
| [x] | B1-04 `mfe-billing` + mount 어댑터 | 9120d55 | 2026-10-07T01:21Z | 1 | 통과 (`ctl smoke` remote-entry.js 본문·단독 페이지, `smoke/billing` 3/3: billing reactSame false·rootsAlive 1·lateResolves 0, control-mount·billing-local reactSame true) |
| [x] | B1-05 `mfe-telemetry` + iframe 어댑터 (S9) | c6c78c7 | 2026-10-07T01:24Z | 1 | 통과 (`smoke/telemetry`: telemetry·telemetry-x·control-iframe 모두 loads 1, mirror 1, 문서 요청 1. S9 기록: OOPIF는 `--site-per-process`로 yes, cross-origin iframe 위 CDP 드래그 이벤트는 어느 프레임에도 안 찍힘) |
| [x] | B1-06 `mfe-orders` (twin → federation) | 2235019 | 2026-10-07T01:28Z | 1 | 통과 (사다리 단: 기본 설정. (a) orders same-tree·reactSame true·mf on·manifest/remoteEntry 요청, (b) :4301 차단 시 census 정상·workbench는 error-orders만, (c) deploy-2 독립 배포·shell buildId 불변, (d) S1·S2·S3·S6 기준선 동일·S5 요구대로 실패) |
| [x] | B1-07 `mfe-board` | 268e694 | 2026-10-07T01:30Z | 1 | 통과 (B1-06과 같은 기본 설정 단. board·orders reactSame true 동시, 단독 페이지, :4302/:4301 차단 시 해당 패널만 error, workbench 6슬롯 ready, Nav 토글 domTree 복원. size 차이는 SPIKE 8절) |
| [x] | B1-08 인계 | 2504c5e | 2026-10-07T01:38Z | 2 | 통과 (깨끗한 상태 `ctl up` 39초, smoke 3회 연속 초록(1회차 시도는 B1-06 시점 단언 `skipped=['board']`가 낡아 실패 → 갱신), S1·S3·S6 통과·S5 요구대로 실패, 문서 갱신, diff 검사 빈 출력, 서버 종료. SPIKE 권고 GO, 막히는 run 01 행 없음) |
| [x] | B2-00 사전 점검 | 1989b98 | 2026-10-07T01:58Z | 1 | pass (GO caveat 없음 → blocked 행 없음. smoke 19 passed·1 skipped, S1·S3·S6 통과, S5 요구대로 실패, S7a 통과, 트리 해시 일치) |
| [x] | R01 (필수 묶음) | (R01 커밋) | 2026-10-07T02:06Z | 2 | fail(FC-QA-001, FC-QA-002) — hover·Esc 모두 예측대로(2/2), 대조 bare도 재현 |
| [ ] | R02 (필수 묶음) | | | | |
| [ ] | R03 (필수 묶음) | | | | |
| [ ] | R05 (필수 묶음) | | | | |
| [ ] | R07 (필수 묶음) | | | | |
| [ ] | R09 (필수 묶음) | | | | |
| [ ] | R10 (필수 묶음) | | | | |
| [ ] | R12 (필수 묶음) | | | | |
| [ ] | R14 (필수 묶음) | | | | |
| [ ] | R16 (필수 묶음) | | | | |
| [ ] | R17 (필수 묶음) | | | | |
| [ ] | R18 (필수 묶음) | | | | |
| [ ] | R19 (필수 묶음) | | | | |
| [ ] | R04 (두 번째 묶음) | | | | |
| [ ] | R06 (두 번째 묶음) | | | | |
| [ ] | R08 (두 번째 묶음) | | | | |
| [ ] | R11 (두 번째 묶음) | | | | |
| [ ] | R13 (두 번째 묶음) | | | | |
| [ ] | R15 (두 번째 묶음) | | | | |
| [ ] | B2-P1 | | | | |
| [ ] | B2-END | | | | |

행의 순서가 실행 순서다. 시나리오 번호 순이 아니다. 시간이 모자라 끝에서부터 `not-run`으로 줄이는 것은 "두 번째 묶음"에서만 허용된다.

## 환경 사실

값은 비어 있다. 오른쪽 단계에서 알게 되면 채운다.

| 항목 | 값 | 기록 단계 |
|---|---|---|
| 작업 브랜치 | `qa/mfa-lab` (세션 1), `qa/mfa-lab` (세션 2, 같은 세션에서 이어감) | B1-00 (세션이 바뀌면 덧붙인다) |
| Node 버전 | v22.22.0 (npm 10.9.4) | B1-00 |
| shallow clone 여부 (yes/no) | yes | B1-00 |
| 레인 (B/A/C) | B | B1-01 |
| Playwright | 1.63.0 | B1-01 |
| Chromium 빌드 | 153.0.8010.12 (리비전 1243, headless shell) | B1-01 |
| detached 서버 생존 (yes/no) | yes (새 Bash 호출의 `ctl status` = alive·ready) | B1-02 |
| 라이브러리 소스 (src/dist) | src | B1-02 |
| 터치 (ok/env-limit) | ok | B1-03e |
| telemetry-x OOPIF (yes/no/env-limit) | yes (`--site-per-process` 인자로. 인자 없이는 no). 호스트 `localhost` | B1-05 |
| MF (on/degraded) | on (`shareStrategy: 'loaded-first'`, 기본 설정 단) | B1-06 |
| blocked 변형 | 없음 | B1-04~B1-07 |

## 라이브러리 식별

검수 대상은 이 브랜치의 `src/`다. 기록마다 아래 두 값을 남긴다.

| 항목 | 값 | 명령 |
|---|---|---|
| 트리 해시 (1차 식별) | `c1da6c9dc03a4811eea42c220be309e5e73b0a4a` | `git rev-parse HEAD:src` |
| 커밋 (2차 식별) | `ea25ff7` | `git rev-list -1 HEAD -- src` |
| 시작 커밋 (diff 검사 기준) | `e8e2d8f5bea60f800a83a095ae05d652ad114ea3` | `git rev-parse HEAD` |

- 트리 해시는 shallow clone에서도 같다. 커밋 값은 shallow clone이면 달라질 수 있으므로 트리 해시를 기준으로 삼는다.
- B1-00에서 트리 해시가 위 값과 다르면 `src/`가 문서 작성 뒤 바뀐 것이다. 실제 값으로 고치고 체크리스트 결과 칸에 적는다.
- 세션 1·2의 종료 조건: `git diff --stat <시작 커밋>..HEAD -- src package.json package-lock.json tsconfig.json vite.config.ts`가 비어 있어야 한다.

## 결정

사용자 결정 (바꾸지 않는다)

- D1. MFA는 마이크로 프론트엔드 아키텍처를 뜻한다.
- D2. 기존 remote 프로젝트는 없다. MFA 원칙으로 설계해 이 저장소 안에 처음부터 만든다. 범위는 설계에 위임한다.
- D3. 미리보기로 인한 넓은 리마운트는 결함(`library-bug`)이다.
  - D3a. 드래그하지 않은 패널이 React 리마운트 없이 DOM 재삽입으로 초기화되는 것(iframe 재로드, 스크롤·포커스 초기화)도 `library-bug`이고 별도 발견으로 등록한다.
  - D3b. 드래그한 패널 자신의 리마운트·재삽입은 같은 발견 안의 하위 관찰이다. 별도 발견이 아니다.
- D4. "iframe 내용 안에서 드래그를 시작할 수 없다"는 버그가 아니라 통합 가이드다.
- D5. 로컬 세션은 문서만 쓴다. 클라우드 세션 1이 구축하고 세션 2가 검수한다. 수정은 그 뒤에 발견 하나씩 한다.
- D6. 클라우드 세션의 커밋·푸시·설치 허락은 CLAUDE.md가 아니라 사용자가 입력하는 프롬프트에 있다. 범위는 `mfa-lab/`, `doc/qa/`, `.gitignore`다.

세션 중 결정 (생기면 날짜·단계와 함께 한 줄씩 추가. 예: dist 대체 사용, `--mf off` 사용, 통과한 federation 사다리 단)

- 2026-10-07 B1-03a: `teleport`는 이동 직후 dragover가 없으면 같은 점으로 한 번 더 이동한다(Blink가 대상 변경 시 dragover를 미룸). teleport당 dragover 1회 규칙은 유지된다.
- 2026-10-07 B1-03e: 터치 `handleDrag`의 시작 이동을 12px → 24px 두 번으로 나눈다(Chromium touch slop이 첫 12px touchmove를 억제).
- 2026-10-07 B1-03f: S10용 Playwright 프로젝트 `mouse-full`(`channel: 'chromium'`)을 설정에 둔다. shell `index.html`에 빈 favicon(풀 바이너리의 /favicon.ico 404 방지).
- 2026-10-07 B1-05: `playwright.config.ts`의 `launchOptions.args`에 `--site-per-process`를 추가한다(B1-05 사다리 telemetry-x 3). headless shell 기본값에서는 telemetry-x가 OOPIF가 아니었다. 추가 뒤 S1~S6·S7a 재실행 통과, 기준선 동일.

## 차단 사항

- (없음)

중단 조건으로 멈추면 코드(`BLOCKED-...`), 단계, 날짜를 한 줄로 적는다. 자세한 내용은 `doc/qa/BLOCKED.md`에 쓴다. 해소되면 줄을 지우지 말고 "해소: <날짜>, <커밋>"을 덧붙인다.

## 사용자 GO 결정

- SPIKE.md를 읽었고 GO(caveat: 없음. 참고: cross-origin iframe 위 CDP 마우스 드래그 이벤트 미전달, OOPIF는 --site-per-process 기준)로 결정했다.

세션 1은 [../run00-spike/SPIKE.md](../run00-spike/SPIKE.md)에 권고만 쓴다. 결정은 사용자가 하고 세션 2 프롬프트에 `SPIKE.md를 읽었고 GO(caveat: ...)로 결정했다` 한 줄로 넣는다. 세션 2의 B2-00이 그 줄을 확인해 여기에 그대로 옮겨 적는다. 그 줄이 없으면 세션 2는 진행하지 않는다.

## 발견 ID

- 다음 발견 ID: `FC-QA-003`

`FC-QA-001`은 사전 등록돼 있다(`doc/qa/findings/`, 상태 `predicted`). ID는 전역이고 재사용하지 않는다. 세션 1은 ID를 발급하지 않는다. 세션 2가 발급할 때마다 이 줄과 [../README.md](../README.md)의 ID 대장을 함께 올린다. 둘이 다르면 README가 기준이다.
