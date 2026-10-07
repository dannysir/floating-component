# mfa-lab — Harbor Workbench 검수 랩

`@dannysir/floating-components`(이 저장소의 `src/`)를 마이크로 프론트엔드(MFA) 환경에서 **실제 입력**으로 검수하기 위한 픽스처와 Playwright 하네스다. 설계는 [doc/qa/mfa/ARCHITECTURE.md](../doc/qa/mfa/ARCHITECTURE.md), 하네스 규칙은 [doc/qa/mfa/HARNESS.md](../doc/qa/mfa/HARNESS.md), 스파이크 결과는 [doc/qa/run00-spike/SPIKE.md](../doc/qa/run00-spike/SPIKE.md).

- 프로젝트마다 자기 `package.json`·`package-lock.json`을 가진다(npm workspaces 없음). 루트 `package.json`·`src/`는 건드리지 않는다.
- 라이브러리는 shell만 `<repo>/src/index.ts`로 alias한다(`resolve.dedupe`로 React 한 벌). 루트 `npm ci`는 필요 없다.
- 판정 모드는 prod(`vite build` + `vite preview`)뿐이다.

## 구성

| 디렉터리 | 내용 | origin |
|---|---|---|
| `apps/shell` | host. 레이아웃 라이브러리의 유일한 소비자. Module Federation host | http://127.0.0.1:4300 (npm 0.5.1 기준 빌드 `dist-051`은 :4390) |
| `apps/mfe-orders` | same-tree MF remote `orders` | http://127.0.0.1:4301 |
| `apps/mfe-board` | same-tree MF remote `board`(자체 HTML5 DnD 칸반) | http://127.0.0.1:4302 |
| `apps/mfe-billing` | mount remote(`/remote-entry.js`의 `mount`/`unmount`, 자기 React) | http://127.0.0.1:4303 |
| `apps/mfe-telemetry` | iframe remote(바닐라 TS). `telemetry` = 127.0.0.1, `telemetry-x` = localhost(cross-site) | http://127.0.0.1:4304, http://localhost:4304 |
| `contract` | `@harbor/contract`(타입, 프로브, 버스, 스타일). React 없음 | — |
| `e2e` | Playwright 하네스(`helpers/`, `smoke/`, `spike/`, 세션 2의 `explore/`·`regression/`) | — |
| `scripts/ctl.mjs` | 의존성 없는 실행 도구 | — |
| `registry.json` | 이름·origin·진입점·버전 핀의 단일 기준 | — |

## 레인

`e2e/lane.json` = 레인 **B**: `@playwright/test@1.63.0` + Chromium 153.0.8010.12(리비전 1243) headless shell. 브라우저는 `mfa-lab/.run/pw-browsers/`(git 무시)에 설치된다. 실행 인자 `--no-proxy-server --site-per-process`. 레인은 조용히 바꾸지 않는다(`ctl up`이 커밋된 레인의 브라우저를 설치하지 못하면 BLOCKED-LANE으로 끝난다).

## 클라우드에서 실행 (확인됨, 2026-10-07)

저장소 루트에서:

```bash
node mfa-lab/scripts/ctl.mjs up                      # 설치(npm ci + 레인 브라우저) → 빌드 → 서버 → smoke. 깨끗한 상태에서 약 40초
node mfa-lab/scripts/ctl.mjs test smoke              # 스모크 스펙 전체
node mfa-lab/scripts/ctl.mjs test spike/s01          # 스파이크 하나 (필터는 경로 접두어)
node mfa-lab/scripts/ctl.mjs test spike/s07a --project touch
node mfa-lab/scripts/ctl.mjs stop                    # 작업이 끝나면 서버를 내린다
```

Bash 도구 timeout: `install`·`up`·`test`는 600000, `build`는 300000, 나머지는 기본.

| 명령 | 하는 일 |
|---|---|
| `doctor [--write <path>]` | 환경 탐침(Node, npm, 네트워크, 프록시, 권한, git, 브라우저, 포트, 레인 해석). `--write`는 JSON을 덮어쓴다 |
| `install [--only a,b] [--fresh]` | 프로젝트별 `npm ci`(lockfile 없으면 `npm install`) + 레인 브라우저. lockfile 해시가 같으면 건너뛴다. 의존성을 바꾼 프로젝트는 `--fresh` |
| `build [--only a,b] [--lib src\|npm051] [--mf on\|off] [--stamp s] [--force]` | remote 먼저, shell 나중. 입력이 같으면 건너뛴다. `--lib npm051`은 :4390용 `dist-051` |
| `serve [--baseline] [--only a,b] [--foreground]` | `vite preview`를 분리 프로세스로. 이미 준비된 앱은 건너뛴다 |
| `status [--json]` / `smoke` / `stop [--only a,b]` | 생존·준비 확인 / 브라우저 없는 검사(핀, 보호 경로, 준비, MF 매니페스트, billing 단독 페이지) / 서버 종료 |
| `up` | doctor → install → 레인 확인 → build(src, npm051) → serve --baseline → smoke |
| `test <filter> [--project mouse\|touch\|mouse-full]` | 서버 확인 뒤 Playwright. `--project` 기본 `mouse` |

`--only`에 쓰는 이름: `shell`, `shell-051`, `mfe-orders`, `mfe-board`, `mfe-billing`, `mfe-telemetry`, `e2e`(install만).

## Windows에서 실행 (미검증)

같은 명령을 저장소 루트에서 `node mfa-lab\scripts\ctl.mjs up`처럼 실행하도록 만들었다(경로는 `fileURLToPath`, npm은 win32에서 `shell: true`, 종료는 `taskkill /T /F`). **실제 Windows에서는 실행해 보지 않았다.** 레인 B 브라우저 설치(`playwright install chromium`)와 각 lockfile의 Windows용 optional 패키지(`@rollup/rollup-win32-x64-msvc`, `@esbuild/win32-x64`)는 `ctl smoke`가 경고로 확인한다.

## 주의

- `mfa-lab/.run/`, `e2e/.artifacts/`, `e2e/test-results/`, `**/dist-*/`, `node_modules/`, `dist/`는 git에서 무시된다. 브라우저 바이너리를 커밋하지 않는다.
- 스펙은 `ctl test`로만 돌린다(`npx playwright test` 직접 실행 금지: 서버 확인과 레인 환경이 빠진다).
- 드래그는 `page.mouse`(CDP 드래그 인터셉트), 터치는 CDP `Input.dispatchTouchEvent`. 합성 `dispatchEvent`와 `locator.dragTo`는 쓰지 않는다.
