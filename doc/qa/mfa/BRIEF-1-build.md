# BRIEF-1 — 클라우드 세션 1 작업 지시서 (구축과 하네스 검증)

> 이 문서는
> - 클라우드 세션 1이 처음부터 끝까지 따라 하는 작업 지시서다. `mfa-lab/` 아래에 Harbor Workbench(마이크로 프론트엔드 구조의 검수용 픽스처)를 처음부터 만들고, Playwright 하네스가 실제 입력을 제대로 내는지 스파이크 S0~S10으로 증명한다.
> - 읽는 사람: 이 저장소만 가진 클라우드 Claude. 세션을 시작할 때와 재개할 때마다 읽는다.
> - 의존 문서: [STATE.md](./STATE.md)(체크포인트), [ARCHITECTURE.md](./ARCHITECTURE.md)(무엇을 만드는가), [RECIPES.md](./RECIPES.md)(설정 파일 전문), [HARNESS.md](./HARNESS.md)(헬퍼·불변식).
> - 작성일 2026-10-02. 여기 적힌 명령·설정·예측은 전부 **미실행**이다. 브라우저에서 실행해 본 것은 없다. 그래서 단계마다 게이트를 둔다.

용어

| 용어 | 뜻 |
|---|---|
| MFA | 마이크로 프론트엔드 아키텍처 |
| shell / remote | host 앱 / 패널 내용을 공급하는 팀별 앱 |
| 슬롯 | 패널에 들어가는 내용의 이름. `componentKey`, `window.__mfe`의 키, testid 접두어가 모두 같다 |
| 레인 | Playwright 버전과 Chromium 빌드의 조합(B, A, C). 한 번 정하면 세션 2까지 그대로 쓴다 |
| 게이트 | 단계를 끝내도 되는지 판정하는 관찰 가능한 조건 |
| 사다리 | 게이트가 실패했을 때 순서대로 시도하는 대안 목록 |
| 스파이크 | 하네스가 믿을 만한지 확인하는 검사 S0~S10. 심각도 `sev-1..sev-4`와는 다른 번호다 |

## 먼저 읽을 문서

아래 순서로 읽는다.

1. [STATE.md](./STATE.md) — 어디까지 했는지. "다음 작업" 줄이 시작점이다.
2. 이 문서 전체.
3. `doc/qa/BLOCKED.md` — 있을 때만. 이전 세션이 멈춘 이유와 재개 방법이 적혀 있다.
4. [../README.md](../README.md) — 분류(`library-bug` 등)와 신뢰 규칙. 세션 1은 발견을 등록하지 않지만 같은 용어를 쓴다.
5. [ARCHITECTURE.md](./ARCHITECTURE.md) 전체 — 앱, 슬롯, 계약, 계측, 포트, `ctl.mjs` 명령.
6. [HARNESS.md](./HARNESS.md) — B1-01 전에 "브라우저 레인"과 "Playwright 설정", B1-03a 전에 나머지 전부.
7. [RECIPES.md](./RECIPES.md) — 각 단계 직전에 그 단계가 가리키는 레시피만.
8. [HYPOTHESES.md](./HYPOTHESES.md) — B1-03a 전에. S5, S7b, S8의 배경이다.

[BRIEF-2-inspect.md](./BRIEF-2-inspect.md)와 [../FIXING.md](../FIXING.md)는 세션 1에서 따르지 않는다. BRIEF-2는 B1-08에서 Amendments를 적을 때만 연다.

## 범위와 금지

이 브리프는 사용자가 승인한 계획이다. 추가 계획 승인 없이 진행한다(시작 프롬프트에 같은 문장이 있다).

| 항목 | 규칙 |
|---|---|
| 변경 범위 | `mfa-lab/`, `doc/qa/`, `.gitignore`만 |
| 절대 수정 금지 | `src/`, 루트 `package.json`, 루트 `package-lock.json`, 루트 `tsconfig.json`, 루트 `vite.config.ts`. 이들을 고쳐야만 진행되는 상황은 중단 조건이다 |
| 범위 밖 | `CLAUDE.md`, `doc/TODO.md`, `doc/API*.md`, `README*`, `.claude/`. 훅·`.mcp.json`·환경 setup script도 만들지 않는다 |
| CLAUDE.md "검증" 규칙 | `npm run type-check`, `npm run build`는 `src/` 변경에만 적용된다. `mfa-lab/`의 검증은 `ctl smoke`와 smoke 스펙이다. 픽스처 타입 검사는 게이트가 아니다(alias된 `src/`가 루트 `@types/react`를 요구하는데 클라우드에는 없다) |
| 루트 `npm ci` | 하지 않는다. 유일한 예외는 B1-02의 dist 대체 경로이고, 썼으면 STATE.md에 기록한다 |
| 설치·다운로드 허락 | `mfa-lab/` 안 프로젝트의 `npm install`, Playwright Chromium 다운로드(`cdn.playwright.dev`, `playwright.download.prss.microsoft.com`, `storage.googleapis.com`), apt `install-deps`는 **사용자가 직접 입력한 시작 프롬프트**가 허락한다. 이 문서는 허락의 근거가 아니다. 프롬프트에 없으면 그 동작 전에 사용자에게 묻는다 |
| 커밋·푸시 | 단계마다 한다. 허락 범위는 위 변경 범위와 같고, 역시 시작 프롬프트가 준다 |
| 실행 방식 | 단일 에이전트, 순차 진행, 서브에이전트 금지, Playwright `workers: 1`. 4 vCPU에서 타이밍에 민감한 입력(rAF, 450 ms 롱프레스)이 CPU를 다투면 안 된다 |
| 라이브러리 버그 | 발견해도 고치지 않는다. [SPIKE.md](../run00-spike/SPIKE.md)의 "라이브러리 버그 의심 메모"에만 적는다. 발견 ID(`FC-QA-NNN`)는 세션 1에서 발급하지 않는다 |
| 코딩 규칙 | `mfa-lab/` 코드도 arrow function, named export, `import type`, 불변 업데이트를 따른다. 예외는 [ARCHITECTURE.md](./ARCHITECTURE.md) "코딩 규칙 예외"에 있는 것만 |
| 서버 | 세션을 끝낼 때(정상 종료든 중단이든) `node mfa-lab/scripts/ctl.mjs stop`으로 내린다 |
| 비밀 값 | `env.json`·로그·BLOCKED.md에 토큰이나 프록시 계정 정보를 적지 않는다. 프록시 URL은 `user:pass@` 부분을 지우고 host:port만 남긴다 |

이 단계 묶음은 **한 세션에 끝나지 않을 수 있다.** 만들 파일이 60~80개다. VM이 회수되면 같은 세션을 다시 열거나, 푸시된 작업 브랜치에서 새 세션을 같은 프롬프트로 시작해 [재개 절차](#재개-절차)부터 이어 간다.

## 재개 절차

세션을 시작할 때마다(처음 포함) 저장소 루트에서 실행한다. 푸시하지 않은 작업은 사라졌다고 본다.

| 순서 | 할 일 | 명령 (Bash timeout) |
|---|---|---|
| 1 | 작업 트리와 브랜치 확인 | `git status --short && git log --oneline -5 && git rev-parse --abbrev-ref HEAD` (기본) |
| 2 | [STATE.md](./STATE.md)를 읽는다. `doc/qa/BLOCKED.md`가 있으면 읽는다 | — |
| 3 | 브랜치 이름이 STATE.md의 "작업 브랜치"와 다르면 값 뒤에 덧붙여 적는다. "시작 커밋"은 한 번 적은 뒤 덮어쓰지 않는다 | — |
| 4 | B1-02가 체크돼 있으면 환경 복원 | `node mfa-lab/scripts/ctl.mjs up` (600000) |
| 5 | 이어서 smoke 재확인 | `node mfa-lab/scripts/ctl.mjs test smoke` (600000) |
| 6 | B1-02 전이고 `mfa-lab/scripts/ctl.mjs`가 있으면 | `node mfa-lab/scripts/ctl.mjs doctor` (기본) |
| 7 | 체크되지 않은 첫 단계부터 진행한다. 그 단계의 파일이 일부 커밋돼 있어도 게이트는 처음부터 다시 실행한다 | — |

- `up`이 10분을 넘기면 `install`, `build`, `serve --baseline`, `smoke`를 따로 실행한다.
- `doctor`가 커밋된 레인(`mfa-lab/e2e/lane.json`)을 쓸 수 없다고 하면 멈추고 보고한다(중단 조건 BLOCKED-LANE). 레인을 조용히 바꾸지 않는다.
- BLOCKED.md의 원인이 해소돼 그 단계 게이트가 통과하면, 그 단계 커밋에서 BLOCKED.md를 지우고 STATE.md "차단 사항"에 해소 사실을 적는다.

## 공통 규칙

### 명령과 Bash timeout

Bash 도구는 기본 2분(120000 ms), 최대 10분(600000 ms)이다. 한도를 넘긴 명령은 백그라운드로 옮겨져 30분 뒤 중지된다(출처: https://code.claude.com/docs/en/cloud-environments 의 Time limits). 명령은 전부 저장소 루트에서 실행한다. 명령의 동작 명세는 [ARCHITECTURE.md](./ARCHITECTURE.md) "실행 모델"이 정한다.

| 명령 | timeout(ms) |
|---|---|
| `node mfa-lab/scripts/ctl.mjs doctor [--write <경로>]` | 기본 |
| `node mfa-lab/scripts/ctl.mjs install [--only a,b]` | 600000 |
| `node mfa-lab/scripts/ctl.mjs build [--only a,b] [--lib src\|npm051] [--mf on\|off]` | 300000 |
| `node mfa-lab/scripts/ctl.mjs serve [--baseline]` | 기본 |
| `node mfa-lab/scripts/ctl.mjs status` / `smoke` / `stop [--only a,b]` | 기본 |
| `node mfa-lab/scripts/ctl.mjs up` | 600000 |
| `node mfa-lab/scripts/ctl.mjs test <필터> [--project mouse\|touch]` | 600000 |

`test`는 한 번에 스펙 파일 하나 또는 폴더 하나만 돌린다. 필터는 경로 접두어다(예: `spike/s05`, `smoke/shell`).

### 시도 횟수와 실패 처리

- "시도 1회" = 게이트를 한 번 실행한 것. 실패 후 원인을 고쳐 다시 실행하면 2회다.
- 모든 사다리는 **3회**에서 끝난다. 분 단위로 세지 않는다.
- 3회 실패 뒤의 처리는 단계 종류로 정해진다.

| 단계 종류 | 3회 실패 뒤 |
|---|---|
| remote 단계 (B1-04, B1-05, B1-06, B1-07) | STATE.md에 `blocked(<변형>)`으로 적고 행을 닫은 뒤(체크) 다음 단계로 간다. 해당 변형을 쓰는 run 01 행은 `blocked`가 된다([GO 기준](#go-기준)) |
| 중단 조건이 지정된 게이트 (S0, S1의 입력, S5, 라이브러리 alias) | [중단 조건](#중단-조건) 절차 |
| 필수 스파이크 S1~S4, S6의 그 밖의 실패 | 중단하지 않는다. 결과 칸에 `실패`로 적고 행을 닫은 뒤 계속 진행한다. SPIKE.md 권고는 NO-GO가 된다 |
| S7a | 터치를 `env-limit`으로 적고 계속한다 |

### 커밋 규칙

게이트를 통과한 단계마다 아래를 한다. 스펙 하나가 초록이 될 때마다 중간(WIP) 커밋·푸시를 해도 되고 권장한다.

1. 작업 파일을 **경로를 명시해** 스테이징한다. `git add -A`와 `git add .`은 쓰지 않는다.
2. `git status --short`와 `git diff --cached --stat`을 본다. 아래 명령이 아무것도 출력하지 않아야 한다.
   `git diff --cached --name-only | grep -E 'node_modules|/dist/|/dist-|\.run/|\.artifacts|test-results|pw-browsers'`
   `src/`, 루트 `package.json`, 루트 `package-lock.json`이 스테이징돼 있으면 커밋하지 않는다. 5 MB를 넘는 파일도 커밋하지 않는다.
3. 커밋한다. 메시지는 `test: [B1-02] <요약>`(mfa-lab 코드), `docs: [B1-02] <요약>`(문서) 형식.
4. STATE.md를 갱신한다: 행 체크, 커밋(방금 작업 커밋의 `git rev-parse --short HEAD`), 날짜(`date -u +%Y-%m-%dT%H:%MZ`), 시도 횟수, 결과 한 줄, 새로 알게 된 환경 사실, "다음 작업" 줄.
5. STATE.md(그리고 SPIKE.md, env.json)를 `docs: [B1-02] STATE 갱신`으로 커밋하고 `git push -u origin HEAD`.

의존성을 바꾼 프로젝트는 lockfile을 처음부터 다시 만든다: 그 프로젝트의 `node_modules`와 `package-lock.json`을 지우고 `npm install`. 다른 플랫폼용 optional 패키지(Windows용 rollup·esbuild)가 lockfile에서 빠지는 것을 막기 위해서다.

## 단계

한 단계에 새 변수 하나만 추가한다. 게이트를 통과해야 다음으로 간다.

| 단계 | 작업 | 새 변수 | 게이트 요약 |
|---|---|---|---|
| B1-00 | 환경 탐침 | 클라우드 VM 자체 | Node ≥ 22.12, npm 접근, 레인 후보 |
| B1-01 | 브라우저 확보 | Chromium 실행 | S0 |
| B1-02 | shell(대조군만, federation 없음) + `ctl.mjs` + 계측 | 저장소 밖 소스 alias + dedupe | `ctl smoke`, `smoke/shell` |
| B1-03a | 프로브 + mouseDrag | 실제 마우스 드래그 | S1 |
| B1-03b | 불변식 | 취소 경로 | S1~S4 (I1~I7 포함) |
| B1-03c | npm 0.5.1 기준 빌드 | 양성 대조 | S5가 요구대로 실패 |
| B1-03d | 리사이즈 | 포인터 캡처 | S6 |
| B1-03e | 터치 | CDP 터치 | S7a(게이트), S7b(기록만) |
| B1-03f | 비율 표 | rAF 경합 | S8 기록 |
| B1-04 | `mfe-billing` + mount 어댑터 | 별도 React 루트 | `smoke/billing` |
| B1-05 | `mfe-telemetry` + iframe 어댑터 | iframe, cross-site | `smoke/telemetry`, S9 기록 |
| B1-06 | `mfe-orders`: twin → federation | Module Federation | (a)~(d) 네 부분 |
| B1-07 | `mfe-board` | 두 번째 MF remote | `smoke/board` |
| B1-08 | 인계 | — | [종료 조건](#종료-조건) |

의존 관계: B1-03*은 B1-01과 B1-02가 필요하다. B1-04와 B1-05는 federation이 필요 없고 서로 독립이다. B1-07은 B1-06 뒤에 한다. B1-08은 B1-02, B1-03a~d, 그리고 최소 인계가 필요하다.

### B1-00 환경 탐침

만들 것

- `.gitignore` 확인이 **첫 동작**이다. `grep -n 'mfa-lab' .gitignore`가 `mfa-lab/.run/`, `mfa-lab/e2e/.artifacts/`, `mfa-lab/e2e/test-results/`, `mfa-lab/**/dist-*/` 네 줄을 보여야 한다. 없는 줄은 추가한다. 브라우저 바이너리(수백 MB)가 커밋되는 사고를 막는 장치다.
- `mfa-lab/registry.json` — [ARCHITECTURE.md](./ARCHITECTURE.md) "레지스트리"의 JSON 그대로. 아직 없는 앱도 처음부터 전부 적는다.
- `mfa-lab/scripts/ctl.mjs` — 이 단계에서는 `doctor` 명령만. 외부 의존성 없는 Node 스크립트.
- `doc/qa/run00-spike/env.json` — 필드는 [SPIKE.md 작성 규칙](#spikemd-작성-규칙).
- STATE.md의 작업 브랜치, 시작 커밋, Node 버전, shallow clone 여부.

`doctor`가 기록하는 것

| 항목 | 방법 |
|---|---|
| Node, npm 버전 | `node -v`, `npm -v`. Node < 22.12면 메시지를 내고 0이 아닌 코드로 끝난다. 스크립트 안에서 Node를 바꾸지 않는다 |
| 네트워크 | `curl -sS -o /dev/null -w '%{http_code}' https://<host>/`를 `registry.npmjs.org`, `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`, `storage.googleapis.com`에 대해 실행, 그리고 `npm ping`. Node의 fetch는 프록시 환경 변수를 따르지 않으므로 쓰지 않는다 |
| 프록시 | `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`(소문자 포함)의 설정 여부와 host:port |
| 권한 | `id -u`, `sudo -n true`의 성공 여부 |
| 저장소 | `git rev-parse --is-shallow-repository`, `git rev-parse HEAD:src`, `git rev-list -1 HEAD -- src` |
| 브라우저 | `/opt/pw-browsers` 목록, `PLAYWRIGHT_*` 환경 변수 |
| 포트 | 4300~4304, 4390이 비어 있는지(Node `net`으로 로컬 확인) |
| 레인 후보 | `cdn.playwright.dev` 응답 코드가 `000`(연결 불가)이 아니면 B. 403이면 프록시 거부일 수 있으니 `curl -sS https://cdn.playwright.dev/ \| head -c 300`으로 본문에 "Host not allowed"가 있는지 보고, 있으면 B가 아니다. B가 아니고 `/opt/pw-browsers`에 1194 빌드가 있으면 A, 둘 다 아니면 C. 후보일 뿐이고 최종 판정은 B1-01의 실제 설치와 S0이다 |

명령

```bash
git rev-parse --abbrev-ref HEAD      # STATE.md "작업 브랜치"
git rev-parse HEAD                   # STATE.md "시작 커밋" (비어 있을 때만 기록)
node mfa-lab/scripts/ctl.mjs doctor --write doc/qa/run00-spike/env.json
```

게이트

- Node ≥ 22.12.
- `npm ping`이 성공하고 `registry.npmjs.org`가 200을 준다.
- 레인 후보가 출력되고 `env.json`이 쓰였다.
- `git rev-parse HEAD:src`가 STATE.md의 트리 해시와 같다. 다르면 문서 작성 뒤 `src/`가 바뀐 것이다. 중단하지 않고 STATE.md의 라이브러리 식별을 실제 값으로 고친 뒤 결과 칸에 적는다.

실패 시

| 증상 | 처리 |
|---|---|
| Node < 22.12 | 중단 조건 BLOCKED-NODE |
| npm 접근 불가 | 30초 간격으로 3회. 계속 실패하면 BLOCKED-NETWORK |
| Playwright 호스트 접근 불가 | 실패가 아니다. 레인 후보가 A 또는 C가 된다 |

커밋: `.gitignore`(바꿨을 때만), `mfa-lab/registry.json`, `mfa-lab/scripts/ctl.mjs`, `doc/qa/run00-spike/env.json`, `doc/qa/mfa/STATE.md`.

### B1-01 브라우저 확보 (S0)

만들 것

- `mfa-lab/e2e/package.json` — `private`, `"type": "module"`, devDependency는 `@playwright/test` 하나, 캐럿 없는 정확한 버전.
- `mfa-lab/e2e/package-lock.json` — `npm install`이 만든다. 커밋한다.
- `mfa-lab/e2e/playwright.config.ts` — [HARNESS.md](./HARNESS.md) "Playwright 설정"과 [RECIPES.md](./RECIPES.md)의 `playwright.config.ts` 레시피. `globalSetup`은 쓰지 않는다.
- `mfa-lab/e2e/lane.json` — `{ "lane", "playwright", "chromium" }` 세 필드만 커밋한다. 기계 경로(browsers path, executablePath)는 무시되는 `mfa-lab/.run/lane.local.json`에 둔다. `doctor`가 이 파일을 만들도록 확장한다.
- `mfa-lab/e2e/spike/s00-<slug>.spec.ts` — 서버가 아직 없으므로 `page.setContent`로 만든 인라인 페이지를 쓴다.
- `doc/qa/run00-spike/SPIKE.md` — 여기서 만들고, 이후 단계마다 결과를 덧붙인다.

레인 사다리 (자세한 근거는 [HARNESS.md](./HARNESS.md) "브라우저 레인"). Playwright와 Chromium 버전은 섞지 않는다.

| 순서 | 시작 조건 | 핀 | 브라우저 | 터치 네이티브 드래그(Linux) |
|---|---|---|---|---|
| B (우선) | 레인 후보가 B | `@playwright/test@1.63.0` | Chromium 153.0.8010.12 (리비전 1243) | 켜짐 |
| A | `/opt/pw-browsers`에 `chromium_headless_shell-1194` 또는 `chromium-1194` | `@playwright/test@1.56.0`, 다운로드 없음 | Chromium 141.0.7390.37 | 꺼짐 |
| C | B, A 모두 실패 | `@playwright/test@1.56.0` | Chrome for Testing 141.0.7390.37 headless shell | 꺼짐 |

버전 대응의 출처: https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/packages/playwright-core/browsers.json , https://raw.githubusercontent.com/microsoft/playwright/v1.56.0/packages/playwright-core/browsers.json . `/opt/pw-browsers`에 1194 빌드가 있다는 것은 제3자 보고(https://github.com/privacyfence/privacyfence/issues/760)이고 공식 문서에는 없다. B1-00의 목록으로 직접 확인한다.

명령 (미실행)

```bash
# 공통: 핀을 package.json에 적은 뒤
npm --prefix mfa-lab/e2e install --no-audit --no-fund                       # timeout 600000

# 레인 B: 브라우저 다운로드. 최대 2회
env -u PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD PLAYWRIGHT_BROWSERS_PATH="$PWD/mfa-lab/.run/pw-browsers" \
  node mfa-lab/e2e/node_modules/@playwright/test/cli.js install chromium    # timeout 600000

# S0 실행 (ctl test는 B1-02에서 생기므로 여기서만 직접 호출)
PLAYWRIGHT_BROWSERS_PATH="<레인의 browsers path>" \
  node mfa-lab/e2e/node_modules/@playwright/test/cli.js test -c mfa-lab/e2e/playwright.config.ts spike/s00 --project mouse   # timeout 300000
# 같은 명령을 --project touch 로 한 번 더
```

레인별 보충

- B에서 다운로드가 2회 실패(예: 프록시 뒤 `EAI_AGAIN`)하면: 실패 로그에 찍힌 다운로드 URL을 `curl -fL --retry 2 -o mfa-lab/.run/dl/chromium.zip "<URL>"`로 받아 `mfa-lab/.run/pw-browsers/manual-153/`에 풀고, 그 안의 실행 파일 경로를 `lane.local.json`의 `executablePath`로 쓴다. 로그에 URL이 없으면 이 단을 건너뛴다.
- 실행 시 공유 라이브러리가 없다는 오류가 나면: `node mfa-lab/e2e/node_modules/@playwright/test/cli.js install-deps chromium`(timeout 600000). root(`id -u`가 0)이거나 `sudo -n true`가 성공할 때만 가능하다. 불가능하면 SPIKE.md에 "사용자 선택 조치: 환경 setup script에 `npx playwright@<핀> install-deps chromium`"을 적는다.
- A로 내려갈 때: 핀을 1.56.0으로 바꾸고 `mfa-lab/e2e/node_modules`와 `package-lock.json`을 지운 뒤 다시 `npm install`. browsers path는 `/opt/pw-browsers`.
- C: `curl -fL -o mfa-lab/.run/dl/cft-141.zip https://storage.googleapis.com/chrome-for-testing-public/141.0.7390.37/linux64/chrome-headless-shell-linux64.zip`를 받아 `mfa-lab/.run/pw-browsers/cft-141/`에 풀고 `executablePath`로 쓴다. URL 형식은 Chrome for Testing 공개 버킷의 규칙이며 미실행이다.

게이트 = S0 ([스파이크 표](#스파이크-표)). 스크린샷 PNG는 Read 도구로 **직접 열어** 테스트 페이지의 글자가 보이는지 확인한다. 확인한 PNG 한 장을 `doc/qa/run00-spike/evidence/s00-page.png`로 복사한다.

실패 시: 레인 하나가 시도 1회다. B → A → C 모두 실패하면 BLOCKED-BROWSER.

커밋: `mfa-lab/e2e/package.json`, `mfa-lab/e2e/package-lock.json`, `mfa-lab/e2e/playwright.config.ts`, `mfa-lab/e2e/lane.json`, `mfa-lab/e2e/spike/`, `mfa-lab/scripts/`, `doc/qa/run00-spike/`. STATE.md에 레인, Playwright, Chromium 빌드를 적는다.

### B1-02 shell (대조군만, federation 플러그인 없음)

만들 것 (구조는 [ARCHITECTURE.md](./ARCHITECTURE.md) "저장소 구조", 설정 전문은 [RECIPES.md](./RECIPES.md)의 shell `vite.config.ts` 레시피)

| 묶음 | 파일 |
|---|---|
| 계약 | `mfa-lab/contract/package.json`, `CONTRACT.md`, `src/{index,probe,bus,style}.ts` — React를 import하지 않는다 |
| 실행 도구 | `mfa-lab/scripts/ctl.mjs` 전체 명령(`doctor install build serve status stop smoke up test`), `mfa-lab/scripts/lib/*.mjs` |
| shell | `mfa-lab/apps/shell/{package.json,vite.config.ts,index.html,tsconfig.json}`, `src/main.tsx`, `src/workspace/{Workspace.tsx,store.tsx,layouts.ts,useLoggedLayoutTree.ts,PanelFrame.tsx}`, `src/adapters/RemoteErrorBoundary.tsx`, `src/local/{Bare.tsx,ControlPanel.tsx,NavPanel.tsx}`, `src/{instrumentation.ts,bus.ts,tokens.css}` |
| 슬롯 | `nav`, `bare-0..3`, `control-a..d`, 상단 바의 ext-chip. remote 슬롯은 해당 단계에서 등록한다 |
| 프리셋 | `census`, `locks`, `row3`, `pair`, `workbench` 전부 `layouts.ts`에 넣는다. `workbench`는 B1-07까지 쓰지 않는다 |
| 하네스 | `mfa-lab/e2e/helpers/fixtures.ts`(`lab.open`만), `mfa-lab/e2e/smoke/shell.spec.ts` |

federation 플러그인(`@module-federation/vite`)은 이 단계에서 **설치하지 않는다**. B1-06에서 넣는다.

`ctl.mjs` 수용 기준 (명세는 [ARCHITECTURE.md](./ARCHITECTURE.md) "실행 모델")

- 활성 집합: `serve`, `status`, `smoke`는 디렉터리와 `package.json`이 실제로 있는 앱만 대상으로 한다.
- `up` = doctor → install(필요할 때) → build(바뀌었을 때) → `serve --baseline` → `smoke`. shell의 `package.json`에 `fc-051`이 있으면 `--lib src`와 `--lib npm051`을 **둘 다** 빌드한다. `dist-051`이 없을 때 `serve --baseline`은 경고만 내고 넘어간다.
- 준비 판정 = HTTP 200 **그리고** 본문 검사. `/mf-manifest.json`은 JSON 파싱 + 기대한 `name`, `/remote-entry.js`는 문자열 `mount`와 `unmount`, HTML은 `<meta name="harbor-app" content="<app>@<buildId>">`. `vite preview`는 없는 경로에도 200과 index.html을 주기 때문이다.
- `test <필터>`는 먼저 `serve --baseline`을 실행하고 Playwright를 띄운다. 항상 `--project`를 넘긴다(기본 `mouse`).
- 서버는 `node <app>/node_modules/vite/bin/vite.js ...`로 띄운다. 경로는 `fileURLToPath`로 만든다. win32에서 npm은 `shell: true`로 실행한다.

새 변수: 라이브러리를 저장소 밖 소스(`<repo>/src/index.ts`)로 alias하고 `resolve.dedupe`로 React를 한 벌로 묶는 조합. 루트 `node_modules`가 없는 상태에서 동작해야 한다.

명령

```bash
node mfa-lab/scripts/ctl.mjs install            # timeout 600000. 처음에는 npm install로 lockfile 생성
node mfa-lab/scripts/ctl.mjs build              # timeout 300000
node mfa-lab/scripts/ctl.mjs serve
node mfa-lab/scripts/ctl.mjs status             # 반드시 새 Bash 호출에서. detached 서버 생존 여부를 본다
node mfa-lab/scripts/ctl.mjs smoke
node mfa-lab/scripts/ctl.mjs test smoke/shell   # timeout 600000
```

게이트

- `ctl smoke`가 0으로 끝난다: 핀이 `registry.json`과 일치, shell HTML에 `harbor-app` 표식.
- `smoke/shell.spec`: `census`(control), `census`(`a=bare-0&b=bare-1&c=bare-2&d=bare-3`), `locks`, `row3`, `pair` 각각에서
  - 모든 패널이 렌더된다(`[data-panel-id]`가 프리셋의 패널 수만큼).
  - `window.__fc.getTree()`가 프리셋 JSON과 같다.
  - `[data-ftl-styles]`가 있고 `.ftl-resizer`의 cursor가 `col-resize` 또는 `row-resize`다. `locks`에서 `nav` 옆에는 resizer가 없다.
  - `window.__fc.lib.source === 'src'`, `window.__fc.lib.tree`가 `git rev-parse HEAD:src`와 같다. `window.__fc.reactVersion === '19.2.4'`.
  - 콘솔 에러와 page error가 0건이다.
- 새 Bash 호출의 `ctl status` 결과를 STATE.md "detached 서버 생존"에 yes/no로 적는다. no면 `serve --foreground`를 `run_in_background`와 timeout 7200000으로 띄운다. `ctl test`가 매번 서버를 다시 확인하므로 게이트 실패는 아니다.

실패 시 (alias 문제)

| 시도 | 대안 |
|---|---|
| 1 | 루트에 `node_modules`가 **없는지** 확인. `resolve.dedupe: ['react','react-dom']`, alias 경로, `server.fs.allow: [repoRoot]`를 점검하고 빌드 오류를 읽는다 |
| 2 | `react`, `react-dom`을 shell의 `node_modules` 경로로 명시적으로 alias한다 |
| 3 | dist 대체: 루트에서 `npm ci && npm run build`(timeout 600000) 후 라이브러리를 `<repo>/dist/index.js`로 alias한다. `window.__fc.lib.source`는 `'dist'`. STATE.md 결정란과 SPIKE.md에 기록한다. 실행 뒤 `git status --short -- package.json package-lock.json`이 비어 있어야 한다 |

세 번 모두 실패하면 중단 조건 BLOCKED-ALIAS. 시도 3(dist 대체)으로 통과했으면 `dist/`는 git에 없으므로 새 VM마다 루트 빌드가 다시 필요하다. `ctl up`이 그 빌드까지 하도록 만들고 `mfa-lab/README.md`와 SPIKE.md HANDOFF에 적는다.

커밋: `mfa-lab/contract`, `mfa-lab/scripts`, `mfa-lab/apps/shell`, `mfa-lab/e2e/helpers/fixtures.ts`, `mfa-lab/e2e/smoke/shell.spec.ts`. 각 프로젝트의 `package-lock.json`을 포함한다.

### B1-03a 프로브와 마우스 드래그 (S1)

만들 것: `mfa-lab/e2e/helpers/{settle,geometry,mouseDrag,probe.init,snapshot}.ts`([HARNESS.md](./HARNESS.md) "헬퍼", "프로브", "스냅샷"), `spike/s01-<slug>.spec.ts`.

새 변수: `page.mouse`가 만드는 실제(trusted) dragstart~dragend. Chromium의 CDP 드래그 인터셉트에 의존한다. `locator.dragTo`는 쓰지 않는다.

명령: `node mfa-lab/scripts/ctl.mjs test spike/s01 --project mouse` (600000)

게이트: S1. 이 단계에서는 불변식 검사 없이 이벤트 순서·미리보기·커밋만 본다. I1~I7은 B1-03b에서 붙여 다시 실행한다. 통과하면 이벤트 로그를 `doc/qa/run00-spike/evidence/baseline/s01.events.json`에 기준선으로 저장한다(이벤트 종류, 대상 패널, `isTrusted`, 단계만 남기고 시각은 뺀다).

실패 시

| 시도 | 대안 |
|---|---|
| 1 | 프로브 로그에서 빠진 이벤트를 확인. 첫 이동이 4 px 이상(6 px 권장)인지, dragover를 위한 두 번째 이동이 있는지, 이동마다 settle을 했는지 점검 |
| 2 | `dropPoint`가 살아 있는 rect로 계산하는지, 핸들(`handle-<slot>`) 위에서 mousedown했는지 점검 |
| 3 | `channel: 'chromium'`(전체 바이너리)로 실행. 통과하면 `lane.local.json`과 SPIKE.md에 기록하고 이후 전부 그 바이너리로 돌린다 |

어떤 바이너리로도 trusted dragstart가 나오지 않으면 BLOCKED-INPUT. dragstart는 나오는데 다른 조건이 실패하면 [시도 횟수와 실패 처리](#시도-횟수와-실패-처리)의 "필수 스파이크" 행을 따른다.

커밋: `mfa-lab/e2e/helpers`, `mfa-lab/e2e/spike`, `doc/qa/run00-spike`.

### B1-03b 불변식과 취소 경로 (S2~S4)

만들 것: `helpers/invariants.ts`([HARNESS.md](./HARNESS.md) "불변식"), `helpers/evidence.ts`, `spike/s02-*`, `s03-*`, `s04-*`. S1에 I1~I7 검사를 붙인다.

명령: `node mfa-lab/scripts/ctl.mjs test spike/s01`, `spike/s02`, `spike/s03`, `spike/s04` (각 600000)

게이트: S1~S4가 I1~I7을 포함해 통과. S2~S4의 이벤트 로그도 기준선으로 저장한다.

실패 시

| 시도 | 대안 |
|---|---|
| 1 | 릴리스 직전 `underCursor`가 기대한 패널(S2·S4는 `nav`)인지 확인 |
| 2 | 프로브가 dragstart 시점에 **이벤트 대상 노드 자체**에 dragend 리스너를 다는지 확인. 분리된 노드의 이벤트는 `window`까지 오지 않는다 |
| 3 | 릴리스·Esc 전에 settle을 했는지, 스냅샷 쿼리가 `[data-tree-root]` 아래로 한정됐는지 확인 |

3회 뒤에도 S3·S4가 실패하면 중단하지 않는다. 이벤트 로그와 함께 SPIKE.md에 "하네스 미완 또는 라이브러리 버그 의심"으로 적고 B1-03c로 간다. S5 결과와 나란히 봐야 원인을 가릴 수 있다.

### B1-03c npm 0.5.1 기준 빌드와 양성 대조 (S5)

만들 것

- shell `package.json`에 `"fc-051": "npm:@dannysir/floating-components@0.5.1"`(devDependency). shell의 lockfile을 처음부터 다시 만든다.
- `spike/s05-*.spec.ts` — S3과 같은 동작을 `http://127.0.0.1:4390`에서 실행한다.

명령

```bash
rm -rf mfa-lab/apps/shell/node_modules mfa-lab/apps/shell/package-lock.json
node mfa-lab/scripts/ctl.mjs install --only shell     # timeout 600000. lockfile이 없으므로 npm install
node mfa-lab/scripts/ctl.mjs build --lib npm051       # timeout 300000. dist-051 생성
node mfa-lab/scripts/ctl.mjs serve --baseline
node mfa-lab/scripts/ctl.mjs test spike/s05           # timeout 600000
```

게이트: S5가 **요구대로 실패**한다. 뜻과 판정은 [스파이크 표](#스파이크-표)의 S5 설명을 따른다. 스펙 자체는 "불변식이 실패함"을 단언하므로 Playwright 결과는 초록이다.

실패 시 (= 0.5.1에서 멈춘 상태가 보이지 않음)

| 시도 | 확인 |
|---|---|
| 1 | `:4390`의 `window.__fc.lib.source === 'npm051'`인가 |
| 2 | 미리보기 중 `domTree`가 `H[nav,terminal,editor,output]`인가(소스가 부모를 바꿔 리마운트됐는가) |
| 3 | 프로브에 분리된 소스의 dragend(`isConnected: false`)가 찍혔는가 |

셋을 다 확인하고도 I1·I2가 모두 통과하면 BLOCKED-ORACLE.

### B1-03d 리사이즈 (S6)

만들 것: `helpers/resize.ts`, `spike/s06-*.spec.ts`.

명령: `node mfa-lab/scripts/ctl.mjs test spike/s06` (600000)

게이트: S6. 이벤트 로그를 기준선으로 저장한다.

실패 시: (1) resizer를 `.ftl-resizer`의 기하로 찾았는지, (2) 이동을 여러 step으로 나누고 릴리스 전에 settle했는지, (3) 허용 오차 3 px를 적용했는지 순서로 본다. 리사이즈 중 `mousemove`가 없는 것은 실패가 아니다.

### B1-03e 터치 (S7a, S7b)

만들 것: `helpers/touch.ts`(CDP `Input.dispatchTouchEvent`), `spike/s07a-*.spec.ts`, `spike/s07b-*.spec.ts`.

명령: `node mfa-lab/scripts/ctl.mjs test spike/s07a --project touch`, `spike/s07b --project touch` (각 600000)

게이트: S7a만. S7b는 결과를 SPIKE.md에 적기만 한다. S7b가 어떻게 나오든 터치를 `env-limit`으로 만들지 않는다.

실패 시 (S7a)

| 시도 | 대안 |
|---|---|
| 1 | `touch` 프로젝트(`hasTouch: true`)로 돌렸는지, touch 이벤트가 `isTrusted`인지 확인 |
| 2 | 첫 `touchMove`를 8 px 넘게 주고, 이후 이동을 두 번 이상으로 나눠 사이마다 settle |
| 3 | `channel: 'chromium'`으로 실행 |

3회 실패하면 STATE.md "터치"에 `env-limit`을 적고 계속한다(조건부 GO 항목).

### B1-03f rAF 경합 비율 표 (S8, 선택 S10)

만들 것: `spike/s08-*.spec.ts`, 선택으로 `spike/s10-*.spec.ts`.

명령: `node mfa-lab/scripts/ctl.mjs test spike/s08` (600000). 10분을 넘기면 릴리스 모드별로 스펙을 나눈다.

게이트: 비율 표가 SPIKE.md에 기록되고 `overShadow` 행이 0/10이다. `overShadow`가 3회 뒤에도 0이 아니면 중단하지 않고 SPIKE.md HANDOFF의 "알려진 부작용"에 "기본 릴리스가 경합에서 자유롭지 않음"을 적는다. 이 경우 세션 2의 커밋 측정은 오염 가능성을 표시해야 한다.

이 단계가 끝나면 SPIKE.md에 검사별 결과(S0~S8), 이벤트 로그 기준선 위치, S8 표가 있어야 한다.

### B1-04 mfe-billing과 mount 어댑터

만들 것 (순서대로. 하나가 초록이면 WIP 커밋)

| 순서 | 내용 |
|---|---|
| a | `apps/shell/src/adapters/RemoteMount.tsx`와 대조군 슬롯 `control-mount`(host 로컬 모듈, host의 React로 `createRoot`). 서버 없이 smoke |
| b | `mfa-lab/apps/mfe-billing/`: `package.json`(`"type": "module"`), `vite.config.ts`(lib 모드, `fileName: () => 'remote-entry.js'`, `define: { 'process.env.NODE_ENV': JSON.stringify('production') }`), `src/{remote-entry.tsx,App.tsx}`, `public/index.html`(단독 페이지). 슬롯 `billing` 등록. 전문은 [RECIPES.md](./RECIPES.md)의 lib 모드 레시피 |
| c | twin 슬롯 `billing-local`(`@twin/billing` → `../mfe-billing/src/App.tsx`) |
| d | `mfa-lab/e2e/smoke/billing.spec.ts` |

새 변수: lib 모드 빌드에서의 `@harbor/contract` alias, 다른 origin의 ES 모듈을 `import(url)`로 불러 별도 React 루트로 마운트하는 것.

명령: `node mfa-lab/scripts/ctl.mjs up` (600000) → `node mfa-lab/scripts/ctl.mjs test smoke/billing` (600000)

게이트

- `ctl smoke`: `http://127.0.0.1:4303/remote-entry.js`가 200이고 본문에 `mount`, `unmount`가 있다. `/`가 `remote-entry.js`를 참조하는 HTML이다.
- `smoke/billing.spec`
  - `window.__mfe.billing`: `mounts === 1`, `unmounts === 0`, `rootsAlive === 1`, `reactSame === false`.
  - `window.__fc.frames.billing`: `frameMounts === 1`, `lateResolves === 0`, `state === 'ready'`.
  - `control-mount`와 `billing-local`: `mounts === 1`, `reactSame === true`.
  - 단독 페이지(`http://127.0.0.1:4303/`)에서 `<slot>-input`이 보인다.
  - 콘솔 에러 0건.

실패 시

| 시도 | 대안 |
|---|---|
| 1 | `/remote-entry.js`가 404면 `fileName`이 함수 형태인지, `package.json`에 `"type": "module"`이 있는지 확인. `process is not defined`면 `define`을 확인 |
| 2 | 계약 alias가 lib 모드에서 풀리지 않으면 계약 소스를 설치 시점에 `mfe-billing/src/vendor/`로 복사하도록 `ctl install`을 바꾼다 |
| 3 | CORS·모듈 로드 오류를 콘솔과 네트워크 로그로 확인하고 `preview` 설정을 고친다 |

3회 실패: `blocked(billing)`. `control-mount`와 `billing-local`이 통과했으면 그대로 둔다.

커밋: `mfa-lab/apps/mfe-billing`, `mfa-lab/apps/shell`, `mfa-lab/e2e/smoke/billing.spec.ts`, 바뀐 `mfa-lab/scripts`.

### B1-05 mfe-telemetry와 iframe 어댑터 (S9)

만들 것 (순서대로)

| 순서 | 내용 |
|---|---|
| a | `apps/shell/src/adapters/IframeRemote.tsx`(메시지 리스너는 모듈 스코프)와 대조군 슬롯 `control-iframe`(`<iframe srcdoc>`, 서버 불필요) |
| b | `mfa-lab/apps/mfe-telemetry/`: `package.json`, `vite.config.ts`, `index.html`, `src/main.ts`(바닐라 TypeScript). 슬롯 `telemetry` = `http://127.0.0.1:4304` |
| c | 슬롯 `telemetry-x` = `http://localhost:4304`(같은 서버, cross-site) |
| d | `mfa-lab/e2e/smoke/telemetry.spec.ts`, `spike/s09-*.spec.ts` |

새 변수: iframe 문서 안의 카운터, 그리고 `localhost`와 `127.0.0.1`을 섞은 cross-site 프레임.

명령: `node mfa-lab/scripts/ctl.mjs up` (600000) → `test smoke/telemetry` → `test spike/s09` (각 600000)

게이트

- `smoke/telemetry.spec`: 두 슬롯 모두
  - iframe 문서 안 `window.__mfe[slot].loads === 1`(`frame.evaluate`로 읽는다).
  - host 미러 `window.__fc.frames[slot].mirror.loads === 1`, `docIds` 길이 1.
  - `:4304` 문서 요청이 슬롯당 1건.
  - `control-iframe`의 미러 `loads === 1`. 콘솔 에러 0건.
- S9를 SPIKE.md에 기록(게이트 아님).

실패 시

| 대상 | 시도 | 대안 |
|---|---|---|
| `telemetry-x` | 1 | 브라우저에서 `http://localhost:4304`가 열리는지 확인(Node가 아니라 브라우저 안에서) |
| `telemetry-x` | 2 | Chromium 실행 인자 `--host-resolver-rules=MAP crosssite.test 127.0.0.1` + `preview.allowedHosts: ['crosssite.test']`, 레지스트리 origin을 `http://crosssite.test:4304`로 |
| `telemetry-x` | 3 | 로드는 되는데 별도 프로세스가 아니면 `--site-per-process` 인자를 추가해 본다 |
| `telemetry` | 1~3 | 요청 로그와 `postMessage` origin 검사를 점검 |

- `telemetry-x`가 끝내 로드되지 않으면 STATE.md에 `telemetry-x: env-limit`(조건부 GO 항목). `telemetry`는 통과로 닫는다.
- 로드는 되지만 별도 프로세스가 아니면 `telemetry-x OOPIF: no`로 적는다. 행은 실행하되 세션 2가 결과에 그 사실을 붙인다.
- `telemetry` 자체가 3회 실패하면 `blocked(telemetry)`. 같은 서버이므로 `telemetry-x`도 함께 막힌다.

커밋: `mfa-lab/apps/mfe-telemetry`, `mfa-lab/apps/shell`, `mfa-lab/e2e/smoke/telemetry.spec.ts`, `mfa-lab/e2e/spike`.

### B1-06 mfe-orders: twin 먼저, 그다음 federation

`@module-federation/vite` 1.23.0은 2026-09-28에 나온 버전이라 기억에 의존하면 안 된다. 설치 뒤 `mfa-lab/apps/shell/node_modules/@module-federation/vite/README.md`와 타입 정의를 1차 자료로 읽는다.

만들 것 (순서대로)

| 순서 | 내용 |
|---|---|
| 1 | `mfa-lab/apps/mfe-orders/`: `package.json`, `vite.config.ts`, `index.html`(단독 페이지), `src/{Panel.tsx,standalone.tsx}`. 플러그인 없이 빌드 |
| 2 | twin 슬롯 `orders-local`(`@twin/orders` → `../mfe-orders/src/Panel.tsx`) → `test smoke/shell`로 확인 후 WIP 커밋 |
| 3 | shell과 `mfe-orders`에 `@module-federation/vite@1.23.0` 추가. 두 프로젝트의 lockfile을 처음부터 다시 만든다 |
| 4 | remote 설정: `name: 'orders'`, `filename: 'remoteEntry.js'`, `manifest: true`, `dts: false`, `exposes: { './Panel': './src/Panel.tsx' }`, 절대 `base` + `server.origin`, `build.target: 'chrome89'`, 공유 키 `react`, `'react/'`, `react-dom`, `'react-dom/'`(singleton), **`shareStrategy: 'loaded-first'`** |
| 5 | shell 설정: `name: 'shell'`, `dts: false`, `remotes`는 `registry.json`에서 만든 manifest URL 문자열, 같은 공유 블록, **`shareStrategy: 'loaded-first'`**. `src/adapters/SameTreeRemote.tsx`, `src/registry/{loaders.ts,remotes.d.ts}`, 슬롯 `orders` |
| 6 | `mfa-lab/e2e/helpers/faults.ts`(`blockRemote`), `smoke/orders.spec.ts` |

`shareStrategy`를 명시하는 이유: 플러그인 기본값은 `'version-first'`이고(출처: https://raw.githubusercontent.com/module-federation/vite/main/src/utils/normalizeModuleFederationOptions.ts), 이 전략은 host 시작 시 모든 remote를 불러와 공유 모듈을 협상한다. remote 하나가 죽으면 shell 전체가 빈 화면이 될 수 있다. 미실행 추정이며 게이트 (b)가 확인한다. 설정 전문은 [RECIPES.md](./RECIPES.md)의 MF remote·host 레시피.

새 변수: Module Federation 런타임과 React 싱글턴 공유.

명령

```bash
# 순서 3: 플러그인을 두 package.json에 적은 뒤 lockfile 재생성
rm -rf mfa-lab/apps/shell/node_modules mfa-lab/apps/shell/package-lock.json \
       mfa-lab/apps/mfe-orders/node_modules mfa-lab/apps/mfe-orders/package-lock.json
node mfa-lab/scripts/ctl.mjs install --only shell,mfe-orders   # timeout 600000

node mfa-lab/scripts/ctl.mjs up                      # timeout 600000. shell 소스가 바뀌었으므로 dist-051도 다시 빌드된다
node mfa-lab/scripts/ctl.mjs test smoke/orders       # timeout 600000. EXPECT_ORDERS_STAMP이 없으면 스탬프 단언은 건너뛴다

# (c) 독립 배포 확인
LAB_BUILD_STAMP=deploy-2 node mfa-lab/scripts/ctl.mjs build --only mfe-orders    # timeout 300000. shell은 빌드하지 않는다
node mfa-lab/scripts/ctl.mjs stop --only mfe-orders
node mfa-lab/scripts/ctl.mjs serve
EXPECT_ORDERS_STAMP=deploy-2 node mfa-lab/scripts/ctl.mjs test smoke/orders      # timeout 600000

# (d) 스파이크 재실행
node mfa-lab/scripts/ctl.mjs test spike/s01          # s02, s03, s05, s06도 각각. timeout 600000
```

`build --only`가 "변경 없음"으로 건너뛰면 안 된다. 빌드 스탬프를 변경 판정 키에 넣거나 `--only`를 지정하면 항상 빌드한다.

게이트 (네 부분 모두)

| 부분 | 조건 |
|---|---|
| (a) federation 렌더 | prod 빌드에서 `orders` 슬롯이 렌더된다. `window.__mfe.orders`: `mounts === 1`, `kind === 'same-tree'`, `reactSame === true`. `window.__fc.env.mf === 'on'`. 네트워크 로그에 `:4301/mf-manifest.json`과 `remoteEntry.js`. "Invalid hook call" 등 콘솔 에러 0건. `ctl smoke`에서 manifest의 `name === 'orders'` |
| (b) 장애 격리 | `page.route`로 `http://127.0.0.1:4301`의 모든 요청을 끊은 상태에서: `?layout=census`(control만)가 완전히 렌더되고, `?layout=workbench`도 렌더되며 에러 카드(`error-orders`)는 orders 패널에만 있다. 허용되는 콘솔 에러는 끊은 요청에 대한 것뿐이다. 이 시점에 `board` 패널은 미등록이라 비어 있는 것이 정상이다 |
| (c) 독립 배포 | `mfe-orders`만 새 `LAB_BUILD_STAMP`로 다시 빌드하고 orders preview만 재시작한 뒤, shell을 다시 빌드하지 않은 채로 `window.__mfe.orders.build`가 새 스탬프다. shell의 `harbor-app` 표식 buildId는 그대로다 |
| (d) 스파이크 재실행 | S1, S2, S3, S6이 통과하고 이벤트 로그가 B1-03 기준선과 같다(이벤트 종류·대상·`isTrusted`의 순서 비교. 시각과 dragover 묶음 수는 무시). S5는 여전히 요구대로 실패한다 |

실패 시

| 부분 | 시도 | 대안 |
|---|---|---|
| (a) | 1 | 네임스페이스 공유를 상위 예제의 긴 형태로: `'react/': { import: 'react', request: 'react/', shareKey: 'react/', singleton: true, requiredVersion }`(`react-dom/`도 같게) |
| (a) | 2 | host에서 `orders/Panel`을 **정적으로** import하는 청크를 만들고 그 청크를 `React.lazy`로 불러온다(상위 예제는 정적 import를 쓴다) |
| (a) | 3 | remote를 객체 형태로: `{ type: 'module', name: 'orders', entry: 'http://127.0.0.1:4301/remoteEntry.js' }` |
| (b) | 1 | 두 빌드 모두에 `shareStrategy: 'loaded-first'`가 실제로 들어갔는지 설치된 패키지 문서로 확인 |
| (b) | 2 | `errorLoadRemote` 훅에서 대체 모듈을 돌려주는 런타임 플러그인을 추가(참고: https://module-federation.io/blog/error-load-remote ) |
| (b) | 3 | 플러그인이 넣는 초기화 코드가 control 레이아웃을 막는지 번들과 네트워크 로그로 확인 |

- (a) 또는 (b)의 사다리가 끝나면 마지막 수단은 `node mfa-lab/scripts/ctl.mjs build --mf off`다. remote 지정자를 remote 소스 alias로 바꾸는 빌드 타임 통합이다. STATE.md에 `MF: degraded`로 적는다. 사용자가 받아들여야 하는 조건부 GO 항목이다.
- `MF: degraded`에서는 게이트가 "orders가 alias로 렌더, `reactSame === true`, `window.__fc.env.mf === 'off'`"로 줄고, (b)와 (c)는 `blocked (MF degraded)`로 적는다. (d)는 그대로 실행한다.
- `--mf off`로도 안 되면 `blocked(orders)`.
- (c)만 실패하면 MF를 낮추지 않는다. 결과 칸과 SPIKE.md에 "독립 배포 미확인"으로 적는다.
- (d)에서 이벤트 로그가 기준선과 다르면 차이를 SPIKE.md에 적고 원인을 찾는다. S5가 더 이상 실패하지 않으면 BLOCKED-ORACLE.

어느 단에서 통과했는지(기본 설정, 긴 형태 공유, 정적 import, 객체 remote, 런타임 플러그인, `--mf off`)를 STATE.md 결과 칸과 SPIKE.md에 적는다.

커밋: `mfa-lab/apps/mfe-orders`, `mfa-lab/apps/shell`, `mfa-lab/e2e/helpers/faults.ts`, `mfa-lab/e2e/smoke/orders.spec.ts`, 바뀐 `mfa-lab/scripts`.

### B1-07 mfe-board

만들 것: `mfa-lab/apps/mfe-board/`(`mfe-orders`와 같은 형태, MF 이름 `board`, 자체 HTML5 드래그 앤 드롭 칸반), twin 슬롯 `board-local`, 슬롯 `board`, `smoke/board.spec.ts`, `smoke/workbench.spec.ts`.

순서는 B1-06과 같다: twin 먼저 확인 → federation. B1-06에서 통과한 단의 설정을 그대로 쓴다. B1-06이 `MF: degraded`였으면 federation 시도 없이 `--mf off`로 만든다.

명령: `node mfa-lab/scripts/ctl.mjs up` (600000) → `test smoke/board` → `test smoke/workbench` (각 600000)

게이트

- `smoke/board.spec`: `window.__mfe.board`가 `mounts === 1`, `reactSame === true`, `dnd` 필드 존재. `window.__mfe.orders.reactSame === true`도 동시에 참(두 remote가 한 React). 단독 페이지 `http://127.0.0.1:4302/` 렌더.
- 장애 격리: `:4302`를 끊으면 에러 카드가 board 패널에만, `:4301`을 끊으면 orders 패널에만 있고 나머지는 ready.
- `smoke/workbench.spec`: `?layout=workbench`에서 제품 슬롯 6개(`nav`, `orders`, `board`, `billing`, `telemetry`, `telemetry-x`)가 모두 ready(blocked·env-limit인 것은 제외하고 그 사실을 적는다). Nav의 토글로 `board`를 닫으면 `getTree()`에서 사라지고 다시 열면 돌아온다. 콘솔 에러 0건.

실패 시: B1-06과 같은 사다리. 3회 실패하면 `blocked(board)`.

커밋: `mfa-lab/apps/mfe-board`, `mfa-lab/apps/shell`, `mfa-lab/e2e/smoke`.

### B1-08 인계

할 일 (순서대로)

| 순서 | 내용 | 명령 (timeout) |
|---|---|---|
| 1 | 깨끗한 상태에서 복원 연습. 세션 2는 새 VM에서 시작하므로 이것이 유일한 예행이다. 서버를 내리고 `mfa-lab/` 아래의 `node_modules`, `dist`, `dist-*`, `.run/`을 지운다 | `node mfa-lab/scripts/ctl.mjs stop` 후 삭제 |
| 2 | 한 명령으로 복원. 설치·빌드에 걸린 시간을 기록 | `node mfa-lab/scripts/ctl.mjs up` (600000) |
| 3 | smoke 전체를 **연속 3회** 초록 | `node mfa-lab/scripts/ctl.mjs test smoke` ×3 (각 600000) |
| 4 | 세션 2 사전 점검과 같은 묶음: S1, S3, S5, S6. S5는 요구대로 실패해야 한다 | `test spike/s01`, `s03`, `s05`, `s06` |
| 5 | 문서를 실제 구축 내용으로 갱신 | 아래 |
| 6 | SPIKE.md 완성(HANDOFF, GO/NO-GO 권고), `env.json` 마무리 | — |
| 7 | diff 검사 | 아래 |
| 8 | 서버 종료, 최종 푸시, 최종 보고 | `node mfa-lab/scripts/ctl.mjs stop`, `ctl status` |

문서 갱신

- [ARCHITECTURE.md](./ARCHITECTURE.md), [HARNESS.md](./HARNESS.md), [RECIPES.md](./RECIPES.md): 이름·필드·명령이 실제와 다르면 고치고, 실행해 본 레시피 옆에 `실행 확인: <커밋>`을 적는다. 실행하지 못한 것은 "미실행"을 그대로 둔다.
- [BRIEF-2-inspect.md](./BRIEF-2-inspect.md): 바뀐 것(헬퍼 이름, blocked 행 등)은 날짜를 단 "Amendments" 절에만 적는다. 사전 등록된 기대·예측 표는 고치지 않는다.
- `mfa-lab/README.md`를 새로 쓴다: 클라우드와 Windows에서 실행하는 법, 명령, 포트, 레인. Windows 실행은 "미검증"으로 표시한다.

diff 검사 (둘 다 아무것도 출력하지 않아야 한다)

```bash
git diff --stat <시작 커밋>..HEAD -- src package.json package-lock.json tsconfig.json vite.config.ts
git status --short -- src package.json package-lock.json tsconfig.json vite.config.ts
```

`<시작 커밋>`은 STATE.md에 적힌 값이다.

게이트: [종료 조건](#종료-조건) 전부.

## 스파이크 표

스파이크 스펙은 **단언한다**. 실패는 하네스나 픽스처를 아직 믿을 수 없다는 뜻이다. 따로 적지 않으면 bare·control 패널만 쓴다. 파일은 `mfa-lab/e2e/spike/sNN-<slug>.spec.ts`이고 필터는 접두어(`spike/s03`)로 건다. 통과 조건은 전부 미실행 예측에서 나온 것이다.

| ID | 단계 | 종류 | 검사 | 통과 조건 |
|---|---|---|---|---|
| S0 | B1-01 | 게이트 | 브라우저 | Chromium이 뜬다. 테스트 페이지 PNG를 Read 도구로 열어 확인했다. rAF가 1초에 30회 이상 돈다(기대 약 60, 실측값 기록). `context.newCDPSession(page)`가 열리고 `Browser.getVersion`이 버전을 준다. `touch` 프로젝트에서 CDP `touchStart`가 `isTrusted === true`인 touchstart를 만든다(`mouse` 프로젝트에서의 결과는 기록만) |
| S1 | B1-03a | 게이트 | 마우스 드래그. `?layout=census&a=bare-0&b=bare-1&c=bare-2&d=bare-3`에서 p-d → (p-a, left, depth 1), hover, `overShadow` 릴리스 | trusted dragstart → dragenter → dragover → drop → dragend 순서. hover 중 `domTree`가 `H[p-d,p-a,V[p-b,p-c]]`이고 p-d에 shadow 스타일. `onMovePanel` 호출 1건. 커밋된 트리 = 미리보기. dragend의 `dropEffect`가 `'move'`. B1-03b부터 I1~I7 포함 |
| S2 | B1-03b | 게이트 | 잠긴 패널에 놓기, 소스 리마운트 없음. `?layout=locks`에서 editor → 루트 오른쪽 끝(미리보기) → `nav` 위로 이동 → 릴리스 | drop 없음. dragleave + dragend. dragend의 `dropEffect`가 `'none'`. `onMovePanel` 0건, 트리 불변. I1~I7 |
| S3 | B1-03b | 게이트 | 미리보기가 소스를 리마운트한 뒤 Esc. `?layout=locks`에서 terminal → (editor, left, depth 0) → Esc | 소스 노드에 직접 건 dragend가 `isConnected: false`로 찍힌다. `onMovePanel` 0건, 트리 불변. 브랜치 소스에서 I1~I7 |
| S4 | B1-03b | 게이트 | S3과 같되 Esc 대신 잠긴 `nav` 위에서 릴리스 | drop 없음, 트리 불변, I1~I7 |
| S5 | B1-03c | **양성 대조** | S3을 npm 0.5.1로 빌드한 shell(`http://127.0.0.1:4390`)에서 | I1(남은 `data-dragging-panel-id`)과 I2(남은 미리보기 shadow)가 **실패**한다. 아래 설명 참고 |
| S6 | B1-03d | 게이트 | 경계선 리사이즈. `?layout=row3`에서 p-a와 p-b 사이를 +150 px, 10 step | resizer에 `gotpointercapture`. p-a는 커지고 p-b는 줄어든다(방향). 변화량과 150 px의 차가 3 px 이하. `body.style.userSelect` 복원. `window.__fc.calls`에 `onResizeBorder`. I1~I7 |
| S7a | B1-03e | 게이트(터치) | 핸들 터치 드래그. (1) `?layout=pair`에서 p-a 핸들 → p-b 오른쪽에 커밋 (2) `?layout=locks`에서 editor 핸들 → terminal 위 미리보기 → `nav` 위로 이동 → 릴리스 | 오라클: 핸들 모드는 **롱프레스 없이 8 px 넘게 움직이면** 시작한다. touch 이벤트가 trusted. 드래그 중 ghost가 정확히 1개이고 끝나면 없다. (1) `onMovePanel` 1건, 트리 변경 (2) `nav` 위에서 ghost가 blocked 스타일, 릴리스 후 `onMovePanel` 0건·트리 불변. 이어서 두 번째 드래그가 시작된다. I1~I7 |
| S7b | B1-03e | 기록만 | `?drag=panel`에서 550 ms 롱프레스 후 이동·릴리스. 새 컨텍스트에서 실행 | 게이트가 아니다. 사전 등록 결과 — Chromium 141: 커밋. Chromium 153: 네이티브 dragstart나 touchcancel이 나올 수 있다. 나오면 프로브 로그와 함께 가설 H-TOUCH-NATIVE-RACE의 관찰로 적는다(분류 후보 `library-bug`, `env-limit` 아님) |
| S8 | B1-03f | 기록 | rAF 경합 비율. `census` bare에서 릴리스 모드(`overShadow`, `settled`, `immediate`) × 릴리스 시 커서 아래(`source`, `other-droppable`)마다 10회. 드롭마다 페이지를 새로 연다 | 비율 표 기록. `overShadow`는 0/10 기대 |
| S9 | B1-05 | 기록만 | iframe 사실 | `telemetry-x`가 별도 CDP 타깃(OOPIF)인가. 패널 드래그 중 커서가 same-site·cross-site iframe 위에 있을 때 dragover가 어느 프레임의 프로브에 찍히는가. cross-site iframe 안에서 `sessionStorage`를 쓸 수 있는가. `localhost`를 썼는가 `crosssite.test`를 썼는가 |
| S10 | B1-03f | 선택 | S1~S3을 `channel: 'chromium'`으로 | headless shell과 같은 이벤트 순서. 전체 바이너리가 없으면 건너뛴다 |

통과 조건의 근거 (코드)

| 조건 | 근거 |
|---|---|
| shadow 스타일 = 인라인 `opacity: 0.5` + dashed outline | [PanelNodeRenderer.tsx:13-17](../../../src/components/PanelNodeRenderer.tsx) |
| 잠긴 패널 위 dragover는 `dropEffect = "none"` 후 return | [PanelNodeRenderer.tsx:98-101](../../../src/components/PanelNodeRenderer.tsx) |
| S3: 소스에 직접 건 dragend 리스너 | [TreeLayout.tsx:144-150](../../../src/components/TreeLayout.tsx) |
| S6 허용 오차: px를 resizer(기본 8 px) 포함 split 전체 크기로 환산 | [LayoutNodeRenderer.tsx:61-66](../../../src/components/LayoutNodeRenderer.tsx), [resizerConstants.ts:1](../../../src/components/resizerConstants.ts) |
| S6: 리사이즈 중 호환 mouse 이벤트 없음(pointerdown을 `preventDefault`) | [useDragResize.ts:20](../../../src/hooks/useDragResize.ts) |
| S7a 오라클: 핸들 모드는 `armed`로 시작, 8 px 초과 이동에서 드래그 시작, 롱프레스 타이머는 핸들이 없을 때만 | [useTouchDrag.ts:234](../../../src/hooks/useTouchDrag.ts), 같은 파일 145-149, 246-250 |
| S7a: 핸들 모드의 패널은 `draggable=false`라 네이티브 드래그가 없다 | [PanelNodeRenderer.tsx:143](../../../src/components/PanelNodeRenderer.tsx) |
| S7a: blocked ghost = opacity 0.4 + 빨간 outline | [useTouchDrag.ts:11-12, 85-93](../../../src/hooks/useTouchDrag.ts) |
| S8: 취소되지 않는 패널별 rAF | [PanelNodeRenderer.tsx:103-106](../../../src/components/PanelNodeRenderer.tsx) |

`doc/API.ko.md` 33행은 핸들도 롱프레스라고 적지만 코드는 위와 같다. 이 불일치는 [HYPOTHESES.md](./HYPOTHESES.md)에 문서 불일치로 등록돼 있고 S7a는 코드 기준으로 판정한다.

S5 설명

- npm 0.5.1은 dragend를 루트의 React `onDragEnd`로 받는다. 설계 검토 때 `v0.5.1` 태그와 배포 번들(https://unpkg.com/@dannysir/floating-components@0.5.1/dist/index.js )에서 확인한 내용이고, 이 문서를 쓰면서 다시 열어 보지는 않았다. B1-03c에서 `mfa-lab/apps/shell/node_modules/fc-051/dist/index.js`를 열어 `onDragEnd`가 있는지 직접 확인하고 SPIKE.md에 적는다. 미리보기가 소스 패널을 리마운트하면 브라우저는 dragend를 **문서에서 분리된 원본 노드**로 보내고, 그 이벤트는 루트까지 버블링되지 않는다. 그래서 0.5.1에서는 미리보기와 `data-dragging-panel-id`가 남아야 한다. 배경은 `doc/TODO.md`의 "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실".
- S5가 요구대로 실패하면 세 가지가 증명된다: (1) 하네스의 입력이 실제 브라우저처럼 분리된 노드로 dragend를 보낸다 (2) 불변식 I1·I2가 멈춘 상태를 잡아낸다 (3) 같은 동작이 브랜치 소스에서 통과한 것(S3)이 하네스의 무딤 때문이 아니다.
- 판정: I1과 I2가 둘 다 실패하는 것이 예측이다. 둘 중 하나만 실패해도 "멈춘 상태를 봤다"로 보고 요구 충족으로 적되 어느 쪽인지 기록한다. **둘 다 통과하면** 하네스가 알려진 버그를 못 보는 것이고 BLOCKED-ORACLE이다.
- S5 스펙은 전제도 단언한다: `window.__fc.lib.source === 'npm051'`, 미리보기 중 소스가 리마운트됨. 전제가 깨지면 S5는 무효(하네스 문제)이지 BLOCKED-ORACLE이 아니다.

재실행 시점

| 시점 | 다시 돌리는 검사 | 조건 |
|---|---|---|
| B1-06 (federation 플러그인 추가 후) | S1, S2, S3, S6 | 통과 + 이벤트 로그가 B1-03 기준선과 같다 |
| B1-06 | S5 | 여전히 요구대로 실패 |
| B1-08 인계 | S1, S3, S5, S6 | 위와 같다 |
| 세션 2 사전 점검 | S1, S3, S5, S6 (터치 시나리오 전에 S7a) | [BRIEF-2-inspect.md](./BRIEF-2-inspect.md) "사전 점검" |

## GO 기준

세션 1은 SPIKE.md에 **권고**를 쓴다. 결정은 사용자가 하고, 세션 2 프롬프트에 `SPIKE.md를 읽었고 GO(caveat: ...)로 결정했다` 한 줄로 남긴다. 세션 2의 B2-00이 그 줄을 확인한다.

필수 (하나라도 어긋나면 NO-GO 권고)

| 조건 | 어긋났을 때 |
|---|---|
| S0, S1, S2, S3, S4, S6 통과 | NO-GO. S0과 S1의 입력 실패는 그 전에 중단 조건이다 |
| S5가 요구대로 실패 | BLOCKED-ORACLE (중단) |
| 최소 인계: shell + 하네스 스파이크 + 컨테이너 유형 2종 이상 | NO-GO |
| diff 검사가 비어 있음 | NO-GO. 원인을 되돌린 뒤 다시 검사 |

컨테이너 유형은 same-tree(`orders` 또는 `board`), mount(`billing`), iframe(`telemetry`) 셋이다. 그 유형의 remote가 하나라도 smoke 게이트를 통과했으면 1종으로 센다. `MF: degraded`에서도 same-tree는 유형으로 센다(조건 표시와 함께).

조건부 GO (GO-with-caveats). run 01 시나리오 ID는 R01~R19이고 정의는 [BRIEF-2-inspect.md](./BRIEF-2-inspect.md) "시나리오 표"에 있다.

| 조건 | STATE.md 표시 | `blocked`가 되는 run 01 행 | 표시만 붙이고 실행하는 행 |
|---|---|---|---|
| MF 저하 | `MF: degraded` | R16 전체. R09·R10의 remote 대 twin 비교. 그 밖에 orders·board에 대한 모든 "remote 대 twin" 귀속 단계 | R03·R04·R05·R13·R17의 orders·board 칸은 `MF degraded (빌드 타임 통합)` 표시로 실행 |
| 터치 불가 (S7a 실패) | `터치: env-limit` | R13 전체, R14 전체, R18의 터치 동작, P1의 롱프레스 항목 | R18은 마우스만으로 실행 |
| cross-site iframe 불가 | `telemetry-x: env-limit` | R03의 `telemetry-x` 변형, R12의 `telemetry-x` 열, R15의 `telemetry-x` 쪽 경계선, R17의 `telemetry-x` 패널 | 나머지 iframe 행은 `telemetry`로 실행 |
| remote 하나 막힘 | `blocked(<변형>)` | 아래 표 | — |

remote별 막히는 행

| 막힌 remote | `blocked`가 되는 행 |
|---|---|
| `blocked(orders)` | R03의 orders 변형, R04의 orders 변형, R05 전체, R13의 orders 변형, R16 전체, R17의 orders 패널 |
| `blocked(board)` | R09, R10, R11의 remote 행(twin `board-local`과 단독 페이지 행은 실행), R17의 board 패널과 Nav 토글 |
| `blocked(billing)` | R03의 billing 변형, R04의 billing 변형, R05 전체, R13의 billing 변형, R17의 billing 패널 |
| `blocked(telemetry)` | R03의 telemetry·telemetry-x 변형, R04의 telemetry 변형, R05 전체, R06 전체, R07의 iframe 경우, R12 전체, R13의 telemetry 변형, R15 전체, R17의 telemetry·telemetry-x 패널 |

- 조건이 겹치면 막히는 행은 합집합이다.
- R01, R02, R08, R19는 bare·control 패널만 쓰므로 필수 조건이 충족되면 항상 실행할 수 있다.
- `telemetry-x OOPIF: no`(로드는 되지만 같은 프로세스)는 조건부 GO 항목이 아니다. 행은 실행하고 결과에 그 사실을 붙인다.
- SPIKE.md 권고에는 해당하는 조건과 막히는 행 목록을 이 표에서 그대로 옮겨 적는다.

## 중단 조건

아래에 해당하면 더 진행하지 않는다. 절차: `doc/qa/BLOCKED.md`를 쓴다 → STATE.md "차단 사항"과 "다음 작업"(같은 단계 + "BLOCKED.md 참고")을 갱신한다. 그 단계의 행은 체크하지 않는다 → 경로를 명시해 커밋·푸시 → `node mfa-lab/scripts/ctl.mjs stop` → 사용자에게 보고.

| 코드 | 조건 | 단계 | 메모 |
|---|---|---|---|
| BLOCKED-NODE | Node < 22.12 | B1-00 | `/opt/node*`에 무엇이 있는지 BLOCKED.md에 적는다. Node를 바꾸는 것은 사용자의 환경 설정 몫이다 |
| BLOCKED-NETWORK | npm 레지스트리 접근 불가(B1-00의 `npm ping` 3회 실패), 또는 모든 프로젝트에서 `npm install` 실패 | B1-00, B1-01, B1-02 | 프록시 변수와 curl 응답 코드를 적는다 |
| BLOCKED-BROWSER | 레인 B, A, C 모두에서 Chromium을 띄우지 못함 | B1-01 | 아래 "http-only 계속 진행" |
| BLOCKED-INPUT | 어떤 바이너리로도 trusted 드래그 시퀀스가 나오지 않음 | B1-03a | 프로브 로그 전체를 첨부 |
| BLOCKED-ORACLE | S5가 실패하지 않음(0.5.1에서 I1·I2가 모두 통과) | B1-03c, B1-06, B1-08 | 다른 무엇보다 **S3과 S5의 이벤트 로그**를 먼저 보고한다 |
| BLOCKED-ALIAS | 라이브러리 소스 alias와 dist 대체가 모두 실패 | B1-02 | 빌드 오류 전문 |
| BLOCKED-SCOPE | `src/`, 루트 `package.json`, 루트 `package-lock.json`, 루트 `tsconfig.json`, 루트 `vite.config.ts`를 고쳐야만 진행 가능 | 전 단계 | 고치지 않는다. 무엇을 왜 고쳐야 한다고 봤는지 적는다 |
| BLOCKED-LANE | 재개했는데 커밋된 레인을 쓸 수 없음 | 재개 절차 | 레인을 조용히 바꾸지 않는다 |

BLOCKED-NODE와 BLOCKED-LANE, BLOCKED-ALIAS, BLOCKED-SCOPE라는 이름은 이 문서가 붙인 것이다.

http-only 계속 진행 (BLOCKED-BROWSER일 때만)

- 멈추기 전에 B1-02, B1-04, B1-05, B1-06, B1-07을 **빌드와 `ctl smoke`(HTTP 검사)만으로** 진행해도 된다. 브라우저 스펙은 작성하되 실행하지 않는다.
- 그렇게 한 단계는 STATE.md 결과 칸에 `http-only`로 적고 **체크하지 않는다**. B1-01도 체크하지 않는다.
- B1-03a~f는 건너뛴다. 스파이크도 GO도 없다.
- 재개하면 B1-01부터 단계 순서대로 브라우저 게이트를 실행한다. 그래야 실패를 어느 단계의 변수 탓인지 가릴 수 있다.
- 다 했으면 BLOCKED.md를 쓰고 멈춘다.

`doc/qa/BLOCKED.md` 양식

```markdown
# BLOCKED — <코드> (<단계>)

- 작성: <date -u +%Y-%m-%dT%H:%MZ>
- 작업 브랜치: <이름>, 마지막 커밋: <short hash>

## 멈춘 단계
<단계 ID와 게이트 조건 중 실패한 것>

## 실행한 명령
<정확한 명령 한 줄. 환경 변수 포함, 비밀 값 제외>

## 마지막 로그 40줄
<명령 출력 또는 mfa-lab/.run/logs/<app>.log 의 끝 40줄>

## 시도한 것
1. <시도 1: 바꾼 것 → 결과>
2. <시도 2>
3. <시도 3>

## 가설
<원인 추정. 확인한 것과 추정을 구분>

## 사용자가 바꿀 수 있는 것
<예: 클라우드 환경 네트워크를 Custom으로 바꾸고 cdn.playwright.dev, playwright.download.prss.microsoft.com 추가>

## 재개 방법
<같은 프롬프트로 새 세션을 시작한다. STATE.md의 "다음 작업"이 <단계>를 가리킨다. 재개 후 먼저 실행할 명령>
```

## SPIKE.md 작성 규칙

파일은 `doc/qa/run00-spike/SPIKE.md`. B1-01에서 만들고 단계마다 덧붙여 커밋한다(VM이 회수돼도 남도록). 본문은 한국어, 식별자·명령은 영어.

- 관찰한 것만 사실로 쓴다. 실행하지 않은 것은 "미실행", 추정은 "추정"으로 표시한다.
- 결과마다 실행한 커밋(short hash)을 적는다.
- 라이브러리 버그로 보이는 것은 "라이브러리 버그 의심 메모"에만 적는다. 고치지 않고 발견 ID도 붙이지 않는다.
- 증거 파일은 `doc/qa/run00-spike/evidence/`에 둔다. PNG는 1280x800, device scale 1, 꼭 필요한 것만(전체 10장 이내). JSON 로그는 동작 구간만 남긴다. trace와 video는 커밋하지 않는다.

목차

| 절 | 내용 |
|---|---|
| 1. 환경 | `env.json` 요약: OS, Node, npm, 프록시 유무, root 여부, shallow clone, 작업 브랜치, 시작 커밋, 라이브러리 트리 해시·커밋 |
| 2. 레인 | 선택한 레인과 이유, 시도한 레인별 결과, Playwright·Chromium 버전, 바이너리 종류(headless shell / chromium), 설치 방법 |
| 3. 검사별 결과 | S0~S10 표: 결과(통과 / 실패 / 요구대로 실패 / 기록 / 건너뜀), 시도 횟수, 커밋, 한 줄 메모. rAF 실측값, 터치에 `hasTouch`가 필요한지 포함 |
| 4. 이벤트 로그 기준선 | S1~S4, S6의 이벤트 순서(종류·대상·`isTrusted`)와 기준선 파일 경로. B1-06 재실행과의 비교 결과 |
| 5. S8 비율 표 | 릴리스 모드 × 커서 아래 분류별 stale preview 건수/10. `immediate`의 비율은 사용자 체감 빈도가 아니라는 문장 포함 |
| 6. S9 iframe 사실 | OOPIF 여부, dragover가 찍힌 프레임, `sessionStorage` 가능 여부, 사용한 호스트 이름 |
| 7. S7b 관찰 | 레인, 네이티브 dragstart·touchcancel 유무, 프로브 로그 발췌 |
| 8. 라이브러리 버그 의심 메모 | 증상, 재현 명령, 관련 스펙. 판단은 세션 2로 넘긴다 |
| 9. HANDOFF | 실행 모드(prod만), 버전 핀, 레인, MF 상태와 통과한 사다리 단, `shareStrategy`, 라이브러리 소스(`src` 또는 `dist`), detached 서버 생존 여부, blocked 변형, 알려진 하네스 부작용, 복원 명령(`ctl up` → `ctl test smoke`), 설치·빌드·smoke 소요 시간, 작업 브랜치 이름 |
| 10. GO / NO-GO 권고 | 필수 조건별 충족 여부, 해당하는 조건부 항목, `blocked`가 되는 run 01 행 목록, 권고 한 줄. 사용자가 세션 2 프롬프트에 붙일 문장 예시 |

`env.json` 필드 (`doc/qa/run00-spike/env.json`). 모르는 값은 `null`. 단계가 진행되면 채운다.

| 필드 | 기록 단계 | 값 |
|---|---|---|
| `written_at` | 매 갱신 | `date -u` ISO 문자열 |
| `working_branch`, `start_commit` | B1-00 | 문자열 |
| `library.tree`, `library.commit` | B1-00 | `git rev-parse HEAD:src`, `git rev-list -1 HEAD -- src` |
| `shallow_clone` | B1-00 | boolean |
| `os`, `arch`, `node`, `npm` | B1-00 | 문자열 |
| `uid`, `sudo_noninteractive` | B1-00 | 숫자, boolean |
| `proxy` | B1-00 | 변수별 설정 여부와 host:port. 계정 정보는 지운다 |
| `network` | B1-00 | 호스트별 curl `http_code`, `npm_ping`(`ok` 또는 `fail`) |
| `playwright_env`, `opt_pw_browsers` | B1-00 | `PLAYWRIGHT_*` 값, `/opt/pw-browsers` 디렉터리 이름 배열 |
| `ports_free` | B1-00 | 포트별 boolean |
| `lane_candidate` | B1-00 | `B`, `A`, `C`, `none` |
| `lane`, `playwright`, `chromium`, `chromium_binary` | B1-01 | `lane.json`과 같은 값 + `headless-shell` 또는 `chromium` |
| `raf_per_second`, `cdp_touch_trusted`, `cdp_touch_needs_hasTouch` | B1-01 | 숫자, boolean, boolean |
| `lib_source` | B1-02 | `src` 또는 `dist` |
| `detached_servers_survive` | B1-02 | boolean |
| `touch` | B1-03e | `ok` 또는 `env-limit` |
| `telemetry_x_host`, `telemetry_x_oopif`, `iframe_session_storage` | B1-05 | `localhost` / `crosssite.test` / `env-limit`, boolean, boolean |
| `mf`, `share_strategy`, `mf_ladder_rung` | B1-06 | `on` 또는 `degraded`, 문자열, 통과한 단 |
| `blocked_variants` | B1-04~07 | 배열 |
| `durations_s` | B1-08 | `install`, `build`, `smoke` 초 단위 |

## 종료 조건

B1-08을 닫으려면 전부 참이어야 한다.

- 환경과 레인이 `env.json`, `lane.json`, STATE.md에 기록돼 있다.
- 깨끗한 상태에서 `node mfa-lab/scripts/ctl.mjs up` 한 번으로 Tier 1이 설치·빌드·기동된다.
- prod 모드 smoke가 연속 3회 초록이다.
- S0~S9 결과가 SPIKE.md에 있고, HANDOFF와 GO/NO-GO 권고가 쓰여 있다.
- ARCHITECTURE.md, HARNESS.md, RECIPES.md가 실제 구축 내용과 맞고 `mfa-lab/README.md`가 있다.
- diff 검사 두 명령이 아무것도 출력하지 않는다.
- 서버가 내려가 있다(`ctl status`). 전부 푸시됐다(`git status --short`가 비어 있고 `git log origin/<작업 브랜치>..HEAD`가 비어 있다).
- STATE.md의 B1 행이 전부 닫혀 있고 "다음 작업"이 `B2-00 (사용자 GO 결정 대기)`다.

최소 인계: 전부를 끝내지 못해도 **shell + 하네스 스파이크(S0~S6) + 컨테이너 유형 2종 이상**이면 B1-08을 진행해 인계할 수 있다. 못 만든 remote는 `blocked(<변형>)`으로 남긴다. 이보다 적으면 B1-08에서 NO-GO 권고와 함께 현재 상태를 인계한다.

최종 보고에 넣을 것: 작업 브랜치 이름, 닫힌 단계와 남은 단계, 레인, MF 상태, 터치 상태, blocked 변형, S5 결과, GO/NO-GO 권고와 막히는 run 01 행, 사용자가 할 일(SPIKE.md 읽기, GO 결정, 작업 브랜치를 PR로 `qa/mfa-lab`에 머지).
