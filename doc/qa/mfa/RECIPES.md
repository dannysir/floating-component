# MFA 랩 레시피 (RECIPES)

> **이 문서는**
> - 무엇: `mfa-lab/` 아래에 만들 설정 파일과 코드 골격의 **전문**이다. 클라우드 세션 1이 각 단계에서 복사해 시작점으로 쓴다. 파일마다 목적, 처음 쓰는 단계(B1-xx), 알려진 함정, 1차 자료 URL을 붙였다.
> - 누가·언제: 세션 1이 [BRIEF-1-build.md](./BRIEF-1-build.md) 「단계」의 각 단계 직전에 그 단계가 가리키는 레시피만 읽는다. 세션 2는 하네스 헬퍼를 고칠 때만 연다.
> - 의존: 이름·슬롯·포트·계측 필드·`ctl.mjs` 명령의 **정의**는 [ARCHITECTURE.md](./ARCHITECTURE.md), 헬퍼의 **동작 규칙**은 [HARNESS.md](./HARNESS.md)가 정한다. 이 문서의 골격과 그 두 문서가 다르면 그 두 문서가 우선이고, 세션 1이 B1-08에서 이 문서를 실제 구현에 맞게 고친다.
> - 상태: 2026-10-02에 문서·소스 리딩으로 썼고, 2026-10-07 세션 1이 실제로 빌드·실행했다. 실행한 레시피는 머리 표의 상태가 `실행 확인: 40ac74c`이고, 실제 파일과의 차이는 「B1-08 구축 결과」에 있다. 그 표시가 없는 것(`fallbackPlugin.ts`, 레인 A·C 명령)은 여전히 설계다.

## 읽는 법

- 레시피마다 머리에 표가 하나 있다: 목적 / 처음 쓰는 단계 / 상태 / 출처. 상태는 처음에 전부 `미실행`이다.
- 코드는 복사해서 시작할 수 있게 완결된 형태로 적었지만, 실행하지 않았으므로 **타입 오류·오타·API 불일치가 있을 수 있다**. 빌드 오류가 나면 아래 「레시피가 어긋날 때」를 먼저 따른다.
- 코딩 규칙은 저장소 규칙([CLAUDE.md](../../../CLAUDE.md))을 따른다: arrow function만, named export만, 타입은 `import type`, 불변 업데이트. 허용된 예외는 `vite.config.ts`·`playwright.config.ts`·MF 런타임 플러그인 파일의 `export default`, `React.lazy`용 `{ default: m.Panel }` 어댑터, `RemoteErrorBoundary` class뿐이다([ARCHITECTURE.md](./ARCHITECTURE.md) 「코딩 규칙 예외」). JSON 파일과 `@vitejs/plugin-react`처럼 **남의** default export를 import하는 것은 예외가 아니라 그냥 import다.
- 주석의 `src/...:NN`은 이 저장소 `src/`의 파일과 줄이다. 라이브러리 동작에 기대는 부분마다 적었다.
- 파일 경로는 전부 저장소 루트 기준이다.

## B1-08 구축 결과 (2026-10-07, 세션 1)

이 문서의 레시피는 세션 1이 실제로 빌드·실행했다. 머리 표의 상태가 `실행 확인: 40ac74c`인 레시피는 그 커밋의 파일이 기준이고, 아래 차이가 있다. `src/mf/fallbackPlugin.ts`(사다리 (b)-2)와 레인 A·C 명령은 쓰지 않았으므로 `미실행`이다.

| 레시피 | 실제 구현과의 차이 |
|---|---|
| 3.1 shell `package.json` | 최종 devDependencies: `vite`, `@vitejs/plugin-react`, `fc-051`(B1-03c), `@module-federation/vite`(B1-06) |
| 3.2/3.5 shell `vite.config.ts` | 2단계 설정이 최종이다. `LAB_MF` 기본값은 `ctl build`가 정한다(아래 8절 차이) |
| 3.3 `index.html` | `<link rel="icon" href="data:," />` 추가(풀 바이너리 `channel: 'chromium'`이 `/favicon.ico`를 요청해 404 콘솔 에러 → I6 실패). `mfe-billing/public/index.html`, `mfe-orders`·`mfe-board`·`mfe-telemetry`의 `index.html`도 같다 |
| 3.4 `main.tsx` | URL 플래그 오류면 `ShellError`(`shell-error`)를 그리고 `markError`. `strict=1`이면 `StrictMode` |
| 3.8 `store.tsx` | 19개 키 전부 등록. `bus` import는 B1-04부터 |
| 3.10 `PanelFrame.tsx` | 구독 직후 `rerender()` 한 번(첫 마운트 갱신이 구독 전에 지나가 배지가 `f0 c0`으로 남던 문제) |
| 3.11 `Bare.tsx`·`ControlPanel.tsx` | `Bare`도 `harbor:probe`를 구독해 배지를 갱신한다. `ControlPanel`의 `reactSame`은 하드코딩 대신 `window.__fc.reactRef.createElement === React.createElement`로 계산한다 |
| 4.1 mfe-orders `package.json` | B1-06 순서 1부터 `@module-federation/vite`를 **포함**했다(BRIEF-1 B1-06 「만들 것」 1의 지시를 따름. 이 절의 "빼고 쓴다" 문장과 다르다). `--mf off` 빌드에서는 `federation()`이 호출되지 않을 뿐 import는 풀린다 |
| 4 mfe-board | 레시피 없이 작성: `src/Panel.tsx`의 칸반(`application/x-harbor-card`), `<img>`(SVG data URI), `<a href>`, copy 쌍(`application/x-harbor-copy`). `dnd` 필드: `cardMoves`(카드 이동 성공), `zoneDrops`(열이 받은 drop 수, 타입 무관), `copyDrops`, `lastDragend`(board 안에서 시작한 드래그의 dragend `dropEffect`·`effectAllowed`), `lastTypes`(마지막 dragover/drop의 types) |
| 7.2 `playwright.config.ts` | `launchOptions.args = ['--no-proxy-server', '--site-per-process']`(B1-05 사다리 telemetry-x 3. headless shell은 기본으로 사이트 격리를 하지 않는다). 프로젝트 `mouse-full`(`channel: 'chromium'`, S10)을 상시 둔다 |
| 7.4 `settle.ts` | 마지막 결과를 페이지별로 기억한다(`lastSettleOf`). 스냅샷의 `settle` 필드가 쓴다 |
| 7.5 `geometry.ts` | `harnessError`는 `helpers/errors.ts`에서 가져온다. `treeNotation`, `resizerBetween` 추가 |
| 7.6 `mouseDrag.ts` | **`teleport`: 이동 직후 프로브에 dragover가 없으면 같은 점으로 한 번 더 이동한다.** Blink는 드래그 대상 요소가 바뀌는 갱신에서 `dragenter`/`dragleave`만 보내고 `dragover`는 다음 갱신으로 미룬다(S1 1회차 실패의 원인). teleport당 dragover 1회 규칙은 유지된다. `teleportMoves`(1 또는 2) 필드가 있다 |
| 7.7 `touch.ts` | **`handleDrag`: 시작 이동을 12px 한 번 → 12px, 24px 두 번으로 나눈다.** Chromium은 touch slop 영역 안의 첫 `touchmove`를 페이지에 보내지 않는다(12px에서 `pointermove`만 나옴, S7a 1회차 실패의 원인). `TouchResult`는 HARNESS 표의 필드 + `ghostsDuring`, `touchTrusted`, `events` |
| 7.8 `probe.init.ts` | 최초 렌더(트리 루트째 `#root`에 붙음)의 패널도 `added`로 기록하도록 MutationObserver 조건을 고쳤다(전에는 remount가 `added`로 보였다). `__probe.seqOf(el)` 추가(스냅샷의 `elementSeq`). 합치기는 직전 레코드와만 비교하므로 capture/bubble이 번갈아 오는 실제 로그에서는 거의 합쳐지지 않는다(teleport의 dragover는 capture 1 + bubble 1) |
| 7.x 추가 헬퍼 | `errors.ts`(`harnessError`, class 대신 name을 붙인 Error), `presets.ts`(프리셋 기대 JSON), `labstate.ts`(페이지별 로그), `events.ts`, `frames.ts`(`frameOfSlot`, `readFrameMfe`), `baseline.ts`(`reduceEvents`, `writeBaseline`), `invariants.ts`, `evidence.ts`(`compareBaseline`, `readBaseline`, `capture`, `finishCase`, `writeObservation`, `promote`), `resize.ts`(`resizeBorder`, `touchResize`), `snapshot.ts`(`snapshot`, `diff`, `seedContent`) |
| 8 `ctl.mjs` | `lib/buildinfo.mjs` 추가(`.run/build.json`, 준비 판정 대상). `build`의 `--mf` 기본값: `mfa-lab/mf-mode.json`이 있으면 그 값(MF degraded 기록용, 현재 없음), 없으면 그 앱 `package.json`에 `@module-federation/vite`가 있으면 `on`, 아니면 `off`. `--lib npm051`은 `shell-051`만 빌드한다. 스탬프는 `--stamp` 또는 환경 변수 `LAB_BUILD_STAMP`(지정하면 항상 빌드). `up`은 `.run/durations.json`을 쓴다. `install`은 레인 브라우저를 못 찾으면 3, `up`은 BLOCKED-LANE이면 3으로 끝난다. `doctor` 출력에 `node_ok`, `lab_pw_browsers`, `lane_resolution`, `lane_local`이 더 있다 |
| 9 레인 B | 1차 시도(`install chromium`)가 성공했다. 다운로드 URL `https://cdn.playwright.dev/builds/cft/153.0.8010.12/linux64/chrome-headless-shell-linux64.zip`. 풀 바이너리 `chromium-1243`도 함께 받아진다. 수동 다운로드 단은 쓰지 않았다 |
| 10 #1, #8 | #1의 "이후 `mouse.move`마다 `dragOver`" 자체는 맞지만, 페이지가 받는 것은 대상 변경 시 `dragenter`/`dragleave`뿐이고 dragover는 다음 이동에서 온다(7.6 차이). #8의 `hasTouch` 질문: CDP `touchStart`는 `hasTouch` 없이도 trusted touchstart를 만든다(S0) |

## 레시피가 어긋날 때 (1차 자료 읽기)

`@module-federation/vite` 1.23.0은 2026-09-28에 나왔고, Vite 7.3.6·Playwright 1.63.0도 최근 버전이다. 레시피가 안 맞으면 기억이나 이 문서가 아니라 **설치된 패키지 자신**을 1차 자료로 읽는다.

| 패키지 | 설치 뒤 읽을 파일 |
|---|---|
| `@module-federation/vite` | `mfa-lab/apps/shell/node_modules/@module-federation/vite/README.md`, 같은 디렉터리 `lib/index.d.ts`(옵션 타입), `lib/utils/normalizeModuleFederationOptions.*`(기본값) |
| `vite` | `mfa-lab/apps/shell/node_modules/vite/dist/node/index.d.ts`의 `UserConfig`, `BuildOptions`, `LibraryOptions` |
| `@playwright/test` | `mfa-lab/e2e/node_modules/@playwright/test/index.d.ts`(TestOptions), `mfa-lab/e2e/node_modules/playwright-core/browsers.json`(버전 대응), `mfa-lab/e2e/node_modules/playwright-core/types/protocol.d.ts`(CDP 타입) |
| 라이브러리 | 이 저장소 `src/`. 하네스가 기대는 선택자와 스타일 값은 [HARNESS.md](./HARNESS.md) 「불변식」 표에 줄 번호와 함께 있다 |

온라인 1차 자료(이 문서가 인용한 것):

| 주제 | URL |
|---|---|
| `@module-federation/vite` README(옵션 설명) | https://raw.githubusercontent.com/module-federation/vite/main/README.md |
| 같은 플러그인의 옵션 기본값 | https://raw.githubusercontent.com/module-federation/vite/main/src/utils/normalizeModuleFederationOptions.ts |
| 상위 예제 host / remote 설정 | https://raw.githubusercontent.com/module-federation/vite/main/examples/vite-vite/vite-host/vite.config.js , https://raw.githubusercontent.com/module-federation/vite/main/examples/vite-vite/vite-remote/vite.config.js |
| Module Federation 문서(Vite 통합, `shareStrategy`) | https://module-federation.io/integrations/build-tool/vite , https://module-federation.io/configure/shareStrategy.html |
| Vite 설정 | https://vite.dev/config/shared-options , https://vite.dev/config/server-options , https://vite.dev/config/preview-options , https://vite.dev/config/build-options , https://vite.dev/guide/build , https://vite.dev/guide/cli , https://vite.dev/guide/api-plugin |
| Playwright | https://playwright.dev/docs/api/class-testoptions , https://playwright.dev/docs/test-cli , https://playwright.dev/docs/browsers , https://playwright.dev/docs/api/class-browsercontext , https://playwright.dev/docs/test-reporters |
| CDP Input 도메인(원문 pdl) | https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Input.pdl |
| Node `child_process`, `process.kill` | https://nodejs.org/api/child_process.html , https://nodejs.org/api/process.html |
| npm alias, `npm ping` | https://docs.npmjs.com/cli/v11/commands/npm-install , https://docs.npmjs.com/cli/v11/commands/npm-ping |

## 레시피 색인

| 절 | 파일 | 처음 쓰는 단계 |
|---|---|---|
| 1 | `mfa-lab/registry.json` | B1-00 |
| 2 | `mfa-lab/contract/{package.json, src/index.ts, src/probe.ts, src/bus.ts, src/style.ts}` | B1-02 |
| 3.1~3.4 | `mfa-lab/apps/shell/{package.json, vite.config.ts, index.html, tsconfig.json}` (1단계: federation 없음) | B1-02 |
| 3.5 | shell `vite.config.ts` 2단계(federation 추가), `src/mf/fallbackPlugin.ts` | B1-06 |
| 3.6~3.9 | shell `src/instrumentation.ts`, `src/bus.ts`, `src/registry/registry.ts`, `src/workspace/{store.tsx, useLoggedLayoutTree.ts, PanelFrame.tsx}`, `src/local/twins.tsx`(3.8, B1-04부터) | B1-02 |
| 3.10 | shell `src/adapters/RemoteErrorBoundary.tsx` | B1-02 |
| 3.11 | shell `src/local/{Bare.tsx, ControlPanel.tsx}`, `src/topbar/ExtChip.tsx` | B1-02 |
| 3.12 | shell `src/adapters/RemoteMount.tsx`, `src/local/controlMount.tsx` | B1-04 |
| 3.13 | shell `src/adapters/IframeRemote.tsx`, `src/local/controlIframe.ts` | B1-05 |
| 3.14 | shell `src/adapters/SameTreeRemote.tsx`, `src/registry/{loaders.ts, remotes.d.ts}` | B1-06 |
| 4 | `mfa-lab/apps/mfe-orders/*` (mfe-board는 이름만 바꾼 같은 모양) | B1-06 (board: B1-07) |
| 5 | `mfa-lab/apps/mfe-billing/*` | B1-04 |
| 6 | `mfa-lab/apps/mfe-telemetry/*` | B1-05 |
| 7.1~7.3 | `mfa-lab/e2e/{package.json, playwright.config.ts, lane.json}`, `spike/s00-*.spec.ts` | B1-01 |
| 7.4~7.9 | `mfa-lab/e2e/helpers/{settle, geometry, mouseDrag, probe.init, touch, faults}.ts` | B1-03a (touch: B1-03e, faults: B1-06) |
| 8 | `mfa-lab/scripts/ctl.mjs`, `mfa-lab/scripts/lib/*.mjs` | B1-00 (`doctor`), B1-02 (전체) |
| 9 | 브라우저 레인 명령 | B1-01 |
| 10 | 하네스가 의존하는 브라우저·Playwright 동작 | B1-03a 전에 읽는다 |

## 버전 핀 (레지스트리 `pins`와 같다)

`mfa-lab/` 아래 모든 `package.json`은 아래 값을 **캐럿·틸드 없이** 적는다. 존재와 호환 범위는 2026-10-06에 npm 레지스트리에서 확인했다.

| 패키지 | 버전 | 확인한 사실 | 출처 |
|---|---|---|---|
| `react`, `react-dom` | `19.2.4` | 존재. `exports`에 `./jsx-runtime`, `./jsx-dev-runtime` 포함 | https://registry.npmjs.org/react/19.2.4 |
| `vite` | `7.3.6` | engines `^20.19.0 \|\| >=22.12.0`, `bin: { vite: "bin/vite.js" }` | https://registry.npmjs.org/vite/7.3.6 |
| `@vitejs/plugin-react` | `5.1.2` | peer `vite ^4.2.0 \|\| ^5 \|\| ^6 \|\| ^7`, engines 위와 같음. 6.x는 Vite 8 전용이라 쓰지 않는다 | https://registry.npmjs.org/@vitejs/plugin-react/5.1.2 |
| `@module-federation/vite` | `1.23.0` | engines 위와 같음, peer `vite ^5 \|\| ^6 \|\| ^7 \|\| ^8`, deps `@module-federation/{sdk,runtime,dts-plugin}@2.9.1` | https://registry.npmjs.org/@module-federation/vite/1.23.0 |
| `@playwright/test` | 레인 B `1.63.0` / 레인 A·C `1.56.0` | 1.63.0: node `>=20`, deps `playwright 1.63.0`, bin `cli.js`. 1.56.0: node `>=18`, deps `playwright 1.56.0` | https://registry.npmjs.org/@playwright/test/1.63.0 , https://registry.npmjs.org/@playwright/test/1.56.0 |
| `fc-051` (alias) | `npm:@dannysir/floating-components@0.5.1` | 0.5.1 존재, peer `react >=18.0.0`, `exports["."].import = ./dist/index.js` | https://registry.npmjs.org/@dannysir/floating-components/0.5.1 |

`typescript`는 어느 프로젝트에도 넣지 않는다. Vite는 타입을 지우기만 하고, 픽스처 타입 검사는 게이트가 아니다([BRIEF-1-build.md](./BRIEF-1-build.md) 「범위와 금지」).

---

## 1. `mfa-lab/registry.json`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 이름·팀·유형·origin·진입점·디렉터리·핀의 단일 기준. shell `vite.config.ts`, shell 런타임, `ctl.mjs`, telemetry, 하네스가 읽는다 | B1-00 | 실행 확인: 40ac74c | [ARCHITECTURE.md](./ARCHITECTURE.md) 「레지스트리」 |

[ARCHITECTURE.md](./ARCHITECTURE.md) 「레지스트리」의 JSON을 **그대로** 쓴다(아래는 복사본이다. 둘이 다르면 ARCHITECTURE가 맞다).

```json
{
  "contract": 1,
  "pins": {
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "vite": "7.3.6",
    "@vitejs/plugin-react": "5.1.2",
    "@module-federation/vite": "1.23.0"
  },
  "federation": { "shareStrategy": "loaded-first" },
  "shell": {
    "app": "shell", "team": "workspace-platform", "dir": "apps/shell",
    "origin": "http://127.0.0.1:4300", "ready": "/"
  },
  "baseline": {
    "npm051": {
      "app": "shell-051", "dir": "apps/shell", "outDir": "dist-051",
      "origin": "http://127.0.0.1:4390", "ready": "/",
      "alias": "fc-051", "spec": "npm:@dannysir/floating-components@0.5.1"
    }
  },
  "remotes": {
    "orders":      { "app": "mfe-orders",    "team": "order-desk", "kind": "same-tree", "dir": "apps/mfe-orders",    "origin": "http://127.0.0.1:4301", "entry": "/mf-manifest.json", "expose": "./Panel", "twin": "orders-local" },
    "board":       { "app": "mfe-board",     "team": "fulfilment", "kind": "same-tree", "dir": "apps/mfe-board",     "origin": "http://127.0.0.1:4302", "entry": "/mf-manifest.json", "expose": "./Panel", "twin": "board-local" },
    "billing":     { "app": "mfe-billing",   "team": "billing",    "kind": "mount",     "dir": "apps/mfe-billing",   "origin": "http://127.0.0.1:4303", "entry": "/remote-entry.js", "twin": "billing-local" },
    "telemetry":   { "app": "mfe-telemetry", "team": "telemetry",  "kind": "iframe",    "dir": "apps/mfe-telemetry", "origin": "http://127.0.0.1:4304", "entry": "/" },
    "telemetry-x": { "app": "mfe-telemetry", "team": "telemetry",  "kind": "iframe",    "sameServerAs": "telemetry", "origin": "http://localhost:4304", "entry": "/" }
  },
  "reservedPorts": [4305, 4306, 4307, 4308],
  "deadOrigin": "http://127.0.0.1:4399"
}
```

함정

- `vite.config.ts`에서는 `import registry from '../../registry.json'`이 아니라 `readFileSync` + `JSON.parse`로 읽는다. Vite 설정 파일의 JSON import는 Vite가 설정을 번들하는 방식에 따라 동작이 달라질 수 있고, Node 22의 JSON 모듈 import는 `with { type: 'json' }` 구문이 필요하다. 앱 **소스**에서는 Vite가 JSON import를 처리하므로 `import raw from '../../../../registry.json'`을 쓴다(https://vite.dev/guide/features#json).
- `telemetry-x`는 디렉터리가 없다(`sameServerAs`). `ctl.mjs`는 `dir`이 없는 항목을 서버 목록에서 뺀다.

---

## 2. 계약 — `mfa-lab/contract/`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| React를 모르는 통합 계약. 타입 + `createProbe`/`createBus`/`ensureStyle`. 모든 프로젝트가 alias `@harbor/contract`로 소스를 직접 번들한다 | B1-02 | 실행 확인: 40ac74c | [ARCHITECTURE.md](./ARCHITECTURE.md) 「통합 계약」 |

### 2.1 `mfa-lab/contract/package.json`

```json
{
  "name": "@harbor/contract",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "description": "Harbor Workbench integration contract v1 (types, probe, bus, style). No dependencies, no React.",
  "exports": { ".": "./src/index.ts" }
}
```

- `sideEffects`를 적지 않는다. 루트 `package.json`의 `"sideEffects": false`(`package.json:35`)가 이 디렉터리에 적용되지 않게 하려고 둔 파일이다. 실제 import는 alias로 `src/index.ts`를 직접 가리키므로 `exports`는 편집기용이다.
- `CONTRACT.md`는 [ARCHITECTURE.md](./ARCHITECTURE.md) 「통합 계약」의 타입 블록, 「프로브 표면」 표, 「유형별 계약」 표를 옮겨 적은 문서다. 내용의 기준은 ARCHITECTURE다.

### 2.2 `mfa-lab/contract/src/index.ts`

```ts
export interface HarborBus {
  publish: (topic: string, payload: unknown) => void;
  subscribe: (topic: string, fn: (payload: unknown) => void) => () => void;
}
export interface InspectableBus extends HarborBus {
  subscriberCount: (topic: string) => number;
}
export interface PanelProps { slot: string; bus: HarborBus; }                 // kind "same-tree"
export interface MountContext { slot: string; bus: HarborBus; contract: 1; }  // kind "mount"
export type Mount = (el: HTMLElement, ctx: MountContext) => void;
export type Unmount = (el: HTMLElement) => void;
export interface FrameMessage {                                               // kind "iframe"
  harbor: 1;
  slot: string;
  type: 'mfe:loaded';
  payload: { loads: number; docId: string };
}
export type ProbeKind = 'local' | 'same-tree' | 'mount' | 'iframe';
export interface ProbeMeta {
  remote: string;            // 내용 코드를 소유한 쪽: 'shell' | 'orders' | 'board' | 'billing' | 'telemetry'
  kind?: ProbeKind;          // 생략하면 기존 값 유지, 처음이면 'same-tree'
  build: string;             // 이 코드를 번들한 빌드의 스탬프 (define __LAB_BUILD_STAMP__)
  reactVersion?: string;
  reactSame?: boolean | null;
}
export interface Probe {
  readonly state: Record<string, unknown>;        // 현재 window.__mfe[slot]
  mounted: () => number;                          // mounts +1, instanceSeq +1. 새 instanceSeq 반환
  unmounted: () => void;                          // unmounts +1
  bump: (key: string, by?: number) => void;       // 숫자 필드 증감 (mountCalls, unmountCalls, rootsAlive, loads ...)
  set: (patch: Record<string, unknown>) => void;  // 그 밖의 필드 (dnd, seen, docId ...)
}

export { createProbe } from './probe';
export { createBus } from './bus';
export { ensureStyle } from './style';
```

### 2.3 `mfa-lab/contract/src/probe.ts`

```ts
import type { Probe, ProbeMeta } from './index';

type MfeWindow = Window & { __mfe?: Record<string, Record<string, unknown>> };

// 번들(모듈 인스턴스)마다 하나. 같은 번들 안에서 슬롯당 프로브는 하나다.
const probes = new Map<string, Probe>();

const definedOnly = (meta: ProbeMeta): Record<string, unknown> =>
  Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined));

export const createProbe = (slot: string, meta: ProbeMeta): Probe => {
  const existing = probes.get(slot);
  if (existing) {
    existing.set(definedOnly(meta));   // 뒤에 온 meta는 정의된 필드만 덮어쓴다
    return existing;
  }
  const win = window as MfeWindow;
  const read = (): Record<string, unknown> => win.__mfe?.[slot] ?? {};
  const write = (next: Record<string, unknown>) => {
    // 불변 갱신: 객체를 새로 만들어 전역에 다시 대입한다.
    win.__mfe = { ...(win.__mfe ?? {}), [slot]: next };
    win.dispatchEvent(new CustomEvent('harbor:probe', { detail: { slot } }));
  };
  // 다른 번들이 같은 슬롯을 먼저 만들었으면(있을 수 없어야 한다) 카운터를 이어받는다.
  write({
    slot, kind: 'same-tree', mounts: 0, unmounts: 0, instanceSeq: 0, reactVersion: null, reactSame: null,
    ...read(),
    ...definedOnly(meta),
  });
  const probe: Probe = {
    get state() {
      return read();
    },
    mounted: () => {
      const s = read();
      const seq = Number(s.instanceSeq ?? 0) + 1;
      write({ ...s, mounts: Number(s.mounts ?? 0) + 1, instanceSeq: seq });
      return seq;
    },
    unmounted: () => {
      const s = read();
      write({ ...s, unmounts: Number(s.unmounts ?? 0) + 1 });
    },
    bump: (key, by = 1) => {
      const s = read();
      write({ ...s, [key]: Number(s[key] ?? 0) + by });
    },
    set: (patch) => {
      write({ ...read(), ...patch });
    },
  };
  probes.set(slot, probe);
  return probe;
};
```

함정

- 카운터를 올리는 자리는 내용 컴포넌트의 `useLayoutEffect(() => { probe.mounted(); return () => probe.unmounted(); }, [probe])`다. `useEffect`가 아니다. 하네스의 `settle`이 rAF 2회 + 매크로태스크 1회 뒤에 읽기 때문에 layout effect여야 값이 확정돼 있다([HARNESS.md](./HARNESS.md) 「헬퍼」 `settle.ts`).
- `reactVersion`·`reactSame`은 계약이 React를 모르므로 각 remote 코드가 계산해 `meta`로 넘긴다: `reactSame = window.__fc ? window.__fc.reactRef.createElement === React.createElement : null`. 모듈 네임스페이스 객체가 아니라 **함수 참조**를 비교한다(네임스페이스 객체는 번들마다 다르다).
- iframe 문서(`mfe-telemetry`, `control-iframe`)는 이 파일을 쓰지 않고 같은 모양의 객체를 직접 만든다(6절, 3.13절). 문서가 다시 로드되면 모듈 상태도 사라지므로 `loads`는 `sessionStorage`에 둔다.

### 2.4 `mfa-lab/contract/src/bus.ts`

```ts
import type { InspectableBus } from './index';

export const createBus = (): InspectableBus => {
  const topics = new Map<string, Set<(payload: unknown) => void>>();
  return {
    publish: (topic, payload) => {
      topics.get(topic)?.forEach((fn) => fn(payload));
    },
    subscribe: (topic, fn) => {
      const set = topics.get(topic) ?? new Set();
      set.add(fn);
      topics.set(topic, set);
      return () => {
        set.delete(fn);
      };
    },
    subscriberCount: (topic) => topics.get(topic)?.size ?? 0,
  };
};
```

### 2.5 `mfa-lab/contract/src/style.ts`

```ts
export const ensureStyle = (id: string, css: string): void => {
  if (typeof document === 'undefined') return;
  if (document.head.querySelector(`style[data-harbor-style="${id}"]`)) return;
  const el = document.createElement('style');
  el.setAttribute('data-harbor-style', id);
  el.textContent = css;
  document.head.appendChild(el);
};
```

- remote의 모든 선택자는 `[data-mfe="<name>"]` 아래로 한정한다([ARCHITECTURE.md](./ARCHITECTURE.md) 「CSS와 크기」). 라이브러리의 리사이저 스타일은 `[data-ftl-styles]` 태그로 따로 들어온다(`src/components/resizerStyles.ts:25-31`).

---
## 3. shell — `mfa-lab/apps/shell/`

shell은 라이브러리의 유일한 소비자다. B1-02에서는 federation 플러그인 **없이** 대조군 슬롯만 만들고, B1-06에서 플러그인을 넣는다. 그래서 `package.json`과 `vite.config.ts`는 두 단계로 적는다.

### 3.1 `mfa-lab/apps/shell/package.json`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| shell 의존성. 1단계(B1-02) → `fc-051` 추가(B1-03c) → MF 플러그인 추가(B1-06) | B1-02 | 실행 확인: 40ac74c | 핀 표(위), https://docs.npmjs.com/cli/v11/commands/npm-install (alias `npm:` 형식) |

```json
{
  "name": "@harbor/shell",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "vite": "7.3.6",
    "@vitejs/plugin-react": "5.1.2"
  }
}
```

단계별 추가(각각 추가한 뒤 lockfile을 처음부터 다시 만든다: `rm -rf node_modules package-lock.json && npm install`, [BRIEF-1-build.md](./BRIEF-1-build.md) 「커밋 규칙」):

| 단계 | `devDependencies`에 추가 | 메모 |
|---|---|---|
| B1-03c | `"fc-051": "npm:@dannysir/floating-components@0.5.1"` | npm alias. `node_modules/fc-051/`에 0.5.1이 설치된다. `fc-051/dist/index.js`에 루트 `onDragEnd`가 있는지 B1-03c에서 눈으로 확인한다 |
| B1-06 | `"@module-federation/vite": "1.23.0"` | 플러그인 설치 전에는 2단계 설정이 import 오류를 낸다. 1단계 설정을 쓴다 |

`@dannysir/floating-components`는 의존성에 **넣지 않는다**. alias로 저장소 `src/index.ts`(또는 `fc-051`, `dist/index.js`)를 가리킨다.

### 3.2 `mfa-lab/apps/shell/vite.config.ts` — 1단계 (B1-02, federation 없음)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 라이브러리 alias(`LAB_LIB`), React dedupe, 저장소 밖 소스 허용, `harbor-app` 표식, 빌드 상수 | B1-02 | 실행 확인: 40ac74c | https://vite.dev/config/shared-options (`resolve.alias`, `resolve.dedupe`, `define`), https://vite.dev/config/server-options (`server.fs.allow`, `strictPort`), https://vite.dev/config/build-options (`build.target`, `outDir`), https://vite.dev/guide/api-plugin (`transformIndexHtml`) |

```ts
// mfa-lab/apps/shell/vite.config.ts (1단계)
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 경로는 전부 fileURLToPath로 만든다. 사용자 PC의 저장소 경로에 ASCII가 아닌 문자가 있다.
const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const repoRoot = here('../../../');
const labRoot = here('../../');
const registry = JSON.parse(readFileSync(here('../../registry.json'), 'utf8'));

// ctl build가 넘기는 환경 변수 (ARCHITECTURE.md 「빌드 입력」)
const lib = process.env.LAB_LIB ?? 'src';          // 'src' | 'npm051' | 'dist'
const mf = process.env.LAB_MF ?? 'on';             // 'on' | 'off'  (1단계에서는 읽기만 한다)
const stamp = process.env.LAB_BUILD_STAMP ?? 'dev';
const git = (cmd: string) => {
  try { return execSync(cmd, { cwd: repoRoot, encoding: 'utf8' }).trim(); } catch { return ''; }
};
const libTree = process.env.LAB_LIB_TREE ?? git('git rev-parse HEAD:src');
const libCommit = process.env.LAB_LIB_COMMIT ?? git('git rev-list -1 HEAD -- src');

const appName = lib === 'npm051' ? 'shell-051' : 'shell';
const port = lib === 'npm051' ? 4390 : 4300;
const outDir = lib === 'npm051' ? 'dist-051' : 'dist';

const libAlias =
  lib === 'src' ? here('../../../src/index.ts')
  : lib === 'dist' ? here('../../../dist/index.js')   // B1-02 대안 3에서만. 루트 npm ci && npm run build가 필요하다
  : 'fc-051';                                        // npm 0.5.1 (bare specifier로 다시 풀린다)

// twin alias: 파일이 생기는 단계에서 켠다. import되지 않는 alias는 있어도 해가 없다.
const twinDirs = { billing: '../mfe-billing/src/App.tsx', orders: '../mfe-orders/src/Panel.tsx', board: '../mfe-board/src/Panel.tsx' };
const twinAliases = Object.fromEntries(
  Object.entries(twinDirs).filter(([, rel]) => existsSync(here(rel))).map(([name, rel]) => [`@twin/${name}`, here(rel)]),
);

// <meta name="harbor-app" content="<app>@<buildId>"> — ctl.mjs 준비 판정의 본문 검사 (ARCHITECTURE.md 「포트와 origin」)
export const harborMeta = (app: string, buildId: string): Plugin => ({
  name: 'harbor-meta',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { name: 'harbor-app', content: `${app}@${buildId}` }, injectTo: 'head' },
  ],
});

export default defineConfig(({ command }) => ({
  plugins: [react(), harborMeta(appName, stamp)],
  resolve: {
    alias: {
      '@dannysir/floating-components': libAlias,
      '@harbor/contract': here('../../contract/src/index.ts'),
      ...twinAliases,
    },
    // alias된 저장소 src/와 twin 소스의 `react` import를 shell의 사본으로 묶는다.
    dedupe: ['react', 'react-dom'],
  },
  define: {
    __LAB_BUILD_STAMP__: JSON.stringify(stamp),
    __LAB_LIB_SOURCE__: JSON.stringify(lib),
    __LAB_LIB_TREE__: JSON.stringify(libTree),
    __LAB_LIB_COMMIT__: JSON.stringify(libCommit),
    __LAB_MF__: JSON.stringify(mf),
    __LAB_MODE__: JSON.stringify(command === 'build' ? 'prod' : 'dev'),
  },
  server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [repoRoot] } },
  preview: { host: '127.0.0.1', port, strictPort: true },
  build: { target: 'chrome89', outDir, sourcemap: false },
}));
```

소스에서 쓰는 전역 상수 선언(`mfa-lab/apps/shell/src/lab-env.d.ts`):

```ts
declare const __LAB_BUILD_STAMP__: string;
declare const __LAB_LIB_SOURCE__: 'src' | 'npm051' | 'dist';
declare const __LAB_LIB_TREE__: string;
declare const __LAB_LIB_COMMIT__: string;
declare const __LAB_MF__: 'on' | 'off';
declare const __LAB_MODE__: 'prod' | 'dev';
```

함정

- `define`은 **빌드 때 문자열 치환**이다. 값은 `JSON.stringify`로 감싼다(https://vite.dev/config/shared-options 의 define). `import.meta.env.X` 형태 대신 전역 상수 이름(`__X__`)을 쓴 이유는 치환 규칙이 가장 단순해서다.
- `resolve.dedupe`는 "프로젝트 루트 기준으로 같은 사본으로 풀어라"는 뜻이다. 프로젝트 루트는 `apps/shell`이고 거기에 `react`가 있다. 루트 `node_modules`가 없는 클라우드에서는 dedupe가 없으면 alias된 `src/`가 `react`를 못 찾아 **빌드가 실패**한다(조용히 두 벌이 로드되는 것보다 낫다. [ARCHITECTURE.md](./ARCHITECTURE.md) 「루트 node_modules 정책」).
- 루트 `package.json`의 `"sideEffects": false`가 alias된 `src/`에도 적용될 수 있다. `src/components/resizerStyles.ts:25-31`은 모듈 로드 때 `<style data-ftl-styles>`를 넣는 부수 효과 모듈인데 `TreeLayout`이 그 모듈의 export(`RESIZER_CLASS` 등)를 import하므로 보통은 살아남는다. smoke가 `[data-ftl-styles]` 존재를 확인하는 이유다.
- `server.fs.allow`를 명시하면 Vite의 자동 워크스페이스 탐지 대신 그 목록만 허용된다. `repoRoot` 하나면 전부 들어간다. preview(빌드 산출물)에는 영향이 없다.
- `preview.port`는 설정에도 두지만 `ctl serve`가 `--port`·`--outDir`을 CLI로 다시 넘긴다. CLI가 우선이다(https://vite.dev/guide/cli).
- `harborMeta`의 `transformIndexHtml`은 dev와 build 모두에서 실행된다. `attrs`는 `Record<string, string | boolean>`이고 이스케이프는 Vite가 한다(https://vite.dev/guide/api-plugin).

### 3.3 `mfa-lab/apps/shell/index.html`, `tsconfig.json`

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Harbor Workbench</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`harbor-app` meta는 플러그인이 넣는다. 손으로 적지 않는다.

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
    "jsx": "react-jsx", "strict": true, "noEmit": true, "skipLibCheck": true,
    "resolveJsonModule": true, "verbatimModuleSyntax": true,
    "paths": {
      "@dannysir/floating-components": ["../../../src/index.ts"],
      "@harbor/contract": ["../../contract/src/index.ts"],
      "@twin/orders": ["../mfe-orders/src/Panel.tsx"],
      "@twin/board": ["../mfe-board/src/Panel.tsx"],
      "@twin/billing": ["../mfe-billing/src/App.tsx"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

편집기용이다. 게이트가 아니고 `tsc`를 실행하지 않는다(루트 `@types/react`가 클라우드에 없다). `@twin/*`를 와일드카드로 적지 않는 이유: TS의 `paths`는 `*`에 잡힌 문자열을 그대로 치환하므로 `"@twin/*": ["../mfe-*/src/*"]`는 `@twin/orders`를 `../mfe-orders/src/orders`로 풀어 파일을 찾지 못한다(https://www.typescriptlang.org/tsconfig/#paths). 대상 파일 이름이 remote마다 다르므로(`Panel.tsx`, `App.tsx`) 명시 매핑으로 적는다. `vite.config.ts`의 `twinAliases`(3.2절)와 같은 세 대상이다.

### 3.4 `mfa-lab/apps/shell/src/main.tsx`

```tsx
import { createRoot } from 'react-dom/client';
import { installInstrumentation } from './instrumentation';
import { Workspace } from './workspace/Workspace';
import './tokens.css';

installInstrumentation();                        // window.__fc 뼈대를 먼저 만든다
createRoot(document.getElementById('root')!).render(<Workspace />);   // StrictMode 없음 (effect 이중 실행이 카운터를 두 배로 만든다)
```

`Workspace.tsx`는 URL 플래그를 읽어 프리셋을 고르고([ARCHITECTURE.md](./ARCHITECTURE.md) 「레이아웃 프리셋」, 「핸들·잠금·URL 플래그」), `useLoggedLayoutTree('main', initialTree)`로 상태를 만들고, `[data-testid="workspace"] [data-theme]` wrapper 안에 `TreeLayout`을 그린다. 첫 커밋 뒤 `useLayoutEffect`에서 `markReady()`를 부른다. 골격은 [ARCHITECTURE.md](./ARCHITECTURE.md) 「레이아웃 상태」에 있다.

### 3.5 `vite.config.ts` — 2단계 (B1-06, federation 추가)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| `@module-federation/vite` host 역할. `registry.json`에서 remote를 생성, React 네 키 싱글턴 공유, `shareStrategy: 'loaded-first'`, `LAB_MF=off` alias 대체 | B1-06 | 실행 확인: 40ac74c | https://raw.githubusercontent.com/module-federation/vite/main/src/utils/normalizeModuleFederationOptions.ts , https://module-federation.io/configure/shareStrategy.html , https://module-federation.io/integrations/build-tool/vite , 상위 host 예제(위 URL) |

1단계 파일에서 바뀌는 부분만 적는다.

```ts
// 추가 import
import { federation } from '@module-federation/vite';

// same-tree remote 중 디렉터리가 실제로 있는 것만 host remotes로 만든다 (활성 집합과 같은 규칙).
// 형식은 매니페스트 URL 문자열: { orders: 'http://127.0.0.1:4301/mf-manifest.json' }. 상위 host 예제와 같은 형태다.
type RemoteEntry = { kind: string; dir?: string; origin: string; entry: string };
const sameTree = Object.entries(registry.remotes as Record<string, RemoteEntry>)
  .filter(([, r]) => r.kind === 'same-tree' && r.dir && existsSync(`${labRoot}${r.dir}/package.json`));
const remotes = Object.fromEntries(sameTree.map(([name, r]) => [name, `${r.origin}${r.entry}`]));

// LAB_MF=off: remote 지정자를 remote 소스로 alias (빌드 타임 통합, MF: degraded)
const mfOffAliases = mf === 'off'
  ? Object.fromEntries(sameTree.map(([name, r]) => [`${name}/Panel`, `${labRoot}${r.dir}/src/Panel.tsx`]))
  : {};

// 공유 블록. 문서 형태(짧은 키). 상위 예제는 'react/'를 긴 형태로 쓴다 — 사다리 (a)-1 참고.
const reactShared = { singleton: true, requiredVersion: `^${registry.pins.react}` };
const shared = { react: reactShared, 'react/': reactShared, 'react-dom': reactShared, 'react-dom/': reactShared };

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    harborMeta(appName, stamp),
    ...(mf === 'on'
      ? [federation({
          name: 'shell',
          dts: false,
          remotes,
          shared,
          shareStrategy: registry.federation.shareStrategy,   // 'loaded-first'
          // runtimePlugins: ['./src/mf/fallbackPlugin.ts'],   // B1-06 사다리 (b)-2에서만 켠다
        })]
      : []),
  ],
  resolve: {
    alias: { /* 1단계와 같음 */ ...mfOffAliases },
    dedupe: ['react', 'react-dom'],
  },
  // define / server / preview / build 는 1단계와 같다
}));
```

`shareStrategy` 검증 메모 (2026-10-06 확인)

| 확인한 것 | 결과 | 출처 |
|---|---|---|
| `@module-federation/vite`의 옵션인가 | 그렇다. `normalizeModuleFederationOptions.ts`에 `shareStrategy?: ShareStrategy`가 `federation({...})` 최상위 옵션으로 있고 기본값은 `shareStrategy: options.shareStrategy \|\| 'version-first'` | https://raw.githubusercontent.com/module-federation/vite/main/src/utils/normalizeModuleFederationOptions.ts |
| 값의 뜻 | `'version-first'`: 초기화 때 **모든 remote 진입 파일을 자동으로 불러** 공유 의존성을 등록한다. `'loaded-first'`: 이미 로드된 공유 의존성을 우선 재사용하고 remote는 **필요할 때** 부른다 | https://module-federation.io/configure/shareStrategy.html (Type `'version-first' \| 'loaded-first'`, Default `'version-first'`) |
| README의 언급 | `hostProvidesAllShared` 모드에서 무시되는 옵션 목록에 `shareStrategy`가 들어 있다(즉 일반 모드에서는 읽힌다). 값 설명은 없다 | https://raw.githubusercontent.com/module-federation/vite/main/README.md |
| 확인하지 못한 것 | module-federation.io의 설정 개요 페이지(https://module-federation.io/configure/index.html)에는 `shareStrategy`가 나열돼 있지 않다. 상위 `vite-vite` 예제도 이 옵션을 쓰지 않는다. 그래서 "remote 하나가 죽어도 shell이 뜬다"는 효과는 **미실행 예측**이다. B1-06 게이트 (b)가 확인한다 | — |

대체 경로(순서대로. [BRIEF-1-build.md](./BRIEF-1-build.md) B1-06 「실패 시」): (1) 설치된 패키지의 `lib/index.d.ts`에 옵션이 실제로 있는지 확인 → (2) `errorLoadRemote` 런타임 플러그인(아래) → (3) `LAB_MF=off`(`MF: degraded`).

함정

- 플러그인 기본값은 `filename: 'remoteEntry-[hash]'`, `manifest: undefined`다(같은 소스 파일). host 쪽은 `filename`이 필요 없지만 remote 쪽은 반드시 명시한다(4.2절).
- 객체 형식 remote(`{ name, entry }`)에서 `type`을 빼면 레거시 `'var'`로 처리되고 경고가 난다(README). 매니페스트 URL 문자열을 쓰거나 `{ type: 'module', name, entry }`를 준다.
- `requiredVersion`에 `^19.2.4`를 쓴 것은 상위 예제와 맞추기 위해서다. 양쪽이 정확히 19.2.4이므로 `'19.2.4'`로 써도 같은 결과여야 한다(미실행).
- host 소스에 `import('board/Panel')`이 있는데 `remotes`에 `board`가 없으면 빌드가 "unresolved import"로 실패한다. `loaders.ts`의 항목과 `remotes`는 같은 단계에서 함께 늘린다(3.14절).
- 플러그인은 코드 분할을 직접 관리한다. `build.rollupOptions.output.manualChunks`를 객체로 주면 무시되고 경고가 난다(README 「manualChunks」). 주지 않는다.

#### `mfa-lab/apps/shell/src/mf/fallbackPlugin.ts` (사다리 (b)-2 전용)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| remote 로드 실패 시 대체 모듈을 돌려줘 shell이 죽지 않게 하는 MF 런타임 플러그인. `runtimePlugins: ['./src/mf/fallbackPlugin.ts']`로 등록 | B1-06 (b)-2 | 미실행 | https://module-federation.io/blog/error-load-remote.html , 상위 예제 https://raw.githubusercontent.com/module-federation/vite/main/examples/vite-vite/vite-host/src/mfPlugins.js (플러그인 파일은 `export default`로 팩토리 함수를 내보낸다 — 플랫폼 강제 예외) |

```ts
// 런타임 훅 문서의 모양을 따랐다. errorLoadRemote의 args.lifecycle 값은 네 가지다:
//   'beforeRequest'(요청 처리 시작 단계) | 'afterResolve'(mf-manifest.json 로드 실패) | 'onLoad'(노출 모듈 로드·실행 실패) | 'beforeLoadShare'(공유 의존성 초기화 중 remoteEntry 로드 실패)
// 반환값은 lifecycle마다 다르다: 'onLoad'에서만 "모듈을 돌려주는 팩토리 함수"가 유효하고, 'afterResolve'는 매니페스트 객체, 'beforeLoadShare'는 공유 의존성 팩토리를 기대한다.
// 그래서 'onLoad'가 아니면 undefined를 돌려줘(대체 없음) 원래 오류가 그대로 전파되게 둔다. :4301을 막았을 때 실제로 걸리는 단계는 'afterResolve'다.
// 이때 shell 전체가 뜨고 error-orders 카드만 남는지는 (b) 게이트가 본다.
import * as React from 'react';

type ErrorLoadRemoteArgs = { id?: string; error?: unknown; from?: 'build' | 'runtime'; lifecycle?: 'beforeRequest' | 'afterResolve' | 'onLoad' | 'beforeLoadShare' };

const Fallback = ({ slot }: { slot?: string }) =>
  React.createElement('div', { 'data-testid': `mf-fallback${slot ? `-${slot}` : ''}` }, 'remote unavailable');

const fallbackPlugin = () => ({
  name: 'harbor-fallback-plugin',
  errorLoadRemote: (args: ErrorLoadRemoteArgs) => {
    if (args.lifecycle === 'onLoad') return () => ({ __esModule: true, default: Fallback, Panel: Fallback });   // Panel도 넣어야 SameTreeRemote의 m.Panel이 산다
    return undefined;   // 'afterResolve' · 'beforeLoadShare' · 'beforeRequest': 처리하지 않는다 (모듈 팩토리를 돌려주면 런타임이 매니페스트로 해석하려다 예외를 낸다)
  },
});

export default fallbackPlugin;
```

- lifecycle 값은 `beforeRequest | beforeLoadShare | afterResolve | onLoad`이고 모듈 팩토리 반환은 `onLoad`에서만 유효하다(https://module-federation.io/guide/runtime/runtime-hooks 의 `errorLoadRemote`; 예제는 https://module-federation.io/blog/error-load-remote.html). `args`의 나머지 필드는 `id`(remote 식별자), `error`, `from: 'build' | 'runtime'`, `origin`(런타임 인스턴스)이다. 위 `ErrorLoadRemoteArgs`는 그중 쓰는 것만 손으로 적은 최소 타입이다. 정확한 타입과 `runtimePlugins` 경로 해석은 설치된 `@module-federation/runtime`의 `node_modules/@module-federation/runtime/dist/*.d.ts`로 다시 확인한다.
- `afterResolve`에서 매니페스트 객체를 돌려줘 "가짜 remote"를 만드는 길도 문서에 있지만 쓰지 않는다. 게이트 (b)의 목적은 "remote가 죽어도 shell이 뜬다"이지 "remote가 죽어도 orders가 그려진다"가 아니다.

### 3.6 `mfa-lab/apps/shell/src/instrumentation.ts`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| `window.__fc` 구현. 프레임 카운터, 호출 로그, 트리 접근, mirror | B1-02 | 실행 확인: 40ac74c | [ARCHITECTURE.md](./ARCHITECTURE.md) 「계측 계약」 `window.__fc` |

```ts
import * as React from 'react';
import type { LayoutNode } from '@dannysir/floating-components';
import { registry } from './registry/registry';
import { bus } from './bus';

type FrameKind = 'local' | 'same-tree' | 'mount' | 'iframe';
type FrameState = 'loading' | 'ready' | 'error';
export interface FrameEntry {
  kind: FrameKind; frameMounts: number; frameUnmounts: number; state: FrameState;
  lateResolves?: number;
  mirror?: { loads: number; docIds: string[]; lastLoadedAt: number };
}
export interface CallEntry {
  seq: number; t: number; layout: string;
  fn: 'onMovePanel' | 'onResizeBorder' | 'removePanel' | 'insertPanel';
  args: unknown[]; treeVersionBefore: number;
}
interface Fc {
  ready: boolean; error?: string; build: string;
  lib: { source: 'src' | 'npm051' | 'dist'; tree: string; commit: string };
  env: { mode: 'prod' | 'dev'; mf: 'on' | 'off'; layout: string; flags: Record<string, string> };
  reactVersion: string; reactRef: { createElement: typeof React.createElement };
  registry: typeof registry;
  getTree: (layoutId?: string) => LayoutNode | null;
  treeVersion: (layoutId?: string) => number;
  calls: CallEntry[];
  frames: Record<string, FrameEntry>;
  bus: { subscriberCount: (topic: string) => number };
  resetLog: () => void;
}
type FcWindow = Window & { __fc?: Fc };

const layouts = new Map<string, { get: () => LayoutNode; version: () => number }>();
let seq = 0;

const read = (): Fc => (window as FcWindow).__fc!;
// 불변 갱신: 새 객체를 만들어 다시 대입하고, 배지가 다시 그리도록 이벤트를 보낸다.
const write = (patch: Partial<Fc>) => {
  (window as FcWindow).__fc = { ...read(), ...patch };
  window.dispatchEvent(new CustomEvent('harbor:frame'));
};
const patchFrame = (slot: string, fn: (f: FrameEntry) => FrameEntry) => {
  const frames = read().frames;
  const cur = frames[slot] ?? { kind: 'local', frameMounts: 0, frameUnmounts: 0, state: 'loading' };
  write({ frames: { ...frames, [slot]: fn(cur) } });
};

export const installInstrumentation = () => {
  const flags = Object.fromEntries(new URLSearchParams(window.location.search).entries());
  (window as FcWindow).__fc = {
    ready: false,
    build: __LAB_BUILD_STAMP__,
    lib: { source: __LAB_LIB_SOURCE__, tree: __LAB_LIB_TREE__, commit: __LAB_LIB_COMMIT__ },
    env: { mode: __LAB_MODE__, mf: __LAB_MF__, layout: flags.layout ?? 'workbench', flags },
    reactVersion: React.version,
    reactRef: { createElement: React.createElement },
    registry,
    getTree: (layoutId = 'main') => layouts.get(layoutId)?.get() ?? null,
    treeVersion: (layoutId = 'main') => layouts.get(layoutId)?.version() ?? -1,
    calls: [],
    frames: {},
    bus: { subscriberCount: (topic) => bus.subscriberCount(topic) },
    resetLog: () => write({ calls: [] }),
  };
};

export const registerLayout = (layoutId: string, get: () => LayoutNode, version: () => number) => {
  layouts.set(layoutId, { get, version });
  return () => { layouts.delete(layoutId); };
};
export const markReady = () => write({ ready: true });
export const markError = (message: string) => write({ error: message });
export const logCall = (layout: string, fn: CallEntry['fn'], args: unknown[], treeVersionBefore: number) => {
  seq += 1;
  write({ calls: [...read().calls, { seq, t: performance.now(), layout, fn, args, treeVersionBefore }] });
};
export const frameMounted = (slot: string, kind: FrameKind) =>
  patchFrame(slot, (f) => ({ ...f, kind, frameMounts: f.frameMounts + 1, state: kind === 'local' ? 'ready' : f.state }));
export const frameUnmounted = (slot: string) => patchFrame(slot, (f) => ({ ...f, frameUnmounts: f.frameUnmounts + 1 }));
export const setFrameState = (slot: string, state: FrameState) => patchFrame(slot, (f) => ({ ...f, state }));
export const bumpLateResolve = (slot: string) => patchFrame(slot, (f) => ({ ...f, lateResolves: (f.lateResolves ?? 0) + 1 }));
export const mirrorLoaded = (slot: string, docId: string) =>
  patchFrame(slot, (f) => {
    const m = f.mirror ?? { loads: 0, docIds: [], lastLoadedAt: 0 };
    return { ...f, mirror: { loads: m.loads + 1, docIds: [...m.docIds, docId], lastLoadedAt: Date.now() } };
  });
```

- `lib.tree`는 `git rev-parse HEAD:src`(트리 해시, 1차 식별자), `lib.commit`은 `git rev-list -1 HEAD -- src`(2차). 둘 다 빌드 때 define으로 박힌다.
- `bare-*`는 `PanelFrame`이 없으므로 `frames`에 항목이 없고, `nav`는 프로브가 없으므로 `__mfe`에 항목이 없다. 하네스 I7은 이에 맞춰 적용 범위를 나눈다([HARNESS.md](./HARNESS.md) 「불변식」).

### 3.7 `src/bus.ts`, `src/registry/registry.ts`

```ts
// src/bus.ts — shell이 소유한 버스 하나. 어댑터와 twin이 직접 import한다.
import { createBus } from '@harbor/contract';
export const bus = createBus();
```

```ts
// src/registry/registry.ts — Vite가 JSON을 모듈로 준다 (https://vite.dev/guide/features#json)
import raw from '../../../../registry.json';
export interface RemoteInfo { app: string; team: string; kind: 'same-tree' | 'mount' | 'iframe'; dir?: string; sameServerAs?: string; origin: string; entry: string; expose?: string; twin?: string }
export interface Registry {
  contract: number; pins: Record<string, string>; federation: { shareStrategy: string };
  shell: { app: string; team: string; dir: string; origin: string; ready: string };
  baseline: Record<string, { app: string; dir: string; outDir: string; origin: string; ready: string; alias: string; spec: string }>;
  remotes: Record<string, RemoteInfo>; reservedPorts: number[]; deadOrigin: string;
}
export const registry = raw as Registry;
```

### 3.8 `src/workspace/store.tsx`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| `createComponentStore`를 모듈 스코프에서 한 번 만들고 모든 키를 고정 엘리먼트로 등록한다. 늦은 등록은 없다(`register`는 리렌더를 일으키지 않는다: `src/tree/componentStore.ts:13-15`) | B1-02 (키는 단계마다 추가) | 실행 확인: 40ac74c | [ARCHITECTURE.md](./ARCHITECTURE.md) 「store 등록」 |

```tsx
import { createComponentStore } from '@dannysir/floating-components';
import { PanelFrame } from './PanelFrame';
import { Bare } from '../local/Bare';
import { ControlPanel } from '../local/ControlPanel';
import { NavPanel } from '../local/NavPanel';
// B1-04 부터: import { RemoteMount } from '../adapters/RemoteMount'; import { BillingTwin } from '../local/twins';
// B1-05 부터: import { IframeRemote } from '../adapters/IframeRemote';
// B1-06 부터: import { SameTreeRemote } from '../adapters/SameTreeRemote'; import { OrdersTwin } from '../local/twins';
// B1-07 부터: import { BoardTwin } from '../local/twins';
import { bus } from '../bus';

const control = (slot: string) => (
  <PanelFrame slot={slot} kind="local" title={slot} team="workspace-platform"><ControlPanel slot={slot} /></PanelFrame>
);

export const components = createComponentStore({
  nav: <PanelFrame slot="nav" kind="local" title="Nav" team="workspace-platform"><NavPanel /></PanelFrame>,
  'bare-0': <Bare slot="bare-0" />, 'bare-1': <Bare slot="bare-1" />, 'bare-2': <Bare slot="bare-2" />, 'bare-3': <Bare slot="bare-3" />,
  'control-a': control('control-a'), 'control-b': control('control-b'), 'control-c': control('control-c'), 'control-d': control('control-d'),
  // B1-04
  // 'control-mount': <PanelFrame slot="control-mount" kind="mount" title="control-mount" team="workspace-platform"><RemoteMount slot="control-mount" /></PanelFrame>,
  // billing: <PanelFrame slot="billing" kind="mount" title="Billing" team="billing"><RemoteMount slot="billing" /></PanelFrame>,
  // 'billing-local': <PanelFrame slot="billing-local" kind="local" title="billing-local" team="billing"><BillingTwin slot="billing-local" bus={bus} /></PanelFrame>,
  // B1-05
  // 'control-iframe': <PanelFrame slot="control-iframe" kind="iframe" title="control-iframe" team="workspace-platform"><IframeRemote slot="control-iframe" /></PanelFrame>,
  // telemetry: <PanelFrame slot="telemetry" kind="iframe" title="Telemetry" team="telemetry"><IframeRemote slot="telemetry" /></PanelFrame>,
  // 'telemetry-x': <PanelFrame slot="telemetry-x" kind="iframe" title="Telemetry (cross-site)" team="telemetry"><IframeRemote slot="telemetry-x" /></PanelFrame>,
  // B1-06
  // orders: <PanelFrame slot="orders" kind="same-tree" title="Orders" team="order-desk"><SameTreeRemote slot="orders" /></PanelFrame>,
  // 'orders-local': <PanelFrame slot="orders-local" kind="local" title="orders-local" team="order-desk"><OrdersTwin slot="orders-local" bus={bus} /></PanelFrame>,
  // B1-07
  // board: <PanelFrame slot="board" kind="same-tree" title="Board" team="fulfilment"><SameTreeRemote slot="board" /></PanelFrame>,
  // 'board-local': <PanelFrame slot="board-local" kind="local" title="board-local" team="fulfilment"><BoardTwin slot="board-local" bus={bus} /></PanelFrame>,
});
```

- 최종 키는 19개다([ARCHITECTURE.md](./ARCHITECTURE.md) 「store 등록」). 주석 처리된 줄을 그 단계에서 푼다. 그 전에 풀면 alias 대상 파일이 없어 import가 실패한다.
- twin(`src/local/twins.tsx`)의 전문은 아래에 있다. `Panel`·`App` 안의 `createProbe`가 `build`를 shell 스탬프로 적는다(shell이 번들했으므로 define 값이 shell의 것이다).

#### `src/local/twins.tsx` (B1-04: `BillingTwin`, B1-06: `OrdersTwin`, B1-07: `BoardTwin`)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| remote 소스를 `@twin/*` alias로 host 트리 안에서 그리는 얇은 래퍼. 래퍼의 `createProbe`가 자식보다 **먼저** 실행돼 `kind: 'local'`을 쓰고, `billing-local`은 `reactSame: true`·`reactVersion`도 여기서 적는다(`App`은 계산하지 않는다 — 5.4절) | B1-04 | 실행 확인: 40ac74c | [ARCHITECTURE.md](./ARCHITECTURE.md) 「앱 목록」 mfe-billing 「소스 구조」, 「계측 계약」 기대값(twin은 `kind: 'local'`, `reactSame: true`); 2.3절 `createProbe`의 "뒤에 온 meta는 정의된 필드만 덮어쓴다" |

```tsx
// src/local/twins.tsx — import 줄은 그 remote가 생기는 단계에서 푼다 (store.tsx와 같은 규칙. 미리 풀면 alias 대상 파일이 없어 빌드가 실패한다).
import * as React from 'react';
import { useState } from 'react';
import type { PanelProps } from '@harbor/contract';
import { createProbe } from '@harbor/contract';
import { App as BillingApp } from '@twin/billing';          // B1-04
// import { Panel as OrdersPanel } from '@twin/orders';     // B1-06
// import { Panel as BoardPanel } from '@twin/board';       // B1-07

// 부모(래퍼)의 useState 초기화가 자식의 것보다 먼저 실행된다. 같은 번들(shell) 안이므로 contract의 probes Map도 하나다.
// 뒤에 오는 Panel의 createProbe는 kind를 넘기지 않으므로 'local'이 유지되고, reactVersion·reactSame은 Panel이 스스로 계산한 값(twin에서는 true)으로 덮인다.
const localMeta = (remote: string) => ({ remote, kind: 'local' as const, build: __LAB_BUILD_STAMP__ });

export const BillingTwin = (p: PanelProps) => {
  // App은 reactSame·reactVersion을 계산하지 않는다(5.4절). twin은 shell이 번들하므로 host의 React와 같다 → 여기서 true로 적는다 (B1-04 게이트: billing-local reactSame === true).
  useState(() => createProbe(p.slot, { ...localMeta('billing'), reactVersion: React.version, reactSame: true }));
  return <BillingApp {...p} kind="local" />;   // App의 선택 prop kind를 'local'로 넘긴다 (ARCHITECTURE 「앱 목록」 mfe-billing 「소스 구조」)
};

// B1-06
// export const OrdersTwin = (p: PanelProps) => {
//   useState(() => createProbe(p.slot, localMeta('orders')));
//   return <OrdersPanel {...p} />;
// };

// B1-07
// export const BoardTwin = (p: PanelProps) => {
//   useState(() => createProbe(p.slot, localMeta('board')));
//   return <BoardPanel {...p} />;
// };
```

- 래퍼는 `mounted()`/`unmounted()`를 부르지 않는다. 카운터는 안쪽 `Panel`·`App`의 `useLayoutEffect`가 올린다. 래퍼가 리마운트돼도 `createProbe`는 기존 프로브를 돌려주므로(2.3절) 카운터는 슬롯별로 누적된다.
- `kind`를 래퍼가 쓰지 않고 `<Panel {...p} />`만 하면 `orders-local`·`board-local`의 `kind`는 `createProbe` 기본값 `'same-tree'`가 되어 `window.__fc.frames[slot].kind`(`'local'`)와 어긋난다 — [ARCHITECTURE.md](./ARCHITECTURE.md) 「계측 계약」은 이를 픽스처 버그로 본다.

### 3.9 `src/workspace/useLoggedLayoutTree.ts`

```ts
import { useCallback, useLayoutEffect, useRef } from 'react';
import { useLayoutTree } from '@dannysir/floating-components';
import type { LayoutNode, DropPosition, InsertPanelInit, InsertAt } from '@dannysir/floating-components';
import { logCall, registerLayout } from '../instrumentation';

// useLayoutTree(src/hooks/useLayoutTree.ts:41-176)를 얇게 감싼다.
// 호출마다 window.__fc.calls에 한 줄(treeVersionBefore 포함)을 남긴 뒤 원래 함수에 넘긴다.
export const useLoggedLayoutTree = (layoutId: string, initialTree: LayoutNode) => {
  const api = useLayoutTree(initialTree);
  const { tree, movePanel, resizeBorder, removePanel, insertPanel } = api;
  const treeRef = useRef(tree);
  const versionRef = useRef(-1);                 // 첫 커밋 뒤 0

  useLayoutEffect(() => {
    treeRef.current = tree;
    versionRef.current += 1;                     // tree 참조가 바뀐 커밋마다 1
  }, [tree]);
  useLayoutEffect(() => registerLayout(layoutId, () => treeRef.current, () => versionRef.current), [layoutId]);

  const onMovePanel = useCallback((s: string, a: string, p: DropPosition, d: number) => {
    logCall(layoutId, 'onMovePanel', [s, a, p, d], versionRef.current);
    movePanel(s, a, p, d);
  }, [layoutId, movePanel]);
  const onResizeBorder = useCallback((path: number[], i: number, delta: number, total?: number) => {
    logCall(layoutId, 'onResizeBorder', [path, i, delta, total], versionRef.current);
    resizeBorder(path, i, delta, total);
  }, [layoutId, resizeBorder]);
  const loggedRemove = useCallback((id: string) => {
    logCall(layoutId, 'removePanel', [id], versionRef.current);
    removePanel(id);
  }, [layoutId, removePanel]);
  const loggedInsert = useCallback((o: { panel: InsertPanelInit; at?: InsertAt }) => {
    logCall(layoutId, 'insertPanel', [o], versionRef.current);
    return insertPanel(o);
  }, [layoutId, insertPanel]);

  return { ...api, onMovePanel, onResizeBorder, removePanel: loggedRemove, insertPanel: loggedInsert };
};
```

- "호출은 됐지만 무시됨"은 호출 뒤에도 `treeVersion`이 그대로인 것으로 판정한다. 잠금 위반 때 라이브러리는 같은 트리를 돌려주고 `devWarn`만 내는데(`src/hooks/useLayoutTree.ts:123-130`), prod 빌드에서 `devWarn`은 사라진다(`src/utils/devWarn.ts:2`).

### 3.10 `src/workspace/PanelFrame.tsx`, `src/adapters/RemoteErrorBoundary.tsx`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 모든 슬롯(`bare-*` 제외)의 프레임. 헤더 = 드래그 핸들(경계 밖), body 안에 에러 경계 + Suspense. 상태 배지 | B1-02 | 실행 확인: 40ac74c | [ARCHITECTURE.md](./ARCHITECTURE.md) 「패널 프레임과 경계」 |

```tsx
// src/workspace/PanelFrame.tsx
import { Suspense, useEffect, useLayoutEffect, useReducer } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { frameMounted, frameUnmounted, setFrameState } from '../instrumentation';
import { RemoteErrorBoundary } from '../adapters/RemoteErrorBoundary';

type Kind = 'local' | 'same-tree' | 'mount' | 'iframe';
interface PanelFrameProps { slot: string; kind: Kind; title: string; team: string; children: ReactNode }

const FRAME: CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: 'var(--hb-bg, #fff)', color: 'var(--hb-fg, #1f2328)' };
const HEADER: CSSProperties = { flex: '0 0 28px', display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', fontSize: 12, borderBottom: '1px solid var(--hb-border, #d0d7de)', cursor: 'grab', userSelect: 'none' };
const BODY: CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' };

const PanelSkeleton = ({ slot }: { slot: string }) => {
  useLayoutEffect(() => { setFrameState(slot, 'loading'); }, [slot]);
  return <div data-testid={`loading-${slot}`}>loading…</div>;
};

type MfeWindow = Window & { __mfe?: Record<string, Record<string, unknown>>; __fc?: { frames: Record<string, { frameMounts: number; mirror?: { loads: number } }> } };

export const PanelFrame = ({ slot, kind, title, team, children }: PanelFrameProps) => {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useLayoutEffect(() => {
    frameMounted(slot, kind);
    return () => frameUnmounted(slot);
  }, [slot, kind]);
  useEffect(() => {
    const onChange = () => rerender();
    window.addEventListener('harbor:probe', onChange);
    window.addEventListener('harbor:frame', onChange);
    return () => { window.removeEventListener('harbor:probe', onChange); window.removeEventListener('harbor:frame', onChange); };
  }, []);
  const w = window as MfeWindow;
  const f = w.__fc?.frames[slot];
  const status = kind === 'iframe'
    ? `f${f?.frameMounts ?? 0} l${f?.mirror?.loads ?? 0}`
    : `f${f?.frameMounts ?? 0} c${Number(w.__mfe?.[slot]?.mounts ?? 0)}`;
  return (
    <section data-testid={`frame-${slot}`} data-slot={slot} data-kind={kind} style={FRAME}>
      <header data-drag-handle data-testid={`handle-${slot}`} style={HEADER}>
        <strong>{title}</strong> · {team} · {kind} · <output data-testid={`status-${slot}`}>{status}</output>
      </header>
      <div data-testid={`body-${slot}`} style={BODY}>
        <RemoteErrorBoundary slot={slot}>
          <Suspense fallback={<PanelSkeleton slot={slot} />}>{children}</Suspense>
        </RemoteErrorBoundary>
      </div>
    </section>
  );
};
```

```tsx
// src/adapters/RemoteErrorBoundary.tsx — class는 에러 경계에만 허용된 예외다. 메서드는 arrow 프로퍼티로 쓴다.
import { Component } from 'react';
import type { ReactNode } from 'react';
import { setFrameState } from '../instrumentation';
import { resetLoader } from './resetLoader';

interface Props { slot: string; children: ReactNode }
interface State { error: Error | null }

export class RemoteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError = (error: Error): State => ({ error });
  componentDidCatch = () => { setFrameState(this.props.slot, 'error'); };
  retry = () => {
    resetLoader(this.props.slot);          // 실패한 로더 캐시를 버린다 (SameTreeRemote·RemoteMount가 등록)
    setFrameState(this.props.slot, 'loading');
    this.setState({ error: null });
  };
  render = () => {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div data-testid={`error-${this.props.slot}`} role="alert" style={{ padding: 12 }}>
        <p>{error.message}</p>
        <button type="button" data-testid={`retry-${this.props.slot}`} onClick={this.retry}>retry</button>
      </div>
    );
  };
}
```

```ts
// src/adapters/resetLoader.ts — 슬롯별 "캐시 비우기" 콜백 레지스트리. 어댑터가 모듈 스코프에서 등록한다.
const resetters = new Map<string, () => void>();
export const registerResetter = (slot: string, fn: () => void) => { resetters.set(slot, fn); };
export const resetLoader = (slot: string) => { resetters.get(slot)?.(); };
```

함정

- `TreeLayout` 바깥에는 Suspense도 에러 경계도 두지 않는다. 바깥 경계가 있으면 remote 하나의 지연·실패가 레이아웃 전체를 내린다.
- 헤더는 경계 **밖**이다. remote가 죽어도 패널을 끌 수 있어야 한다(R16).
- 핸들에 `touch-action`을 주지 않는다. 라이브러리의 날것 동작을 본다.
- `React.lazy`는 거부된 promise를 기억한다. retry가 동작하려면 `SameTreeRemote`가 슬롯별 lazy 컴포넌트를 **새로 만들어야** 한다(3.14절의 `registerResetter`).

### 3.11 `src/local/Bare.tsx`, `src/local/ControlPanel.tsx`, `src/topbar/ExtChip.tsx`

```tsx
// src/local/Bare.tsx — PanelFrame 없음. 라이브러리만 있는 대조군.
import { useLayoutEffect, useState } from 'react';
import { createProbe } from '@harbor/contract';

export const Bare = ({ slot }: { slot: string }) => {
  const [probe] = useState(() => createProbe(slot, { remote: 'shell', kind: 'local', build: __LAB_BUILD_STAMP__ }));
  const [text, setText] = useState('');
  useLayoutEffect(() => { probe.mounted(); return () => probe.unmounted(); }, [probe]);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div data-drag-handle data-testid={`handle-${slot}`} style={{ flex: '0 0 24px', background: '#eee', fontSize: 12, padding: '0 6px' }}>
        {slot} · <output data-testid={`status-${slot}`}>c{Number(probe.state.mounts ?? 0)}</output>
      </div>
      <input data-testid={`${slot}-input`} value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
};
```

```tsx
// src/local/ControlPanel.tsx — 프로브 표면(input, 100행 스크롤, 카운터 버튼)
import { useLayoutEffect, useState } from 'react';
import { createProbe } from '@harbor/contract';

const ROWS = Array.from({ length: 100 }, (_, i) => i);

export const ControlPanel = ({ slot }: { slot: string }) => {
  const [probe] = useState(() => createProbe(slot, { remote: 'shell', kind: 'local', build: __LAB_BUILD_STAMP__, reactVersion: '19.2.4', reactSame: true }));
  const [text, setText] = useState('');
  const [count, setCount] = useState(0);
  useLayoutEffect(() => { probe.mounted(); return () => probe.unmounted(); }, [probe]);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: 4, boxSizing: 'border-box' }}>
      <input data-testid={`${slot}-input`} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" data-testid={`${slot}-counter`} onClick={() => setCount((c) => c + 1)}>count {count}</button>
      <div data-testid={`${slot}-scroll`} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {ROWS.map((n) => <div key={n} style={{ height: 20 }}>row {n}</div>)}
      </div>
    </div>
  );
};
```

```tsx
// src/topbar/ExtChip.tsx — 트리 밖의 유일한 비패널 드래그 소스 (R08(b)). effectAllowed는 건드리지 않는다(기본 'uninitialized').
export const ExtChip = () => (
  <span
    draggable
    data-testid="ext-chip"
    onDragStart={(e) => { e.dataTransfer.setData('application/x-harbor-chip', '1'); }}   // 값 '1'은 ARCHITECTURE 「앱 목록」 ext-chip 행의 정의
    style={{ padding: '2px 8px', border: '1px solid #999', borderRadius: 10, cursor: 'grab', userSelect: 'none' }}
  >
    chip
  </span>
);
```

- `effectAllowed`를 비워 두는 이유: 패널은 모든 dragover의 `dropEffect`를 `'move'`로 고쳐 쓴다(`src/components/PanelNodeRenderer.tsx:86`). 소스가 `effectAllowed = 'copy'`를 주면 `dropEffect`가 허용 집합 밖이라 drop이 일어나지 않아(https://html.spec.whatwg.org/multipage/dnd.html 의 처리 모델) stale 커밋 검사(R08(b))가 성립하지 않는다.

---
### 3.12 `src/adapters/RemoteMount.tsx`, `src/local/controlMount.tsx` (B1-04)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| mount 계약 어댑터. div를 소유하고 `import(url)`로 받은 모듈의 `mount(el, ctx)`/`unmount(el)`를 부른다. 모듈 promise는 모듈 스코프 캐시, cleanup이 먼저면 `lateResolves`, unmount는 **동기** | B1-04 | 실행 확인: 40ac74c | [ARCHITECTURE.md](./ARCHITECTURE.md) 「host 어댑터」 `RemoteMount` 표, CORS 근거 https://vite.dev/config/preview-options (`preview.cors` 기본값 = `server.cors`), https://vite.dev/config/server-options (`server.cors` 기본 정규식이 `localhost`·`127.0.0.1`·`[::1]`의 모든 포트를 허용) |

```tsx
// src/adapters/RemoteMount.tsx
import { useLayoutEffect, useRef, useState } from 'react';
import type { Mount, Unmount } from '@harbor/contract';
import { bus } from '../bus';
import { registry } from '../registry/registry';
import { bumpLateResolve, setFrameState } from '../instrumentation';
import { registerResetter } from './resetLoader';

type MountModule = { mount: Mount; unmount: Unmount };
const modules = new Map<string, Promise<MountModule>>();     // URL(슬롯)별 모듈 promise 캐시

const loaderFor = (slot: string): (() => Promise<unknown>) => {
  if (slot === 'control-mount') return () => import('../local/controlMount');   // host 로컬 모듈, host의 React
  const r = registry.remotes[slot];
  const url = `${r.origin}${r.entry}`;                                           // http://127.0.0.1:4303/remote-entry.js
  return () => import(/* @vite-ignore */ url);
};

const loadModule = (slot: string): Promise<MountModule> => {
  const hit = modules.get(slot);
  if (hit) return hit;
  const p = loaderFor(slot)().then((m) => {
    const mod = m as Partial<MountModule>;
    if (typeof mod.mount !== 'function' || typeof mod.unmount !== 'function') {
      throw new Error(`RemoteMount(${slot}): module has no mount/unmount export`);
    }
    return mod as MountModule;
  });
  p.catch(() => { modules.delete(slot); });   // 거부된 promise는 캐시에서 지워 retry가 다시 시도하게 한다
  modules.set(slot, p);
  return p;
};

export const RemoteMount = ({ slot }: { slot: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<Error | null>(null);

  useLayoutEffect(() => {
    registerResetter(slot, () => modules.delete(slot));
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let mounted: MountModule | null = null;
    loadModule(slot).then(
      (m) => {
        if (cancelled) { bumpLateResolve(slot); return; }       // cleanup이 먼저 실행됐다: mount하지 않는다
        m.mount(el, { slot, bus, contract: 1 });
        mounted = m;
        setFrameState(slot, 'ready');
      },
      (e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); },
    );
    return () => {
      cancelled = true;
      if (mounted) mounted.unmount(el);                          // 동기. 미루지 않는다 (아래 설명)
    };
  }, [slot]);

  if (error) throw error;                                        // RemoteErrorBoundary가 받아 error-<slot> 카드를 그린다
  return <div ref={ref} data-testid={`mount-${slot}`} style={{ width: '100%', height: '100%' }} />;
};
```

```tsx
// src/local/controlMount.tsx — 대조군. host의 React로 createRoot. unmount는 queueMicrotask로 미루고 재mount 가드를 둔다.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { MountContext } from '@harbor/contract';
import { createProbe } from '@harbor/contract';
import { App } from '@twin/billing';

const roots = new WeakMap<HTMLElement, Root>();
const slotOf = new WeakMap<HTMLElement, string>();
const pendingUnmount = new WeakMap<HTMLElement, boolean>();

const probeFor = (slot: string) =>
  createProbe(slot, { remote: 'billing', kind: 'mount', build: __LAB_BUILD_STAMP__, reactVersion: React.version, reactSame: true });

export const mount = (el: HTMLElement, ctx: MountContext) => {
  if (ctx.contract !== 1) throw new Error(`control-mount: unsupported contract ${String(ctx.contract)}`);
  const probe = probeFor(ctx.slot);
  probe.bump('mountCalls');
  if (pendingUnmount.get(el)) { pendingUnmount.set(el, false); return; }   // 미룬 unmount를 취소하고 기존 루트를 유지 (strict=1 대비)
  if (roots.has(el)) return;                                                // 같은 el에 두 번 mount → 무시
  const root = createRoot(el);
  roots.set(el, root);
  slotOf.set(el, ctx.slot);
  probe.bump('rootsAlive');
  root.render(<App slot={ctx.slot} bus={ctx.bus} />);   // kind는 넘기지 않는다: probeFor가 먼저 적은 'mount'가 유지된다 (ARCHITECTURE 「앱 목록」 mfe-billing 「소스 구조」)
};

export const unmount = (el: HTMLElement) => {
  const slot = slotOf.get(el);
  if (!slot || !roots.has(el)) return;                                      // 모르는 el → 무시
  const probe = probeFor(slot);
  probe.bump('unmountCalls');
  pendingUnmount.set(el, true);
  queueMicrotask(() => {
    if (!pendingUnmount.get(el)) return;                                    // 그 사이 mount가 다시 왔다
    pendingUnmount.set(el, false);
    roots.get(el)?.unmount();
    roots.delete(el);
    slotOf.delete(el);
    probe.bump('rootsAlive', -1);
  });
};
```

`billing`(자기 React)과 `control-mount`(host React)의 unmount가 다른 이유

| | `billing` (`mfe-billing/src/remote-entry.tsx`, 5.3절) | `control-mount` (위) |
|---|---|---|
| `unmount(el)` | 즉시 `root.unmount()` | `queueMicrotask`로 미룬다 |
| 이유 | remote는 자기 React 사본을 번들한다. host React의 commit 단계는 그 사본에게 보이지 않으므로 미룰 필요가 없다 | 어댑터의 cleanup은 host React의 commit 중에 실행된다. **같은 React 사본**으로 그 안에서 다른 루트를 동기 unmount하면 React가 그 시점에 unmount를 끝내지 못한다(개발 빌드에서는 경고). `root.unmount()` 문서: 루트의 컴포넌트를 모두 unmount하고 React를 DOM 노드에서 떼어 낸다 — https://react.dev/reference/react-dom/client/createRoot |
| 결과 | `unmounts`가 cleanup과 같은 틱에 오른다 | 한 마이크로태스크 늦게 오른다. 하네스의 `settle` 뒤에는 차이가 없어야 한다 |

함정

- `import(/* @vite-ignore */ url)`의 주석은 Vite가 동적 URL import를 분석하지 않게 하는 표시다. 없으면 빌드 경고가 난다.
- cross-origin `import()`가 되려면 `:4303`이 CORS 헤더를 줘야 한다. `vite preview`의 기본 CORS가 `127.0.0.1` origin을 허용한다(위 출처). 바뀌면 `preview.cors`를 명시한다.
- `throw error`는 모든 hook 호출 **뒤**에 둔다(hook 순서 규칙).
- `lateResolves`는 "최초 로드가 끝나기 전에 리마운트가 겹쳤다"는 뜻이다. 스모크 기대값은 0이다.

### 3.13 `src/adapters/IframeRemote.tsx`, `src/local/controlIframe.ts` (B1-05)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| iframe 어댑터. `message` 리스너는 **모듈 스코프**에 한 번, `event.origin`을 레지스트리로 검증. `control-iframe`은 `srcdoc`(서버 불필요) | B1-05 | 실행 확인: 40ac74c | [ARCHITECTURE.md](./ARCHITECTURE.md) 「IframeRemote와 mirror」 |

```tsx
// src/adapters/IframeRemote.tsx
import type { FrameMessage } from '@harbor/contract';
import { registry } from '../registry/registry';
import { mirrorLoaded, setFrameState } from '../instrumentation';
import { CONTROL_IFRAME_SRCDOC } from '../local/controlIframe';

const iframeRemotes = Object.entries(registry.remotes).filter(([, r]) => r.kind === 'iframe');
const allowedOrigins = new Set(iframeRemotes.map(([, r]) => r.origin));          // http://127.0.0.1:4304, http://localhost:4304
const knownSlots = new Set([...iframeRemotes.map(([slot]) => slot), 'control-iframe']);

const onMessage = (event: MessageEvent) => {
  // about:srcdoc 문서는 부모 origin을 물려받으므로 location.origin도 허용한다.
  const originOk = allowedOrigins.has(event.origin) || event.origin === window.location.origin;
  const d = event.data as Partial<FrameMessage> | null;
  if (!originOk || !d || d.harbor !== 1 || d.type !== 'mfe:loaded' || typeof d.slot !== 'string' || !knownSlots.has(d.slot)) return;
  if (!d.payload || typeof d.payload.docId !== 'string') return;
  mirrorLoaded(d.slot, d.payload.docId);
  setFrameState(d.slot, 'ready');
};
// wrapper가 리마운트되는 동안 온 메시지를 잃지 않도록 모듈 스코프에서 한 번만 건다.
window.addEventListener('message', onMessage);

const STYLE = { display: 'block', width: '100%', height: '100%', border: 0 } as const;

export const IframeRemote = ({ slot }: { slot: string }) => {
  if (slot === 'control-iframe') {
    return <iframe data-testid="iframe-control-iframe" title={slot} srcDoc={CONTROL_IFRAME_SRCDOC} style={STYLE} />;
  }
  const r = registry.remotes[slot];
  const src = `${r.origin}${r.entry}?slot=${encodeURIComponent(slot)}&parent=${encodeURIComponent(window.location.origin)}`;
  return <iframe data-testid={`iframe-${slot}`} title={slot} src={src} style={STYLE} />;
};
```

```ts
// src/local/controlIframe.ts — telemetry와 같은 프로브를 인라인 스크립트로 가진 srcdoc 문서. targetOrigin은 '*' (about:srcdoc은 이름 붙일 origin이 없다).
export const CONTROL_IFRAME_SRCDOC = `<!doctype html>
<html><head><meta charset="utf-8"><style>body{margin:0;font:12px sans-serif}#scroll{height:60vh;overflow:auto}</style></head>
<body>
  <div>control-iframe · loads <output data-testid="tele-loads">?</output></div>
  <input data-testid="tele-input" />
  <div id="scroll" data-testid="tele-scroll"></div>
  <script>
    (() => {
      const slot = 'control-iframe';
      const key = 'harbor.loads.' + slot;
      const read = () => { try { return Number(sessionStorage.getItem(key) || '0'); } catch (e) { return 0; } };
      const loads = read() + 1;
      try { sessionStorage.setItem(key, String(loads)); } catch (e) {}
      const docId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2, 8));
      window.__mfe = Object.assign({}, window.__mfe || {}, { [slot]: { slot, kind: 'iframe', build: 'srcdoc', loads, docId, loadedAt: Date.now(), seen: { dragenter: 0, dragover: 0, drop: 0, pointermove: 0, touchstart: 0 } } });
      document.querySelector('[data-testid="tele-loads"]').textContent = String(loads);
      const scroll = document.getElementById('scroll');
      for (let i = 0; i < 100; i++) { const d = document.createElement('div'); d.textContent = 'row ' + i; d.style.height = '20px'; scroll.appendChild(d); }
      window.parent.postMessage({ harbor: 1, slot, type: 'mfe:loaded', payload: { loads, docId } }, '*');
    })();
  </script>
</body></html>`;
```

함정

- `sandbox`·`loading` 속성은 주지 않는다. `sandbox`가 있으면 `about:srcdoc`의 origin이 불투명해져 `event.origin`이 `"null"`이 되고 검증을 통과하지 못한다.
- `mirror.loads`는 host가 받은 메시지 수다. 프레임 안의 `loads`(sessionStorage)와 독립된 값이고, 셋째 오라클은 하네스의 문서 요청 로그다([HARNESS.md](./HARNESS.md) 「스냅샷」 `documentRequests`).
- 메인 프레임의 `message` 리스너는 하네스의 프로브 `addInitScript`와 무관하다. 프로브는 모든 프레임에 들어가지만 `message`는 기록하지 않는다.

### 3.14 `src/adapters/SameTreeRemote.tsx`, `src/registry/loaders.ts`, `src/registry/remotes.d.ts` (B1-06)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| same-tree 어댑터. 정적 로더 맵에서 슬롯당 한 번 `React.lazy`를 만들고(모듈 스코프 캐시) host 트리 안에 렌더한다 | B1-06 (`board`: B1-07) | 실행 확인: 40ac74c | https://react.dev/reference/react/lazy , [ARCHITECTURE.md](./ARCHITECTURE.md) 「host 어댑터」 |

```ts
// src/registry/loaders.ts — 항목은 remote가 생기는 단계에서 추가한다. remotes(vite.config.ts 2단계)와 같은 단계에 함께 늘린다.
import type { ComponentType } from 'react';
import type { PanelProps } from '@harbor/contract';
export type PanelModule = { Panel: ComponentType<PanelProps> };
export const loaders: Record<string, () => Promise<PanelModule>> = {
  orders: () => import('orders/Panel'),      // B1-06
  // board: () => import('board/Panel'),     // B1-07
};
```

```ts
// src/registry/remotes.d.ts — dts: false 이므로 타입은 손으로 쓴다
declare module 'orders/Panel' {
  import type { ComponentType } from 'react';
  import type { PanelProps } from '@harbor/contract';
  export const Panel: ComponentType<PanelProps>;
}
declare module 'board/Panel' {
  import type { ComponentType } from 'react';
  import type { PanelProps } from '@harbor/contract';
  export const Panel: ComponentType<PanelProps>;
}
```

```tsx
// src/adapters/SameTreeRemote.tsx
import { lazy, useLayoutEffect } from 'react';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import type { PanelProps } from '@harbor/contract';
import { loaders } from '../registry/loaders';
import { bus } from '../bus';
import { setFrameState } from '../instrumentation';
import { registerResetter } from './resetLoader';

type LazyPanel = LazyExoticComponent<ComponentType<PanelProps>>;
const lazyBySlot = new Map<string, LazyPanel>();   // 슬롯당 한 번. 리마운트 때 다시 받지 않는다 (lazy는 결과를 기억한다)

const lazyFor = (slot: string): LazyPanel => {
  const hit = lazyBySlot.get(slot);
  if (hit) return hit;
  const load = loaders[slot];
  if (!load) throw new Error(`SameTreeRemote: no loader for slot "${slot}"`);
  // React.lazy는 default 키를 요구한다. remote는 named export만 쓰므로 여기서 감싼다 (허용된 예외).
  const Lazy = lazy(() => load().then((m) => ({ default: m.Panel })));
  lazyBySlot.set(slot, Lazy);
  return Lazy;
};

// lazy 자식이 커밋된 뒤 실행되는 layout effect로 ready를 표시한다 (부모의 layout effect는 자식 커밋 뒤에 돈다).
const MarkReady = ({ slot, children }: { slot: string; children: ReactNode }) => {
  useLayoutEffect(() => { setFrameState(slot, 'ready'); }, [slot]);
  return children;
};

export const SameTreeRemote = ({ slot }: { slot: string }) => {
  registerResetter(slot, () => lazyBySlot.delete(slot));   // retry가 새 lazy를 만들게 한다 (거부된 lazy는 영원히 거부 상태)
  const Lazy = lazyFor(slot);
  return (
    <MarkReady slot={slot}>
      <Lazy slot={slot} bus={bus} />
    </MarkReady>
  );
};
```

함정

- 상위 예제는 remote 모듈을 **정적으로** import한다(`import App1 from '@namespace/viteViteRemote/App1'`). `React.lazy` + 동적 import는 문서에 있는 형태지만 상위 e2e가 돌리는 형태는 아니다. 그래서 B1-06 사다리 (a)-2가 "정적 import 청크를 lazy로 감싸기"다.
- `shareStrategy: 'loaded-first'`에서는 `import('orders/Panel')`이 실제로 호출될 때 `:4301/mf-manifest.json`을 받는다. 그 전에는 remote 서버가 없어도 shell이 떠야 한다(미실행 예측, 게이트 (b)).
- `MF: degraded`(`LAB_MF=off`)에서는 `'orders/Panel'`이 alias로 remote 소스가 되어 twin과 **같은 모듈**이 된다. 이때 remote-vs-twin 비교와 R16은 `blocked (MF degraded)`다.

---
## 4. MF remote — `mfa-lab/apps/mfe-orders/` (B1-06), `mfa-lab/apps/mfe-board/` (B1-07)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| Module Federation remote. `./Panel`을 노출하고 `/mf-manifest.json`·`/remoteEntry.js`를 서빙한다. 단독 페이지(`/`)는 같은 Panel을 레이아웃 없이 그린다 | B1-06 | 실행 확인: 40ac74c | https://module-federation.io/integrations/build-tool/vite , 상위 remote 예제 https://raw.githubusercontent.com/module-federation/vite/main/examples/vite-vite/vite-remote/vite.config.js , 기본값 https://raw.githubusercontent.com/module-federation/vite/main/src/utils/normalizeModuleFederationOptions.ts |

`mfe-board`는 `NAME`을 `'board'`로 바꾼 같은 모양이다(내용은 칸반·`<img>`·`<a>`·copy 쌍, [ARCHITECTURE.md](./ARCHITECTURE.md) 「앱 목록」 mfe-board).

### 4.1 `mfa-lab/apps/mfe-orders/package.json`

```json
{
  "name": "@harbor/mfe-orders",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": { "build": "vite build", "preview": "vite preview" },
  "dependencies": { "react": "19.2.4", "react-dom": "19.2.4" },
  "devDependencies": {
    "vite": "7.3.6",
    "@vitejs/plugin-react": "5.1.2",
    "@module-federation/vite": "1.23.0"
  }
}
```

B1-06 순서 1~2(플러그인 없이 빌드, [BRIEF-1-build.md](./BRIEF-1-build.md) B1-06 「만들 것」)에서는 위 `@module-federation/vite` 줄과 4.2의 `import { federation } from '@module-federation/vite'` 줄, `federation({...})` 블록(`...(mf === 'on' ? [...] : [])` 전체)을 **빼고** 쓴다. ESM import는 조건부가 아니라서 패키지가 없으면 `mf` 값과 무관하게 설정 로드가 실패한다. 이 단계의 빌드는 `node mfa-lab/scripts/ctl.mjs build --mf off`로 한다(shell 포함): 그러면 `.run/build.json`에 `mf: off`가 기록돼 `mfe-orders`의 준비 판정이 `/`의 `harbor-app` meta로 바뀌고(8.3절, [ARCHITECTURE.md](./ARCHITECTURE.md) 「포트와 origin」 "MF off면 `/`"), `ctl smoke`의 매니페스트 검사도 건너뛴다. 순서 3까지는 `ctl up`을 부르지 않는다(`up`은 기본값 `--mf on`으로 다시 빌드할 수 있다). 순서 3~4에서 세 조각을 다시 넣고 두 프로젝트의 lockfile을 처음부터 다시 만든 뒤(`rm -rf node_modules package-lock.json && npm install`) `--mf on`(기본)으로 빌드한다. 미실행.

### 4.2 `mfa-lab/apps/mfe-orders/vite.config.ts`

```ts
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const registry = JSON.parse(readFileSync(here('../../registry.json'), 'utf8'));

const NAME = 'orders';                                  // mfe-board: 'board'. registry.remotes의 키이자 MF name
const me = registry.remotes[NAME];
const ORIGIN: string = me.origin;                       // http://127.0.0.1:4301
const PORT = Number(new URL(ORIGIN).port);
const stamp = process.env.LAB_BUILD_STAMP ?? 'dev';
const mf = process.env.LAB_MF ?? 'on';

const reactShared = { singleton: true, requiredVersion: `^${registry.pins.react}` };
const shared = { react: reactShared, 'react/': reactShared, 'react-dom': reactShared, 'react-dom/': reactShared };

const harborMeta = (app: string, buildId: string): Plugin => ({
  name: 'harbor-meta',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'harbor-app', content: `${app}@${buildId}` }, injectTo: 'head' }],
});

export default defineConfig({
  base: `${ORIGIN}/`,                                   // 절대 base: remoteEntry가 가리키는 청크 URL이 host origin에서도 풀리게 한다
  plugins: [
    react(),
    harborMeta(me.app, stamp),                          // 'mfe-orders'
    ...(mf === 'on'
      ? [federation({
          name: NAME,
          filename: 'remoteEntry.js',                   // 기본값은 'remoteEntry-[hash]' — 반드시 명시
          manifest: true,                               // 기본값은 없음 — 반드시 명시. /mf-manifest.json 이 준비 확인 URL이다
          dts: false,
          exposes: { './Panel': './src/Panel.tsx' },
          shared,
          shareStrategy: registry.federation.shareStrategy,   // 'loaded-first' (host와 같게)
        })]
      : []),
  ],
  resolve: { alias: { '@harbor/contract': here('../../contract/src/index.ts') } },
  define: { __LAB_BUILD_STAMP__: JSON.stringify(stamp) },
  server: { host: '127.0.0.1', port: PORT, strictPort: true, origin: ORIGIN },
  preview: { host: '127.0.0.1', port: PORT, strictPort: true },
  build: { target: 'chrome89' },                        // 공유 모듈이 top-level await로 로드된다 (Vite 통합 문서)
});
```

함정

- `build.target`을 지정하지 않으면 Vite 7의 기본값(`'baseline-widely-available'`)이 쓰인다. 문서의 권장값이 `chrome89`이므로 그대로 둔다(https://module-federation.io/integrations/build-tool/vite , https://vite.dev/config/build-options).
- 상위 예제의 `base`에는 경로가 붙어 있다(`http://localhost:5176/testbase`). 우리는 루트(`/`)에 서빙하므로 `${ORIGIN}/`이다.
- 매니페스트 파일의 최상위 필드는 `id`, `name`, `metaData`, `shared`, `remotes`, `exposes`다(https://raw.githubusercontent.com/module-federation/core/main/packages/sdk/src/types/manifest.ts). `ctl smoke`는 `name === 'orders'`와 `exposes`에 `./Panel`이 있는지 본다. 정확한 `exposes` 항목 모양(`id`, `name`, `path`, `assets`)은 B1-06에서 실제 파일로 확정한다.
- `LAB_MF=off`로 빌드하면 플러그인이 없으므로 매니페스트도 없다. 준비 확인은 `/`의 `harbor-app` meta로 바뀐다([ARCHITECTURE.md](./ARCHITECTURE.md) 「포트와 origin」).
- 소스에 `declare const __LAB_BUILD_STAMP__: string;`(`src/lab-env.d.ts`)을 둔다.

### 4.3 `mfa-lab/apps/mfe-orders/src/Panel.tsx`

```tsx
import * as React from 'react';
import { useLayoutEffect, useState } from 'react';
import type { PanelProps } from '@harbor/contract';
import { createProbe, ensureStyle } from '@harbor/contract';

const ROWS = Array.from({ length: 200 }, (_, i) => i);
const CSS = `[data-mfe="orders"] table { min-width: 480px; border-collapse: collapse; } [data-mfe="orders"] td { padding: 2px 6px; }`;

type FcWindow = Window & { __fc?: { reactRef?: { createElement?: unknown } } };
// 함수 참조를 비교한다. 네임스페이스 객체는 번들마다 달라서 비교할 수 없다.
const reactSame = (): boolean | null => {
  const fc = (window as FcWindow).__fc;
  return fc ? fc.reactRef?.createElement === React.createElement : null;   // 단독 페이지에서는 null
};

export const Panel = ({ slot, bus }: PanelProps) => {
  // 슬롯당 한 번. 다시 만들어도 같은 프로브가 돌아온다. kind는 넘기지 않는다: twin 래퍼가 'local'로, 그 밖에는 기본 'same-tree'.
  const [probe] = useState(() =>
    createProbe(slot, { remote: 'orders', build: __LAB_BUILD_STAMP__, reactVersion: React.version, reactSame: reactSame() }),
  );
  const [text, setText] = useState('');
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('all');

  useLayoutEffect(() => {
    probe.mounted();                                   // layout effect: settle 뒤에 읽어도 값이 확정돼 있다
    return () => probe.unmounted();
  }, [probe]);
  useLayoutEffect(() => { ensureStyle('orders', CSS); }, []);

  return (
    <div data-mfe="orders" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: 4, boxSizing: 'border-box', color: 'var(--hb-fg, #1f2328)' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input data-testid={`${slot}-input`} placeholder="search" value={text} onChange={(e) => setText(e.target.value)} />
        <select data-testid={`${slot}-select`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">all</option><option value="open">open</option><option value="paid">paid</option>
        </select>
        <button type="button" data-testid={`${slot}-counter`} onClick={() => setCount((c) => c + 1)}>count {count}</button>
      </div>
      <div data-testid={`${slot}-scroll`} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <table>
          <tbody>
            {ROWS.map((n) => (
              <tr key={n} data-testid={`${slot}-row-${n}`} onClick={() => bus.publish('order:selected', { orderId: `ORD-${n}` })}>
                <td>ORD-{n}</td><td>customer {n % 17}</td><td>{n % 3 === 0 ? 'paid' : 'open'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

- 프로브 표면(`<slot>-input`, `<slot>-scroll`, `<slot>-counter`)은 계약이 요구한다. 나머지 testid는 [ARCHITECTURE.md](./ARCHITECTURE.md) 「앱 목록」을 따른다.
- `.css` 파일을 내지 않는다. 인라인 스타일과 `ensureStyle` 하나만 쓴다(MF·lib 모드·iframe의 CSS 파이프라인을 확인 대상에서 뺀다).
- twin(`orders-local`)에서는 shell이 이 파일을 alias로 번들하므로 `__LAB_BUILD_STAMP__`가 shell 스탬프로 치환된다. remote와 twin을 `build` 값으로 구분할 수 있다.

### 4.4 `index.html`, `src/standalone.tsx` (단독 페이지)

```html
<!doctype html>
<html lang="ko"><head><meta charset="utf-8" /><title>mfe-orders standalone</title></head>
<body><div id="root" style="height:100vh"></div><script type="module" src="/src/standalone.tsx"></script></body></html>
```

```tsx
// src/standalone.tsx — 레이아웃 없이 같은 Panel. 버스는 자기 createBus() 인스턴스(stub). window.__fc가 없으므로 reactSame은 null.
import { createRoot } from 'react-dom/client';
import { createBus } from '@harbor/contract';
import { Panel } from './Panel';

createRoot(document.getElementById('root')!).render(<Panel slot="orders" bus={createBus()} />);
```

- `vite build`는 `index.html`을 진입으로 쓰고, 플러그인이 `remoteEntry.js`·`mf-manifest.json`을 함께 낸다. `vite preview`는 둘 다 서빙한다.

---

## 5. mount remote — `mfa-lab/apps/mfe-billing/` (B1-04)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 플러그인 없는 ES 모듈 remote. Vite lib 모드로 `remote-entry.js` 하나를 내고, `mount(el, ctx)`/`unmount(el)`를 named export한다. 자기 React 19.2.4를 번들한다 | B1-04 | 실행 확인: 40ac74c | https://vite.dev/guide/build (Library Mode: `process.env.NODE_ENV` 미치환, `.js`/`.mjs` 규칙), https://vite.dev/config/build-options (`build.lib.fileName` 함수 형태, `build.copyPublicDir` 기본 `true`), https://vite.dev/config/shared-options (`publicDir`) |

### 5.1 `mfa-lab/apps/mfe-billing/package.json`

```json
{
  "name": "@harbor/mfe-billing",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": { "build": "vite build", "preview": "vite preview" },
  "dependencies": { "react": "19.2.4", "react-dom": "19.2.4" },
  "devDependencies": { "vite": "7.3.6", "@vitejs/plugin-react": "5.1.2" }
}
```

`"type": "module"`이 없으면 lib 모드가 ES 출력의 확장자를 `.mjs`로 바꾼다(https://vite.dev/guide/build : "If the package.json does not contain "type": "module" ... .js will become .mjs"). 준비 확인 URL `/remote-entry.js`가 404가 된다.

### 5.2 `mfa-lab/apps/mfe-billing/vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const registry = JSON.parse(readFileSync(here('../../registry.json'), 'utf8'));
const me = registry.remotes.billing;
const PORT = Number(new URL(me.origin).port);          // 4303
const stamp = process.env.LAB_BUILD_STAMP ?? 'dev';

export default defineConfig({
  plugins: [react()],                                   // harborMeta 없음: lib 모드는 index.html을 변환하지 않는다. public/index.html에 고정값을 적는다
  resolve: { alias: { '@harbor/contract': here('../../contract/src/index.ts') } },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),   // lib 모드는 process.env.*를 치환하지 않는다. 없으면 브라우저에서 "process is not defined"
    __LAB_BUILD_STAMP__: JSON.stringify(stamp),
  },
  build: {
    target: 'chrome89',
    lib: {
      entry: here('src/remote-entry.tsx'),
      formats: ['es'],
      fileName: () => 'remote-entry.js',                // 함수 형태. 문자열 'remote-entry.js'를 주면 'remote-entry.js.js'가 된다
    },
    // publicDir('public')은 copyPublicDir 기본값 true로 outDir 루트에 복사된다 → dist/index.html = 단독 페이지
  },
  preview: { host: '127.0.0.1', port: PORT, strictPort: true },
});
```

함정

- lib 모드는 HTML을 진입으로 쓸 수 없다("the library cannot use HTML as entry", https://vite.dev/config/build-options). 단독 페이지는 `public/index.html`로 **복사**해서 만든다. 그 안의 `harbor-app` meta는 빌드 때 치환되지 않으므로 고정값 `mfe-billing@static`을 적는다([ARCHITECTURE.md](./ARCHITECTURE.md) 「빌드 스탬프」).
- CSS 파일을 import하면 lib 모드가 별도 `.css`로 내고 주입하지 않는다. 이 remote는 `.css`를 쓰지 않는다. 쓰게 되면 `?inline`으로 읽어 `mount` 안에서 `<style>`로 넣는다.
- `rollupOptions.external`을 주지 않는다. React를 **번들에 포함**하는 것이 의도다(`reactSame === false`가 기대값).
- 다른 origin에서 `import()`가 되려면 `:4303`의 CORS가 필요하다. `vite preview` 기본값이 `127.0.0.1`을 허용한다(3.12절).

### 5.3 `mfa-lab/apps/mfe-billing/src/remote-entry.tsx`

```tsx
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { MountContext } from '@harbor/contract';
import { createProbe } from '@harbor/contract';
import { App } from './App';

const roots = new WeakMap<HTMLElement, Root>();
const slotOf = new WeakMap<HTMLElement, string>();

type FcWindow = Window & { __fc?: { reactRef?: { createElement?: unknown } } };
const reactSame = (): boolean | null => {
  const fc = (window as FcWindow).__fc;
  return fc ? fc.reactRef?.createElement === React.createElement : null;   // 기대값 false (자기 React)
};
const probeFor = (slot: string) =>
  createProbe(slot, { remote: 'billing', kind: 'mount', build: __LAB_BUILD_STAMP__, reactVersion: React.version, reactSame: reactSame() });

export const mount = (el: HTMLElement, ctx: MountContext) => {
  if (ctx.contract !== 1) throw new Error(`mfe-billing: unsupported contract ${String(ctx.contract)}`);
  const probe = probeFor(ctx.slot);
  probe.bump('mountCalls');
  if (roots.has(el)) return;                             // 같은 el에 두 번 mount → 두 번째는 무시
  const root = createRoot(el);
  roots.set(el, root);
  slotOf.set(el, ctx.slot);
  probe.bump('rootsAlive');
  root.render(<App slot={ctx.slot} bus={ctx.bus} />);
};

export const unmount = (el: HTMLElement) => {
  const root = roots.get(el);
  const slot = slotOf.get(el);
  if (!root || !slot) return;                            // 모르는 el → 무시
  const probe = probeFor(slot);
  probe.bump('unmountCalls');
  roots.delete(el);
  slotOf.delete(el);
  root.unmount();                                        // 즉시. host React의 commit은 이 사본에 보이지 않는다 (3.12절 표)
  probe.bump('rootsAlive', -1);
};
```

### 5.4 `mfa-lab/apps/mfe-billing/src/App.tsx` (골격)

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { HarborBus, ProbeKind } from '@harbor/contract';
import { createProbe, ensureStyle } from '@harbor/contract';

const ROWS = Array.from({ length: 100 }, (_, i) => i);

// kind: billing(remote 모듈)과 control-mount는 모듈이 먼저 'mount'로 만들어 둔다. billing-local(twin)은 'local'을 넘긴다.
export const App = ({ slot, bus, kind }: { slot: string; bus: HarborBus; kind?: ProbeKind }) => {
  const [probe] = useState(() => createProbe(slot, { remote: 'billing', kind, build: __LAB_BUILD_STAMP__ }));
  const [text, setText] = useState('');
  const [count, setCount] = useState(0);
  const [range, setRange] = useState(40);
  const [lastOrder, setLastOrder] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => { probe.mounted(); return () => probe.unmounted(); }, [probe]);
  useLayoutEffect(() => { ensureStyle('billing', `[data-mfe="billing"] p { user-select: text; }`); }, []);
  useEffect(() => bus.subscribe('order:selected', (p) => setLastOrder(String((p as { orderId?: string })?.orderId ?? ''))), [bus]);
  useEffect(() => {
    const c = canvasRef.current?.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, 160, 40);
    c.fillStyle = '#0078d4';
    ROWS.slice(0, 32).forEach((i) => c.fillRect(i * 5, 40 - ((i * 7 + range) % 40), 4, 40));
  }, [range]);

  return (
    <div data-mfe="billing" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: 4, boxSizing: 'border-box' }}>
      <input data-testid={`${slot}-input`} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" data-testid={`${slot}-counter`} onClick={() => setCount((n) => n + 1)}>count {count}</button>
      <input type="range" data-testid={`${slot}-range`} min={0} max={100} value={range} onChange={(e) => setRange(Number(e.target.value))} />
      <canvas ref={canvasRef} data-testid={`${slot}-canvas`} width={160} height={40} />
      <p data-testid={`${slot}-last-order`}>last order: {lastOrder || '-'}</p>
      <div data-testid={`${slot}-scroll`} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {ROWS.map((n) => <div key={n} style={{ height: 20 }}>invoice {n}</div>)}
      </div>
    </div>
  );
};
```

- `<slot>-stopprop` 체크박스(P1 전용, `mousedown`/`touchstart`에 `stopPropagation`)는 P1 시나리오에 닿을 때 추가한다.

### 5.5 `mfa-lab/apps/mfe-billing/public/index.html`

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="harbor-app" content="mfe-billing@static" />
    <title>mfe-billing standalone</title>
  </head>
  <body>
    <div id="root" style="height:100vh"></div>
    <script type="module">
      import { mount } from './remote-entry.js';
      const stub = { publish: () => {}, subscribe: () => () => {} };
      mount(document.getElementById('root'), { slot: 'billing', bus: stub, contract: 1 });
    </script>
  </body>
</html>
```

- `ctl smoke`는 `:4303/`가 `remote-entry.js`를 참조하는 HTML인지 본다.

---

## 6. iframe remote — `mfa-lab/apps/mfe-telemetry/` (B1-05)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 바닐라 TypeScript 앱. 문서 로드 수를 `sessionStorage`에 세고, 프레임 안에서 본 drag·pointer·touch 이벤트를 **수동적으로** 센다. 부모에게 `mfe:loaded` 한 번 | B1-05 | 실행 확인: 40ac74c | [ARCHITECTURE.md](./ARCHITECTURE.md) 「앱 목록」 mfe-telemetry, 「유형별 계약」 |

### 6.1 `package.json`, `vite.config.ts`

```json
{
  "name": "@harbor/mfe-telemetry",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": { "build": "vite build", "preview": "vite preview" },
  "devDependencies": { "vite": "7.3.6" }
}
```

```ts
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const registry = JSON.parse(readFileSync(here('../../registry.json'), 'utf8'));
const PORT = Number(new URL(registry.remotes.telemetry.origin).port);   // 4304
const stamp = process.env.LAB_BUILD_STAMP ?? 'dev';

const harborMeta = (app: string, buildId: string): Plugin => ({
  name: 'harbor-meta',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'harbor-app', content: `${app}@${buildId}` }, injectTo: 'head' }],
});

export default defineConfig({
  plugins: [harborMeta('mfe-telemetry', stamp)],
  define: { __LAB_BUILD_STAMP__: JSON.stringify(stamp) },
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
  preview: { host: '127.0.0.1', port: PORT, strictPort: true },
  // localhost 대신 crosssite.test를 쓰는 대안(B1-05 사다리)에서만: preview: { ..., allowedHosts: ['crosssite.test'] }
});
```

- 한 프로세스가 `http://127.0.0.1:4304`(same-site)와 `http://localhost:4304`(cross-site) 둘 다 받는다. `localhost`는 Vite의 `allowedHosts` 기본값에 포함된다(https://vite.dev/config/server-options).

### 6.2 `index.html`

```html
<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8" /><title>mfe-telemetry</title>
    <style>body{margin:0;font:12px sans-serif;display:flex;flex-direction:column;height:100vh}#scroll{flex:1;min-height:0;overflow:auto}</style>
  </head>
  <body>
    <div id="head">telemetry · loads <output data-testid="tele-loads">?</output> · doc <output id="doc"></output> · <output id="seen"></output></div>
    <input data-testid="tele-input" />
    <canvas data-testid="tele-canvas" width="160" height="40"></canvas>
    <div id="scroll" data-testid="tele-scroll"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### 6.3 `src/main.ts`

```ts
import registry from '../../../registry.json';

declare const __LAB_BUILD_STAMP__: string;
type Seen = { dragenter: number; dragover: number; drop: number; pointermove: number; touchstart: number };
type MfeWindow = Window & { __mfe?: Record<string, Record<string, unknown>> };

const params = new URLSearchParams(location.search);
const slot = params.get('slot') ?? 'telemetry';
const parent = params.get('parent') ?? '';
// postMessage 허용 목록: shell과 baseline의 origin (registry.json에서 만든다)
const allowedParents = new Set<string>([registry.shell.origin, ...Object.values(registry.baseline).map((b) => b.origin)]);

// 로드 수: 문서가 다시 로드되면 모듈 상태가 사라지므로 sessionStorage에 둔다. cross-site 프레임에서는 막힐 수 있다 → try/catch.
const key = `harbor.loads.${slot}`;
const readLoads = (): number => { try { return Number(sessionStorage.getItem(key) ?? '0'); } catch { return 0; } };
const writeLoads = (n: number) => { try { sessionStorage.setItem(key, String(n)); } catch { /* 저장 불가: mirror와 요청 로그가 대신 센다 */ } };
const loads = readLoads() + 1;
writeLoads(loads);
const docId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let seen: Seen = { dragenter: 0, dragover: 0, drop: 0, pointermove: 0, touchstart: 0 };
const publish = () => {
  const w = window as MfeWindow;
  w.__mfe = { ...(w.__mfe ?? {}), [slot]: { slot, kind: 'iframe', build: __LAB_BUILD_STAMP__, loads, docId, loadedAt: Date.now(), seen: { ...seen } } };
  document.getElementById('seen')!.textContent = `de${seen.dragenter} do${seen.dragover} dr${seen.drop} pm${seen.pointermove} ts${seen.touchstart}`;
};
const bump = (k: keyof Seen) => { seen = { ...seen, [k]: seen[k] + 1 }; publish(); };

// 수동 카운터. preventDefault를 절대 부르지 않는다 (부르면 iframe이 드롭 대상이 되어 R07·R12의 뜻이 바뀐다).
(['dragenter', 'dragover', 'drop'] as const).forEach((t) => window.addEventListener(t, () => bump(t), { capture: true, passive: true }));
window.addEventListener('pointermove', () => bump('pointermove'), { passive: true });
window.addEventListener('touchstart', () => bump('touchstart'), { passive: true });

document.querySelector('[data-testid="tele-loads"]')!.textContent = String(loads);
document.getElementById('doc')!.textContent = docId.slice(0, 8);
const scroll = document.getElementById('scroll')!;
Array.from({ length: 100 }, (_, i) => i).forEach((i) => {
  const row = document.createElement('div'); row.textContent = `metric ${i}`; row.style.height = '20px'; scroll.appendChild(row);
});
const ctx = (document.querySelector('[data-testid="tele-canvas"]') as HTMLCanvasElement).getContext('2d');
let t = 0;
const frame = () => { if (ctx) { ctx.clearRect(0, 0, 160, 40); ctx.fillStyle = '#0078d4'; ctx.fillRect((t * 2) % 160, 10, 8, 20); } t += 1; requestAnimationFrame(frame); };
requestAnimationFrame(frame);
publish();

if (window.parent !== window && allowedParents.has(parent)) {
  window.parent.postMessage({ harbor: 1, slot, type: 'mfe:loaded', payload: { loads, docId } }, parent);
}
```

함정

- `parent` 쿼리가 허용 목록에 없으면 메시지를 보내지 않는다. 그러면 host의 `frames[slot].state`가 `loading`에 머물고 `lab.open`이 시간 초과한다. 쿼리를 만드는 쪽은 `IframeRemote`(3.13절)다.
- `dragover`에 `passive: true`는 뜻이 없지만 해가 없다. 핵심은 `preventDefault`를 부르지 않는 것이다.
- cross-site(`http://localhost:4304`) 프레임의 `sessionStorage` 사용 가능 여부는 미확인이다(S9 기록 항목). 막히면 `loads`는 항상 1이고, 재로드 판정은 `docId`(매 로드마다 새 값), host mirror, 문서 요청 로그로 한다.
- 이 앱은 `@harbor/contract`를 쓰지 않는다. 계약의 `FrameMessage` 모양을 손으로 맞춘다.

---
## 7. 하네스 — `mfa-lab/e2e/`

헬퍼의 **동작 규칙**(무엇을 보장하고 언제 예외를 던지는가)은 [HARNESS.md](./HARNESS.md) 「헬퍼」가 정한다. 여기 골격의 이름·인자가 그 절과 다르면 그 절이 우선이다.

### 7.1 `mfa-lab/e2e/package.json`, `lane.json`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| Playwright 하나만 의존하는 하네스 프로젝트. 레인 핀 | B1-01 | 실행 확인: 40ac74c | [HARNESS.md](./HARNESS.md) 「브라우저 레인」, 「Playwright 설정」 |

```json
{
  "name": "@harbor/e2e",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "devDependencies": { "@playwright/test": "1.63.0" }
}
```

레인 A·C는 `"@playwright/test": "1.56.0"`. 레인을 바꾸면 `node_modules`와 `package-lock.json`을 지우고 `npm install`.

```json
{ "lane": "B", "playwright": "1.63.0", "chromium": "153.0.8010.12" }
```

`mfa-lab/.run/lane.local.json`(무시, `ctl doctor`가 쓴다): `{ "browsersPath": "/abs/mfa-lab/.run/pw-browsers", "executablePath": null, "resolvedAt": "..." }`. 레인 A는 `"browsersPath": "/opt/pw-browsers"`, 레인 C는 `executablePath`에 Chrome for Testing 바이너리 경로.

### 7.2 `mfa-lab/e2e/playwright.config.ts`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 단일 worker, 재시도 없음, 1280x800 / dsf 1, `--no-proxy-server`, 프로젝트 `mouse`·`touch`, **globalSetup·webServer 없음** | B1-01 | 실행 확인: 40ac74c | https://playwright.dev/docs/api/class-testoptions (`hasTouch`, `deviceScaleFactor`, `viewport`, `launchOptions`, `trace`, `channel`), https://playwright.dev/docs/test-reporters (json `outputFile`), https://playwright.dev/docs/api/class-browsertype (`args`, `executablePath`, `chromiumSandbox` 기본 false) |

```ts
import { defineConfig } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const lane = JSON.parse(readFileSync(here('./lane.json'), 'utf8')) as { lane: string; playwright: string; chromium: string };
const localPath = here('../.run/lane.local.json');
const local = existsSync(localPath) ? (JSON.parse(readFileSync(localPath, 'utf8')) as { executablePath?: string | null }) : {};

// 레인 검사 1: 설치된 @playwright/test 버전이 lane.json과 다르면 멈춘다 (버전을 섞지 않는다).
const installed = (JSON.parse(readFileSync(here('./node_modules/@playwright/test/package.json'), 'utf8')) as { version: string }).version;
if (installed !== lane.playwright) throw new Error(`lane.json playwright=${lane.playwright} but installed ${installed}`);

export default defineConfig({
  testDir: here('.'),
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  outputDir: here('./test-results'),
  reporter: [['line'], ['json', { outputFile: here('./.artifacts/results.json') }]],
  use: {
    baseURL: 'http://127.0.0.1:4300',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    headless: true,
    launchOptions: {
      args: ['--no-proxy-server'],                                   // 클라우드 프록시 변수가 127.0.0.1 요청에 끼지 않게
      ...(local.executablePath ? { executablePath: local.executablePath } : {}),   // 레인 C만
    },
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    { name: 'mouse', use: {} },
    { name: 'touch', use: { hasTouch: true } },
    // S10에서만 추가: { name: 'mouse-full', use: { channel: 'chromium' } },
  ],
});
```

함정

- `globalSetup`을 쓰지 않는다. default export가 하나 더 필요하고(https://playwright.dev/docs/test-global-setup-teardown), 서버가 없는 B1-01에서 실패한다. 서버는 `ctl test`가 보장한다.
- `--project`가 없으면 모든 프로젝트가 돈다. `ctl test`가 항상 넘긴다(기본 `mouse`).
- `PLAYWRIGHT_BROWSERS_PATH`는 설정이 아니라 **환경 변수**다. `ctl test`가 `.run/lane.local.json`의 `browsersPath`를 자식 환경에 넣는다.
- `channel: 'chromium'`은 "새 headless(풀 바이너리)"를 뜻한다(TestOptions `channel`). 풀 바이너리가 설치돼 있어야 한다.
- 레인 검사 2(`browser.version()` 메이저 = `lane.chromium` 메이저)는 `lab.open`에서 한다.

### 7.3 `mfa-lab/e2e/spike/s00-browser.spec.ts` (B1-01, 서버 없음)

```ts
import { test, expect } from '@playwright/test';

test('S0 browser gate', async ({ page, browser, browserName }, testInfo) => {
  expect(browserName).toBe('chromium');
  await page.setContent('<main style="font:24px sans-serif;padding:40px"><h1 id="t">Harbor S0</h1><div id="box" style="width:200px;height:200px;background:#0078d4"></div></main>');
  const png = testInfo.outputPath('s00-page.png');
  await page.screenshot({ path: png });                         // Read 도구로 직접 열어 글자가 보이는지 확인한다

  const rafPerSecond = await page.evaluate(() => new Promise<number>((resolve) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n += 1; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else resolve(n); };
    requestAnimationFrame(tick);
  }));
  expect(rafPerSecond).toBeGreaterThan(30);                     // 기대 약 60. 실측값을 SPIKE.md에 적는다

  const cdp = await page.context().newCDPSession(page);
  const version = await cdp.send('Browser.getVersion');
  expect(version.product).toContain('Chrome');                  // 예: "HeadlessChrome/153.0.8010.12"
  console.log(`[S0] ${version.product} raf/s=${rafPerSecond}`);

  // CDP touchStart가 trusted touchstart를 만드는가. touch 프로젝트에서는 단언, mouse 프로젝트에서는 기록만 (BRIEF-1 S0 행).
  // 터치 에뮬레이션이 꺼진 타깃(mouse 프로젝트)에서 Chromium이 Input.dispatchTouchEvent를 거부할 수 있다(미확인, 7.7절 함정).
  // 거부되면 예외가 나므로 try/catch로 감싼다. 감싸지 않으면 B1-01의 `--project mouse` 실행이 먼저 실패해 S0 게이트가 레인마다 헛되이 실패한다.
  await page.evaluate(() => { (window as unknown as { __ts: unknown[] }).__ts = []; window.addEventListener('touchstart', (e) => (window as unknown as { __ts: unknown[] }).__ts.push(e.isTrusted), { passive: true }); });
  let trusted: unknown = null;
  let cdpError: string | null = null;
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 140, y: 200, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    trusted = await page.evaluate(() => (window as unknown as { __ts: boolean[] }).__ts);
  } catch (e) {
    cdpError = String(e);
  }
  console.log(`[S0] touchstart trusted: ${JSON.stringify(trusted)} cdpError: ${cdpError ?? 'none'} (project ${testInfo.project.name}, browser ${browser.version()})`);
  if (testInfo.project.name === 'touch') {
    expect(cdpError).toBeNull();
    expect(trusted).toEqual([true]);
  }
});
```

`env.json`([BRIEF-1-build.md](./BRIEF-1-build.md) 「SPIKE.md 작성 규칙」의 B1-01 필드)에는 두 프로젝트의 `[S0]` 줄에서 값을 옮겨 적는다: `cdp_touch_trusted` = touch 프로젝트에서 `trusted`가 `[true]`인가; `cdp_touch_needs_hasTouch` = mouse 프로젝트에서 `cdpError !== null`이거나 `trusted`가 `[true]`가 아닌가(둘 중 하나면 `true`).

### 7.4 `helpers/settle.ts`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 입력 뒤 화면과 카운터가 멈출 때까지 기다린다: rAF 2회 + 매크로태스크 1회, 그다음 `domTree`·카운터가 두 번 연속 같을 때까지 25ms 간격 폴링(최대 500ms) | B1-03a | 실행 확인: 40ac74c | [HARNESS.md](./HARNESS.md) 「헬퍼」 `settle.ts`; 라이브러리가 미리보기를 rAF 콜백에서 설정: `src/components/PanelNodeRenderer.tsx:103-106` |

```ts
import type { Page } from '@playwright/test';
import { readDomTree } from './geometry';

export interface SettleResult { stable: boolean; reads: number; ms: number }

// 페이지 안에서 실행. 비교용 문자열 하나를 만든다.
const readMainState = () => {
  const w = window as unknown as { __fc?: { frames: unknown }; __mfe?: unknown };
  return JSON.stringify({ frames: w.__fc?.frames ?? null, mfe: w.__mfe ?? null });
};

const readAll = async (page: Page): Promise<string> => {
  const main = await page.evaluate(readMainState);
  const tree = await page.evaluate(readDomTree);
  const frames = await Promise.all(
    page.frames().filter((f) => f !== page.mainFrame()).map((f) =>
      f.evaluate(() => JSON.stringify((window as unknown as { __mfe?: unknown }).__mfe ?? null))
        .catch(() => `LOADING:${Date.now()}:${Math.random()}`),   // 읽을 수 없는 프레임은 "다름"으로 친다 (HARNESS 「헬퍼」 settle). 매번 다른 값이어야 연속 두 번 로딩 중일 때 stable: true로 잘못 끝나지 않는다
    ),
  );
  return `${tree}|${main}|${frames.join('|')}`;
};

export const settle = async (page: Page): Promise<SettleResult> => {
  const t0 = Date.now();
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0)))));
  let prev = await readAll(page);
  let reads = 1;
  while (Date.now() - t0 < 500) {
    await page.waitForTimeout(25);                      // 헬퍼 내부의 폴링 간격. 스펙에서는 waitForTimeout을 쓰지 않는다
    const next = await readAll(page);
    reads += 1;
    if (next === prev) return { stable: true, reads, ms: Date.now() - t0 };
    prev = next;
  }
  return { stable: false, reads, ms: Date.now() - t0 };
};
```

### 7.5 `helpers/geometry.ts` — `dropPoint`, `domTree`, `underCursor`, `handlePoint`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 라이브러리의 드롭 판정을 그대로 다시 계산해, 앵커 패널 위에서 정확히 `(position, depth)`로 해석되는 점을 고른다. 렌더 구조를 중첩 표기로 읽는다 | B1-03a | 실행 확인: 40ac74c | `src/dnd/dropTarget.ts:4-5, 11-15, 17-34, 36-73`; `src/components/LayoutNodeRenderer.tsx:126-129`; `src/components/PanelNodeRenderer.tsx:141-142`; `src/components/TreeLayout.tsx:124` |

라이브러리의 판정(`getDropTarget`, `src/dnd/dropTarget.ts:36-73`)을 옮기면:

1. 앵커 패널 요소에서 부모를 따라 올라가며 `[data-layout-split]`을 안쪽부터 모은다(`splitEls[0]` = 가장 가까운 부모 split). `[data-tree-root]`에서 멈춘다(`:43-55`).
2. 루트 rect 기준, 허용된 네 변(방향 `complex`, `:11-15`) 중 가장 가까운 변까지의 정규화 거리가 `0.05` 미만이면 `{ position: 그 변, depth: splitEls.length + 1 }`(`:4, 57-62`).
3. 아니면 **바깥쪽** split부터 안쪽으로(`i = splitEls.length - 1 … 0`), split rect 기준 거리가 `0.15` 미만이면 `{ position, depth: i + 1 }`(`:5, 64-69`).
4. 아니면 패널 자신의 가장 가까운 변, `depth 0`(`:71-72`).
5. "가장 가까운 변"은 `left, right, top, bottom` 순서로 `<` 비교하므로 같은 거리면 앞의 변이 이긴다(`:30-33`).

```ts
import type { Page } from '@playwright/test';

export interface Point { x: number; y: number }
export type DropPosition = 'left' | 'right' | 'top' | 'bottom';
export const harnessError = (message: string): Error => Object.assign(new Error(message), { name: 'HarnessError' });

// ── 페이지 안에서 실행되는 함수들. 바깥 변수를 참조하지 않는다 (page.evaluate가 직렬화한다). ──

// 렌더 구조를 중첩 표기로: H[...] = flex-direction row, V[...] = column (LayoutNodeRenderer.tsx:126-129), 패널은 id.
export const readDomTree = (): string => {
  const root = document.querySelector('[data-testid="workspace"] [data-tree-root]') ?? document.querySelector('[data-tree-root]');
  if (!root) return '';
  const walk = (el: Element): string => {
    if (el.hasAttribute('data-panel-id')) return el.getAttribute('data-panel-id') ?? '?';
    if (el.hasAttribute('data-layout-split')) {
      const dir = getComputedStyle(el).flexDirection === 'row' ? 'H' : 'V';
      const kids = Array.from(el.children).filter((c) => !c.classList.contains('ftl-resizer')).map(walk);
      return `${dir}[${kids.join(',')}]`;
    }
    return '?';
  };
  const first = Array.from(root.children).find((c) => c.hasAttribute('data-layout-split') || c.hasAttribute('data-panel-id'));
  return first ? walk(first) : '';
};

// dropTarget.ts:36-73 의 재구현 + 앵커 rect 격자 탐색. 한 번의 evaluate로 끝낸다.
const findDropPointInPage = (args: { anchorId: string; position: string; depth: number; step: number }) => {
  const ROOT_EDGE_RATIO = 0.05;   // dropTarget.ts:4
  const SPLIT_EDGE_RATIO = 0.15;  // dropTarget.ts:5
  const EDGES = ['left', 'right', 'top', 'bottom'] as const;   // direction 'complex' → ALL_EDGES (dropTarget.ts:7, 14)
  const nearest = (x: number, y: number, el: Element) => {       // dropTarget.ts:17-34
    const r = el.getBoundingClientRect();
    const d = { left: (x - r.left) / r.width, right: (r.right - x) / r.width, top: (y - r.top) / r.height, bottom: (r.bottom - y) / r.height };
    return EDGES.reduce((acc, p) => (d[p] < acc.dist ? { position: p, dist: d[p] } : acc), { position: EDGES[0], dist: d[EDGES[0]] });
  };
  const panel = document.querySelector(`[data-tree-root] [data-panel-id="${CSS.escape(args.anchorId)}"]`) as HTMLElement | null;
  if (!panel) return { error: `no panel ${args.anchorId}` };
  const splits: Element[] = [];
  let root: Element | null = null;
  let cur = panel.parentElement;
  while (cur) {                                                  // dropTarget.ts:45-55
    if (cur.hasAttribute('data-tree-root')) { root = cur; break; }
    if (cur.hasAttribute('data-layout-split')) splits.push(cur);
    cur = cur.parentElement;
  }
  const classify = (x: number, y: number) => {
    if (root) { const n = nearest(x, y, root); if (n.dist < ROOT_EDGE_RATIO) return { position: n.position, depth: splits.length + 1 }; }   // :57-62
    for (let i = splits.length - 1; i >= 0; i--) { const n = nearest(x, y, splits[i]); if (n.dist < SPLIT_EDGE_RATIO) return { position: n.position, depth: i + 1 }; }   // :64-69
    return { position: nearest(x, y, panel).position, depth: 0 };   // :71-72
  };
  const r = panel.getBoundingClientRect();
  const hits: Array<[number, number]> = [];
  for (let y = r.top + 1; y < r.bottom - 1; y += args.step) {
    for (let x = r.left + 1; x < r.right - 1; x += args.step) {
      const c = classify(x, y);
      if (c.position === args.position && c.depth === args.depth) hits.push([x, y]);
    }
  }
  if (!hits.length) return { error: 'no matching region', rect: r.toJSON() };
  const xs = hits.map((h) => h[0]); const ys = hits.map((h) => h[1]);
  const box = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  // 영역 중심에서 가장 가까운 적중점을 고른다 (중심 자체는 비볼록 영역 밖일 수 있다)
  const cx = (box.left + box.right) / 2; const cy = (box.top + box.bottom) / 2;
  const best = hits.reduce((a, h) => (Math.hypot(h[0] - cx, h[1] - cy) < Math.hypot(a[0] - cx, a[1] - cy) ? h : a), hits[0]);
  const under = document.elementFromPoint(best[0], best[1])?.closest('[data-panel-id]')?.getAttribute('data-panel-id') ?? null;
  return { x: best[0], y: best[1], width: box.right - box.left + args.step, height: box.bottom - box.top + args.step, under };
};

// ── 하네스 쪽 ──

export const domTree = (page: Page): Promise<string> => page.evaluate(readDomTree);

export const dropPoint = async (page: Page, anchorId: string, position: DropPosition, depth: number): Promise<Point> => {
  const res = await page.evaluate(findDropPointInPage, { anchorId, position, depth, step: 2 });
  if ('error' in res) throw harnessError(`dropPoint(${anchorId}, ${position}, ${depth}): ${res.error}`);
  if (res.width < 4 || res.height < 4) throw harnessError(`dropPoint(${anchorId}, ${position}, ${depth}): band ${res.width}x${res.height}px is under 4px`);
  if (res.under !== anchorId) throw harnessError(`dropPoint: elementFromPoint gives ${res.under}, not ${anchorId}`);
  return { x: res.x, y: res.y };
};

export const underCursor = (page: Page, x: number, y: number) =>
  page.evaluate(([px, py]) => {
    const el = document.elementFromPoint(px, py);
    const panel = el?.closest('[data-panel-id]');
    return {
      panelId: panel?.getAttribute('data-panel-id') ?? null,
      droppable: panel ? panel.getAttribute('data-panel-droppable') !== 'false' : false,   // PanelNodeRenderer.tsx:142
      isIframe: el?.tagName === 'IFRAME',
      tag: el?.tagName ?? '',
      testid: el?.closest('[data-testid]')?.getAttribute('data-testid') ?? null,
    };
  }, [x, y] as const);

export const handlePoint = async (page: Page, slot: string): Promise<Point> => {
  const loc = page.locator(`[data-tree-root] [data-testid="handle-${slot}"]`);
  const box = await loc.boundingBox();                                         // ghost(body 바로 아래)는 [data-tree-root] 밖이라 제외된다
  if (!box) throw harnessError(`handlePoint: no handle for slot ${slot}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

export const panelRect = async (page: Page, panelId: string) => {
  const box = await page.locator(`[data-tree-root] [data-panel-id="${panelId}"]`).boundingBox();
  if (!box) throw harnessError(`panelRect: no panel ${panelId}`);
  return box;
};
```

함정

- `dropPoint`는 **항상 현재 DOM의 rect**로 계산한다. 미리보기가 떠 있으면 미리보기 DOM 기준이다(라이브러리도 같은 DOM으로 계산한다). 좌표를 상수로 적지 않는다.
- `census`(1280x800)에서 `(p-a, left, 0)` 띠는 폭이 약 18px이다(계산값, 미실행). step 2px 격자로 잡힌다. 4px 미만일 때만 예외다.
- `treeNotation(LayoutNode)`(I5용)은 `direction: 'horizontal'` → `H`, `'vertical'` → `V`, 패널 → `id`로 같은 문자열을 만든다.

### 7.6 `helpers/mouseDrag.ts`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| `page.mouse`로 실제(trusted) HTML5 드래그를 시작·이동·릴리스·취소한다. 첫 이동 6px(임계값 4px 이상), teleport = 이동 1회 = dragover 1회, 기본 릴리스 `overShadow` | B1-03a | 실행 확인: 40ac74c | https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/crDragDrop.ts , https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/crInput.ts , Blink 임계값 https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/input/mouse_event_manager.cc , 핸들 모드 mousedown `src/components/PanelNodeRenderer.tsx:59-69` |

```ts
import type { Page } from '@playwright/test';
import { settle } from './settle';
import { handlePoint, underCursor, harnessError } from './geometry';
import type { Point } from './geometry';
import { readProbe } from './probe.init';
import { snapshot } from './snapshot';
import type { Snapshot } from './snapshot';

export type ReleaseMode = 'overShadow' | 'settled' | 'immediate';
export type UnderCursorAtDrop = 'source' | 'other-droppable' | 'locked' | 'iframe' | 'outside' | null;
export interface ReleaseResult { mode: ReleaseMode | 'esc'; underCursorAtDrop: UnderCursorAtDrop; dragendDropEffect: string | null; sawDrop: boolean; snapshot: Snapshot }
export interface MouseDrag {
  sourceId: string; slot: string; current: Point;
  teleport: (p: Point) => Promise<Snapshot>;
  glide: (p: Point, steps: number) => Promise<Snapshot>;
  nudge: () => Promise<Snapshot>;
  release: (opts?: { mode?: ReleaseMode }) => Promise<ReleaseResult>;
  cancelEsc: () => Promise<ReleaseResult>;
}

const panelIdOfSlot = (page: Page, slot: string) =>
  page.evaluate((s) => document.querySelector(`[data-tree-root] [data-testid="handle-${s}"]`)?.closest('[data-panel-id]')?.getAttribute('data-panel-id') ?? null, slot);

const classifyUnder = (u: Awaited<ReturnType<typeof underCursor>>, sourceId: string): UnderCursorAtDrop => {
  if (u.isIframe) return 'iframe';
  if (!u.panelId) return 'outside';
  if (u.panelId === sourceId) return 'source';
  return u.droppable ? 'other-droppable' : 'locked';
};

export const begin = async (page: Page, slot: string, opts: { expectStart?: boolean } = {}): Promise<MouseDrag> => {
  const expectStart = opts.expectStart ?? true;
  const sourceId = await panelIdOfSlot(page, slot);
  if (!sourceId) throw harnessError(`begin: slot ${slot} has no handle in the tree`);
  const start = await handlePoint(page, slot);
  const since = Date.now();
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();                                   // 핸들 위의 실제 mousedown이 panel.draggable을 켠다 (PanelNodeRenderer.tsx:59-69)
  await page.mouse.move(start.x + 6, start.y);               // 첫 이동 ≥ 4px → dragstart + dragenter (dragover는 아직 없다)
  await settle(page);
  const started = await page.evaluate((id) => document.querySelector(`[data-tree-root][data-dragging-panel-id="${id}"]`) !== null, sourceId);
  const probe = await readProbe(page, { since });
  const sawTrustedStart = probe.events.some((e) => e.type === 'dragstart' && e.isTrusted && e.target.panelId === sourceId);
  if (expectStart && (!started || !sawTrustedStart)) throw harnessError(`begin: no trusted dragstart for ${sourceId} (started=${started}, probe=${sawTrustedStart})`);
  if (!expectStart && (started || sawTrustedStart)) throw harnessError(`begin: drag started on ${sourceId} but expectStart=false`);
  let current: Point = { x: start.x + 6, y: start.y };

  const finish = async (mode: ReleaseResult['mode'], since2: number): Promise<ReleaseResult> => {
    await settle(page);
    const events = (await readProbe(page, { since: since2 })).events;
    const dragend = [...events].reverse().find((e) => e.type === 'dragend');
    const lastOver = [...events].reverse().find((e) => e.type === 'dragover');
    const under: UnderCursorAtDrop = mode === 'esc' ? null
      : !lastOver ? 'outside'
      : !lastOver.top ? 'iframe'
      : lastOver.target.panelId === sourceId ? 'source'
      : lastOver.target.panelId ? (lastOver.target.droppable === false ? 'locked' : 'other-droppable') : 'outside';
    return { mode, underCursorAtDrop: under, dragendDropEffect: dragend?.dropEffect ?? null, sawDrop: events.some((e) => e.type === 'drop'), snapshot: await snapshot(page, `after-${mode}`) };
  };

  const drag: MouseDrag = {
    sourceId, slot, current,
    teleport: async (p) => { await page.mouse.move(p.x, p.y); current = p; await settle(page); return snapshot(page, 'teleport'); },   // 이동 1회 = dragover 1회
    glide: async (p, steps) => { await page.mouse.move(p.x, p.y, { steps }); current = p; await settle(page); return snapshot(page, 'glide'); },
    nudge: async () => { await page.mouse.move(current.x, current.y); await settle(page); return snapshot(page, 'nudge'); },   // 멈춘 커서는 dragover를 만들지 않는다 → 흉내. 라벨 emulated
    release: async ({ mode = 'overShadow' } = {}) => {
      const t = Date.now();
      if (mode === 'overShadow') {
        const shadowHandle = await handlePoint(page, slot);   // 미리보기 안 shadow 패널의 헤더 (중앙이 아니다: 중앙은 iframe 문서나 드롭 존일 수 있다)
        await page.mouse.move(shadowHandle.x, shadowHandle.y);
        current = shadowHandle;
        await settle(page);
        const u = await underCursor(page, shadowHandle.x, shadowHandle.y);
        if (classifyUnder(u, sourceId) !== 'source') throw harnessError(`release(overShadow): under cursor is ${JSON.stringify(u)}, not source ${sourceId}`);
      } else if (mode === 'settled') {
        await settle(page);
      }
      await page.mouse.up();                                  // 드래그 중이면 CDP 'drop' → dragover + drop + dragend 연속
      return finish(mode, t);
    },
    cancelEsc: async () => { const t = Date.now(); await settle(page); await page.keyboard.press('Escape'); return finish('esc', t); },   // CDP dragCancel → dragend만, dragleave 없음
  };
  return drag;
};
```

함정

- `locator.dragTo`·`page.dragAndDrop`은 쓰지 않는다. 누르기→이동→놓기를 한 번에 보내 라이브 미리보기를 거치지 않고, 놓기 직전 dragover가 예약한 rAF가 드롭 뒤에 실행돼 stale preview를 남긴다([HARNESS.md](./HARNESS.md) 「stale preview 판정 규칙」).
- 드래그 중에는 `mouse.down`이 무시되고(`crInput.ts`: `if (this._dragManager.isDragging()) return;`), `mouse.move`는 `dragOver`만, `mouse.up`은 `drop`만 보낸다. 드래그 구간에 `mousemove`·`mouseup`이 없는 것은 정상이다.
- `immediate` 모드의 결과를 사용자 체감 빈도로 인용하지 않는다.

### 7.7 `helpers/touch.ts` (B1-03e)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| CDP `Input.dispatchTouchEvent`로 누르기·이동·떼기를 보낸다. `touchEnd`·`touchCancel`은 `touchPoints: []`. 핸들 모드는 8px 초과 이동으로 시작(롱프레스 없음), `?drag=panel`은 550ms 유지 | B1-03e | 실행 확인: 40ac74c | https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Input.pdl ("TouchEnd and TouchCancel must not contain any touch points, while TouchStart and TouchMove must contains at least one"), https://playwright.dev/docs/api/class-browsercontext (`newCDPSession`은 Chromium 전용), `src/hooks/useTouchDrag.ts:8-9, 142, 145-149, 234, 246-250` |

```ts
import type { CDPSession, Page } from '@playwright/test';
import { settle } from './settle';
import { handlePoint, harnessError } from './geometry';
import type { Point } from './geometry';
import { snapshot } from './snapshot';
import type { Snapshot } from './snapshot';

export interface Touch {
  touchStart: (p: Point) => Promise<void>;
  hold: (ms: number) => Promise<void>;
  touchMove: (p: Point) => Promise<Snapshot>;
  touchEnd: () => Promise<Snapshot>;
  touchCancel: () => Promise<Snapshot>;
}

export const openTouch = async (page: Page): Promise<Touch> => {
  const cdp: CDPSession = await page.context().newCDPSession(page);           // touch 프로젝트(hasTouch: true)에서만 쓴다
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: Point[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: 1 })) });
  return {
    touchStart: (p) => send('touchStart', [p]),
    hold: (ms) => page.waitForTimeout(ms),                                      // 움직이지 않고 기다린다 (waitForTimeout이 허용되는 유일한 자리)
    touchMove: async (p) => { await send('touchMove', [p]); await settle(page); return snapshot(page, 'touchMove'); },
    touchEnd: async () => { await send('touchEnd', []); await settle(page); return snapshot(page, 'touchEnd'); },        // 빈 touchPoints
    touchCancel: async () => { await send('touchCancel', []); await settle(page); return snapshot(page, 'touchCancel'); },
  };
};

// 핸들 모드 (input: touch-cdp-handle). 롱프레스 없음. 8px를 넘는 첫 이동에서 시작한다 (useTouchDrag.ts:145-149, armed = !!dragHandleSelector :234).
export const handleDrag = async (page: Page, slot: string, waypoints: Point[], end: 'end' | 'cancel') => {
  const t = await openTouch(page);
  const start = await handlePoint(page, slot);
  await t.touchStart(start);
  await t.touchMove({ x: start.x + 12, y: start.y });                             // > MOVE_THRESHOLD(8)
  const ghosts = await page.evaluate(() => document.querySelectorAll('body > [style*="z-index: 9999"]').length);
  if (ghosts !== 1) throw harnessError(`handleDrag: expected 1 ghost after 12px move, got ${ghosts}`);
  for (const p of waypoints) await t.touchMove(p);
  return end === 'end' ? t.touchEnd() : t.touchCancel();
};

// ?drag=panel 전용, 기록만 (S7b, P1). 550ms > LONG_PRESS_MS 450 (useTouchDrag.ts:8, 246-250). 타이머 전에 8px를 넘게 움직이면 세션이 끝난다 (:142).
export const longPressDrag = async (page: Page, panelId: string, waypoints: Point[], end: 'end' | 'cancel') => {
  const t = await openTouch(page);
  const box = await page.locator(`[data-tree-root] [data-panel-id="${panelId}"]`).boundingBox();
  if (!box) throw harnessError(`longPressDrag: no panel ${panelId}`);
  await t.touchStart({ x: box.x + box.width / 2, y: box.y + 14 });
  await t.hold(550);
  for (const p of waypoints) await t.touchMove(p);
  return end === 'end' ? t.touchEnd() : t.touchCancel();
};
```

함정

- 터치 경로는 `data-dragging-panel-id`를 설정하지 않는다(마우스 경로만, `PanelNodeRenderer.tsx:78`). 터치 드래그 중인지는 ghost(`body > [style*="z-index: 9999"]`, `useTouchDrag.ts:72-74`)로 안다.
- 터치 드래그 중에는 ghost가 패널을 통째로 복제해 같은 `data-testid`가 둘이다(`useTouchDrag.ts:60`). 질의는 `[data-tree-root]` 아래로 한정한다.
- 레인 B(Chromium 153)에서 `longPressDrag`는 네이티브 `dragstart`나 `touchcancel`을 낼 수 있다(10절). 그것은 H-TOUCH-NATIVE-RACE의 **관찰**이지 하네스 실패가 아니다.
- `Input.dispatchTouchEvent`가 `hasTouch` 없이도 trusted 이벤트를 만드는지, 아니면 터치 에뮬레이션이 꺼진 타깃에서 거부(예외)되는지는 S0가 두 프로젝트에서 확인해 `env.json`의 `cdp_touch_needs_hasTouch`에 적는다(판정 규칙은 7.3절 끝). 그래서 S0의 `cdp.send`는 try/catch 안에 있다.

### 7.8 `helpers/probe.init.ts`

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 모든 프레임에 `window.__probe`를 넣는다: window capture+bubble 리스너, dragstart/touchstart 때 **대상 노드 자체**에 종료 리스너, 요소 동일성(WeakMap) 기준 DOM 이동 로그. 수동적이다(`preventDefault`·`stopPropagation` 없음) | B1-03a | 실행 확인: 40ac74c | https://playwright.dev/docs/api/class-browsercontext (`addInitScript`: 페이지 생성·내비게이션·자식 프레임 attach마다 실행), [HARNESS.md](./HARNESS.md) 「프로브」; 분리된 노드로 가는 dragend: `src/components/TreeLayout.tsx:144-150`, `doc/TODO.md` "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실" |

```ts
import type { BrowserContext, Page } from '@playwright/test';

export interface ProbeEvent {
  seq: number; eid: number; t: number; wall: number; frame: string; top: boolean; type: string;
  phase: 'capture' | 'bubble' | 'target';
  target: { tag: string; testid: string | null; panelId: string | null; droppable: boolean | null };
  isTrusted: boolean; isConnected: boolean; defaultPrevented: boolean; x: number; y: number;
  pointerType?: string; dropEffect?: string; effectAllowed?: string; types?: string[]; stopped?: boolean;
  count?: number; tLast?: number;
}
export interface ProbeDump { events: ProbeEvent[]; domMoves: Record<string, number>; domLog: Array<{ seq: number; t: number; panelId: string; kind: string; elementSeq: number }> }

// 페이지 안에서 실행된다. 바깥을 참조하지 않는다.
const probeScript = () => {
  const TYPES = ['dragstart', 'dragenter', 'dragover', 'dragleave', 'drop', 'dragend',
    'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture',
    'touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mousemove', 'mouseup', 'contextmenu', 'selectstart'];
  const COALESCE = new Set(['dragover', 'pointermove', 'mousemove', 'touchmove']);
  const events: Record<string, unknown>[] = [];
  const domLog: Record<string, unknown>[] = [];
  const domMoves: Record<string, number> = {};
  let seq = 0; let eid = 0; let elementSeqCounter = 0;
  const eids = new WeakMap<Event, number>();
  const elementSeq = new WeakMap<Element, number>();
  const seenIds = new Set<string>();
  const removedRecently = new Set<Element>();

  const describe = (e: Event) => {
    const path = (e.composedPath?.() ?? []) as Element[];
    const first = (sel: string) => path.find((n) => n instanceof Element && n.matches(sel)) as Element | undefined;
    const panel = first('[data-panel-id]');
    const t = e.target as Element | null;
    return {
      tag: t instanceof Element ? t.tagName : String(t?.constructor?.name ?? ''),
      testid: first('[data-testid]')?.getAttribute('data-testid') ?? null,
      panelId: panel?.getAttribute('data-panel-id') ?? null,
      droppable: panel ? panel.getAttribute('data-panel-droppable') !== 'false' : null,
    };
  };
  const record = (e: Event, phase: string) => {
    if (!eids.has(e)) eids.set(e, ++eid);
    const dt = (e as DragEvent).dataTransfer;
    const touch = (e as TouchEvent).changedTouches?.[0];
    const rec: Record<string, unknown> = {
      seq: ++seq, eid: eids.get(e), t: performance.now(), wall: Date.now(), frame: location.href, top: window === window.top,
      type: e.type, phase, target: describe(e), isTrusted: e.isTrusted,
      isConnected: (e.target as Node | null)?.isConnected ?? false, defaultPrevented: e.defaultPrevented,
      x: (e as MouseEvent).clientX ?? touch?.clientX ?? NaN, y: (e as MouseEvent).clientY ?? touch?.clientY ?? NaN,
      pointerType: (e as PointerEvent).pointerType,
      ...(dt ? { dropEffect: dt.dropEffect, effectAllowed: dt.effectAllowed, types: Array.from(dt.types) } : {}),
    };
    const last = events[events.length - 1];
    if (last && COALESCE.has(e.type) && last.type === e.type && last.phase === phase && last.frame === rec.frame
      && JSON.stringify(last.target) === JSON.stringify(rec.target) && last.defaultPrevented === rec.defaultPrevented && last.dropEffect === rec.dropEffect) {
      last.count = Number(last.count ?? 1) + 1; last.tLast = rec.t; last.xLast = rec.x; last.yLast = rec.y;   // 연속 이동 이벤트는 합친다
      return;
    }
    events.push(rec);
  };
  // 종료 이벤트는 시퀀스를 시작한 원본 요소로 간다. 원본이 분리되면 window까지 오지 않으므로 대상 자체에 건다.
  const attachEnd = (target: EventTarget, types: string[]) => {
    types.forEach((type) => target.addEventListener(type, (e) => record(e, 'target'), { once: true, passive: true }));
  };
  TYPES.forEach((type) => {
    window.addEventListener(type, (e) => {
      record(e, 'capture');
      if (type === 'dragstart' && e.target) attachEnd(e.target, ['dragend']);
      if (type === 'touchstart' && e.target) attachEnd(e.target, ['touchend', 'touchcancel']);
    }, { capture: true, passive: true });
    window.addEventListener(type, (e) => record(e, 'bubble'), { capture: false, passive: true });
  });

  // DOM 이동 로그: 부모가 [data-tree-root] 안인 추가·제거 서브트리의 모든 [data-panel-id] 요소를 요소 동일성으로 추적
  const panelsIn = (node: Node): Element[] => {
    if (!(node instanceof Element)) return [];
    const list = Array.from(node.querySelectorAll('[data-panel-id]'));
    return node.hasAttribute('data-panel-id') ? [node, ...list] : list;
  };
  const idOf = (el: Element) => { if (!elementSeq.has(el)) elementSeq.set(el, ++elementSeqCounter); return elementSeq.get(el)!; };
  const log = (panelId: string, kind: string, el: Element) => domLog.push({ seq: domLog.length + 1, t: performance.now(), panelId, kind, elementSeq: idOf(el) });
  new MutationObserver((muts) => {
    muts.forEach((m) => {
      if (!(m.target instanceof Element) || !m.target.closest('[data-tree-root]')) return;
      m.removedNodes.forEach((n) => panelsIn(n).forEach((el) => { removedRecently.add(el); log(el.getAttribute('data-panel-id')!, 'removed', el); }));
      m.addedNodes.forEach((n) => panelsIn(n).forEach((el) => {
        const id = el.getAttribute('data-panel-id')!;
        if (removedRecently.has(el)) { removedRecently.delete(el); domMoves[id] = (domMoves[id] ?? 0) + 1; log(id, 'reinserted', el); }   // 같은 요소가 돌아왔다
        else if (seenIds.has(id)) log(id, 'remounted', el);                                                                            // 같은 id, 다른 요소
        else { seenIds.add(id); log(id, 'added', el); }
      }));
    });
  }).observe(document, { childList: true, subtree: true });

  const dump = (since = 0) => {
    const out = events.filter((e) => Number(e.wall) >= since).map((e) => ({ ...e }));
    const bubbleEids = new Set(out.filter((e) => e.phase === 'bubble').map((e) => e.eid));
    out.forEach((e) => { if (e.phase === 'capture' && !bubbleEids.has(e.eid)) e.stopped = true; });   // capture에서 봤는데 bubble이 없다 → 누군가 전파를 멈췄다
    return { events: out, domMoves: { ...domMoves }, domLog: domLog.map((l) => ({ ...l })) };
  };
  (window as unknown as { __probe: unknown }).__probe = { events, domMoves, domLog, dump, reset: () => { events.length = 0; domLog.length = 0; Object.keys(domMoves).forEach((k) => delete domMoves[k]); } };
};

export const installProbe = (context: BrowserContext) => context.addInitScript(probeScript);

export const readProbe = async (page: Page, opts: { since?: number } = {}): Promise<ProbeDump> => {
  const parts = await Promise.all(page.frames().map((f) =>
    f.evaluate((since) => (window as unknown as { __probe?: { dump: (s: number) => ProbeDump } }).__probe?.dump(since) ?? null, opts.since ?? 0).catch(() => null)));
  const dumps = parts.filter((p): p is ProbeDump => p !== null);
  return {
    events: dumps.flatMap((d) => d.events).sort((a, b) => a.wall - b.wall || a.seq - b.seq),
    domMoves: Object.assign({}, ...dumps.map((d) => d.domMoves)),
    domLog: dumps.flatMap((d) => d.domLog),
  };
};

export const resetProbe = (page: Page) => Promise.all(page.frames().map((f) => f.evaluate(() => (window as unknown as { __probe?: { reset: () => void } }).__probe?.reset()).catch(() => undefined)));
```

함정

- 프로브는 `reset()`에서 배열을 비운다(`length = 0`). 하네스 내부 상태라 불변 규칙의 대상이 아니지만, 픽스처 코드(`__fc`, `__mfe`)는 다르다.
- `removedRecently`는 같은 MutationObserver 콜백 묶음 안에서 제거→추가가 함께 보고되는 경우를 전제한다. React의 keyed reorder는 한 commit 안에서 끝나므로 보통 한 묶음에 들어온다. 다른 묶음으로 갈라지면 `reinserted`가 `removed` + `remounted`로 보일 수 있다. S1에서 `domLog`를 눈으로 확인한다.
- `addInitScript`는 iframe 문서에도 들어간다. cross-site 프레임(`telemetry-x`)의 기록은 `readProbe`가 프레임별 `evaluate`로 모은다.

### 7.9 `helpers/faults.ts` (B1-06)

```ts
import type { Page } from '@playwright/test';
// lab.open 전에 부른다. 서버를 끄지 않고 네트워크 계층에서만 막는다 (https://playwright.dev/docs/api/class-browsercontext route/abort).
export const blockRemote = async (page: Page, origin: string): Promise<() => Promise<void>> => {
  const pattern = `${origin}/**`;
  await page.route(pattern, (route) => route.abort());
  return () => page.unroute(pattern);
};
```

`snapshot.ts`, `invariants.ts`, `evidence.ts`, `fixtures.ts`의 골격은 [HARNESS.md](./HARNESS.md) 「스냅샷」·「불변식」·「증거와 라벨」·「헬퍼」 `fixtures.ts`의 필드·선택자 표를 그대로 코드로 옮긴다. 선택자와 스타일 값은 그 표가 줄 번호와 함께 정하므로 여기서 반복하지 않는다.

---
## 8. `mfa-lab/scripts/ctl.mjs` 골격

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 의존성 없는 Node CLI: `doctor install build serve status stop smoke up test`. 명령 명세는 [ARCHITECTURE.md](./ARCHITECTURE.md) 「실행 모델」. 여기에는 **틀리기 쉬운 부분**(spawn, 준비 판정, pid, 종료, 탐침, 테스트 래퍼)만 적는다 | B1-00 (`doctor`만), B1-02 (전체) | 실행 확인: 40ac74c | https://nodejs.org/api/child_process.html (`detached`, `shell`, `.cmd` 실행), https://nodejs.org/api/process.html (`process.kill`), https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill (`/pid /t /f`), https://vite.dev/guide/cli (`vite preview --host --port --strictPort --outDir`), https://docs.npmjs.com/cli/v11/commands/npm-ping |

파일 분할([ARCHITECTURE.md](./ARCHITECTURE.md) 「저장소 구조」와 같다): `ctl.mjs`(명령 분기만) + `lib/{apps,spawn,ready,pins,browser,doctor,serve,commands}.mjs`.

| 파일 | 내용 | 이 문서의 절 |
|---|---|---|
| `lib/apps.mjs` | 레지스트리 읽기, 활성 집합, 경로 상수 | 8.1 |
| `lib/spawn.mjs` | `vite preview`·npm spawn, `execText` | 8.2 |
| `lib/ready.mjs` | 준비 판정(200 + 본문) | 8.3 |
| `lib/serve.mjs` | pid 파일, `killTree`, `serve`·`status`·`stop` 명령 | 8.4 |
| `lib/doctor.mjs` | `doctor` 명령, 외부 탐침 | 8.5 |
| `lib/pins.mjs` | 핀 검사(`smoke`가 쓴다) | 없음 — [ARCHITECTURE.md](./ARCHITECTURE.md) 「smoke가 검사하는 것」 「핀」 행대로 |
| `lib/browser.mjs` | 레인 해석(`doctor`·`install`·`test`가 쓴다) | 없음 — [ARCHITECTURE.md](./ARCHITECTURE.md) 「doctor가 기록하는 것」 「lane」 행대로 |
| `lib/commands.mjs` | `install`·`build`·`smoke`·`up`·`test` 명령 | 8.6(`test`) |

전부 arrow function, named export, `import type` 없음(`.mjs`). `lib/` 안의 파일끼리는 같은 디렉터리의 상대 경로(`./serve.mjs`)로 import하고, `ctl.mjs`만 `./lib/...`로 import한다.

### 8.1 `ctl.mjs` 분기와 `lib/apps.mjs`

B1-00에서는 `doctor`만 만든다([BRIEF-1-build.md](./BRIEF-1-build.md) B1-00 「만들 것」). 그 단계의 `ctl.mjs`는 아래에서 `./lib/doctor.mjs` import와 `commands` 객체의 `doctor` 항목만 두고, 나머지 두 import 줄과 항목은 B1-02에서 추가한다(없는 모듈을 정적으로 import하면 스크립트가 시작조차 못 한다).

```js
#!/usr/bin/env node
// mfa-lab/scripts/ctl.mjs
import { doctor } from './lib/doctor.mjs';
import { serve, status, stop } from './lib/serve.mjs';                 // B1-02 부터
import { install, build, smoke, up, test } from './lib/commands.mjs';   // B1-02 부터

// 값을 갖는 플래그만 여기 적는다. 나머지(--baseline, --foreground, --json, --fresh, --force)는 boolean이다.
const VALUE_FLAGS = new Set(['only', 'lib', 'mf', 'stamp', 'project', 'write']);
const parseArgs = (argv) => argv.reduce((acc, arg) => {
  if (acc.pendingKey) return { ...acc, flags: { ...acc.flags, [acc.pendingKey]: arg }, pendingKey: null };
  if (!arg.startsWith('--')) return { ...acc, positional: [...acc.positional, arg] };
  const key = arg.slice(2);
  return VALUE_FLAGS.has(key) ? { ...acc, pendingKey: key } : { ...acc, flags: { ...acc.flags, [key]: true } };
}, { flags: {}, positional: [], pendingKey: null });

const [cmd, ...rest] = process.argv.slice(2);
const { flags, positional } = parseArgs(rest);

const commands = { doctor, install, build, serve, status, stop, smoke, up, test };   // B1-00: { doctor } 만
const run = commands[cmd];
if (!run) {
  console.error('usage: node mfa-lab/scripts/ctl.mjs <doctor|install|build|serve|status|stop|smoke|up|test> [...]');
  process.exit(2);
}
run({ flags, positional }).then((code) => process.exit(code ?? 0), (err) => { console.error(err?.stack ?? err); process.exit(1); });
```

```js
// mfa-lab/scripts/lib/apps.mjs — 경로는 fileURLToPath로. 활성 집합 = 디렉터리와 package.json이 있는 앱.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const labRoot = fileURLToPath(new URL('../../', import.meta.url));           // <repo>/mfa-lab/
export const repoRoot = path.resolve(labRoot, '..');
export const runDir = path.join(labRoot, '.run');
export const registry = JSON.parse(readFileSync(path.join(labRoot, 'registry.json'), 'utf8'));

const portOf = (origin) => Number(new URL(origin).port);

// 서버로 띄우는 단위. telemetry-x는 dir이 없어 빠진다 (같은 서버).
const candidates = () => [
  { app: 'shell', dir: path.join(labRoot, registry.shell.dir), port: portOf(registry.shell.origin), origin: registry.shell.origin,
    ready: { url: `${registry.shell.origin}/`, kind: 'html', expect: 'shell' }, outDir: 'dist' },
  { app: 'shell-051', dir: path.join(labRoot, registry.baseline.npm051.dir), port: portOf(registry.baseline.npm051.origin), origin: registry.baseline.npm051.origin,
    ready: { url: `${registry.baseline.npm051.origin}/`, kind: 'html', expect: 'shell-051' }, outDir: registry.baseline.npm051.outDir, baseline: true },
  ...Object.entries(registry.remotes).filter(([, r]) => r.dir).map(([name, r]) => ({
    app: r.app, dir: path.join(labRoot, r.dir), port: portOf(r.origin), origin: r.origin, outDir: 'dist',
    ready: r.kind === 'same-tree' ? { url: `${r.origin}/mf-manifest.json`, kind: 'manifest', expect: name, fallback: { url: `${r.origin}/`, kind: 'html', expect: r.app } }
      : r.kind === 'mount' ? { url: `${r.origin}${r.entry}`, kind: 'module' }
      : { url: `${r.origin}/`, kind: 'html', expect: r.app },
  })),
];

export const activeApps = ({ baseline = false } = {}) => candidates().filter((a) =>
  existsSync(path.join(a.dir, 'package.json')) && (!a.baseline || (baseline && existsSync(path.join(a.dir, a.outDir, 'index.html')))));

export const projects = () => [...new Set([...activeApps().map((a) => a.dir), path.join(labRoot, 'e2e')].filter((d) => existsSync(path.join(d, 'package.json'))))];
```

### 8.2 `lib/spawn.mjs` — 서버와 npm

```js
import { spawn, execFile } from 'node:child_process';
import { mkdirSync, openSync } from 'node:fs';
import path from 'node:path';
import { runDir } from './apps.mjs';

export const isWin = process.platform === 'win32';

// vite preview를 node로 직접 띄운다. npx도 셸도 쓰지 않는다. 분리(detached) + 로그 파일 + unref.
export const spawnVitePreview = ({ app, dir, port, outDir }) => {
  mkdirSync(path.join(runDir, 'logs'), { recursive: true });
  const viteBin = path.join(dir, 'node_modules', 'vite', 'bin', 'vite.js');          // vite 7.3.6의 bin: "bin/vite.js"
  const args = [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', outDir];
  const fd = openSync(path.join(runDir, 'logs', `${app}.log`), 'a');
  const child = spawn(process.execPath, args, {
    cwd: dir,
    detached: true,                 // Linux: 새 프로세스 그룹의 리더. Windows: 부모가 끝나도 계속 실행
    stdio: ['ignore', fd, fd],      // 부모의 stdio와 연결되지 않아야 백그라운드에 남는다 (child_process 문서 detached 절)
    windowsHide: true,
    env: { ...process.env },
  });
  child.unref();
  return child.pid;
};

// npm: win32에서는 npm.cmd라서 shell이 필요하다. 인자는 고정 목록만 넘긴다 (DEP0190: shell:true + 가변 인자는 비권장).
export const runNpm = (args, { cwd, env = {} }) => new Promise((resolve, reject) => {
  const child = spawn(isWin ? 'npm.cmd' : 'npm', args, { cwd, stdio: 'inherit', shell: isWin, env: { ...process.env, ...env } });
  child.on('error', reject);
  child.on('exit', (code) => (code === 0 ? resolve(0) : reject(new Error(`npm ${args.join(' ')} exited ${code} in ${cwd}`))));
});

// Playwright 브라우저 설치용 환경: SKIP 변수를 지우고 랩 로컬 경로를 준다.
export const playwrightInstallEnv = () => {
  const env = { ...process.env };
  delete env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD;
  return { ...env, PLAYWRIGHT_BROWSERS_PATH: path.join(runDir, 'pw-browsers') };
};

export const execText = (file, args, opts = {}) => new Promise((resolve) => {
  execFile(file, args, { encoding: 'utf8', timeout: opts.timeout ?? 20000, env: { ...process.env, ...(opts.env ?? {}) } }, (err, stdout, stderr) =>
    resolve({ ok: !err, code: err?.code ?? 0, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') }));
});
```

- Node 20.12 이상은 셸 없이 `.cmd`를 spawn하면 `EINVAL`을 던진다(CVE-2024-27980 대응; child_process 문서 "Spawning .bat and .cmd files on Windows"). 그래서 win32만 `shell: true`다.
- `child.pid`는 분리된 자식의 pid다. Linux에서는 그 pid가 프로세스 그룹 id이기도 하다(`detached: true` → `setsid`).

### 8.3 `lib/ready.mjs` — 준비 판정 (상태 200 + 본문 검사)

```js
// vite preview는 index.html이 있는 빌드에서 없는 경로에도 200과 index.html을 준다. 그래서 본문을 본다.
const META_RE = /<meta[^>]*name="harbor-app"[^>]*content="([^"]+)"/;   // 속성 순서가 바뀌어도 content만 뽑는다

export const checkReady = async ({ url, kind, expect, buildId }) => {
  let res;
  try { res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(3000) }); } catch { return { ok: false, why: 'no response' }; }
  if (res.status !== 200) return { ok: false, why: `status ${res.status}` };
  const body = await res.text();
  if (kind === 'manifest') {
    try { const j = JSON.parse(body); return j.name === expect ? { ok: true } : { ok: false, why: `manifest name ${j.name}` }; }
    catch { return { ok: false, why: 'manifest is not JSON (probably index.html fallback)' }; }
  }
  if (kind === 'module') return body.includes('mount') && body.includes('unmount') ? { ok: true } : { ok: false, why: 'no mount/unmount in body' };
  const m = META_RE.exec(body);
  if (!m) return { ok: false, why: 'no harbor-app meta' };
  const want = buildId ? `${expect}@${buildId}` : `${expect}@`;
  return m[1].startsWith(want) ? { ok: true, content: m[1] } : { ok: false, why: `meta ${m[1]} != ${want}` };
};

export const waitReady = async (target, { timeoutMs = 60000, intervalMs = 250 } = {}) => {
  const t0 = Date.now();
  let last = { ok: false, why: 'not polled' };
  while (Date.now() - t0 < timeoutMs) {
    last = await checkReady(target);
    if (last.ok) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return last;
};
```

- 로컬 요청은 Node 내장 `fetch`로 한다. Node는 `NODE_USE_ENV_PROXY=1`(22.21 이상) 없이는 프록시 환경 변수를 **무시**하므로 127.0.0.1에 직접 붙는다(https://github.com/nodejs/node/pull/57165). 외부 탐침에는 반대로 쓰면 안 된다(8.5절).
- `LAB_MF=off` 빌드에서는 same-tree remote의 `ready.fallback`(HTML meta)으로 판정한다. 어느 쪽을 쓸지는 `.run/build.json`의 `mf` 값으로 정한다.

### 8.4 `lib/serve.mjs` — pid 파일, `killTree`, `serve`·`status`·`stop`

```js
// mfa-lab/scripts/lib/serve.mjs — serve·status·stop 명령과 pid 파일. (ARCHITECTURE 「저장소 구조」: serve = serve·status·stop·pid 파일)
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { runDir } from './apps.mjs';
import { isWin, execText } from './spawn.mjs';

const pidsPath = path.join(runDir, 'pids.json');
export const readPids = () => (existsSync(pidsPath) ? JSON.parse(readFileSync(pidsPath, 'utf8')) : {});
export const writePids = (pids) => {                       // 임시 파일에 쓰고 rename (중간 상태가 남지 않게)
  mkdirSync(runDir, { recursive: true });
  const tmp = `${pidsPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(pids, null, 2));
  renameSync(tmp, pidsPath);
};
export const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };   // signal 0 = 존재 확인 (process 문서)

export const killTree = async (pid) => {
  if (!alive(pid)) return;
  if (isWin) { await execText('taskkill', ['/pid', String(pid), '/T', '/F']); return; }   // /T 자식까지, /F 강제
  try { process.kill(pid, 'SIGTERM'); } catch { /* 이미 없음 */ }
  // vite preview는 자식을 만들지 않으므로 pid 하나면 충분하다. 프로세스 그룹 전체(-pid)는 보조 수단이다.
  // Node 문서(process.kill, https://nodejs.org/api/process.html)에는 음수 pid에 대한 변경 이력이 없고 "On Windows, killing a process group is not supported."만 적혀 있다.
  // 즉 음수 pid = 프로세스 그룹은 POSIX kill(2) 의미 그대로이고 Linux에서는 지원된다. 그룹이 이미 없을 수 있으므로 try/catch. (Windows 분기는 위에서 taskkill로 끝났다)
  try { process.kill(-pid, 'SIGTERM'); } catch { /* 그룹이 이미 없음 */ }
  for (let i = 0; i < 20 && alive(pid); i++) await new Promise((r) => setTimeout(r, 250));
  if (alive(pid)) { try { process.kill(pid, 'SIGKILL'); } catch { /* */ } }
};
```

같은 파일에 두는 `serve`의 흐름(`export const serve = async ({ flags }) => ...`): 활성 앱마다 `checkReady` → 이미 통과하면 건너뜀(멱등) → `spawnVitePreview` → `waitReady`(60초) → `pids.json`에 `{ pid, port, outDir, startedAt }` 기록. 실패하면 `.run/logs/<app>.log` 끝 40줄을 출력하고 0이 아닌 코드. `--baseline`이고 `dist-051/index.html`이 없으면 경고만 내고 넘어간다. `status`는 pid 생존(`alive`) + `checkReady`, `stop`은 `pids.json`의 항목마다 `killTree` 뒤 파일 정리([ARCHITECTURE.md](./ARCHITECTURE.md) 「실행 모델」 명령 표).

### 8.5 `lib/doctor.mjs` — 외부 탐침은 curl과 npm으로

```js
import { execText, isWin } from './spawn.mjs';

const HOSTS = ['registry.npmjs.org', 'cdn.playwright.dev', 'playwright.download.prss.microsoft.com', 'storage.googleapis.com'];
const devnull = isWin ? 'NUL' : '/dev/null';

// curl과 npm은 HTTP(S)_PROXY를 따른다. Node fetch는 따르지 않으므로 외부 탐침에 쓰지 않는다.
export const probeHost = async (host) => {
  const r = await execText('curl', ['-sS', '-o', devnull, '-w', '%{http_code}', '--max-time', '15', `https://${host}/`]);
  return r.stdout.trim() || '000';                           // '000' = 연결 불가
};
export const probeNpm = async () => {
  const r = await execText(isWin ? 'npm.cmd' : 'npm', ['ping'], { timeout: 30000 });   // 성공: "npm notice PONG <ms>"
  return r.ok ? 'ok' : 'fail';
};
export const redactProxy = (value) => (value ? value.replace(/\/\/[^@/]+@/, '//') : null);   // user:pass@ 제거. env.json은 커밋된다

export const doctor = async ({ flags }) => {
  const network = Object.fromEntries(await Promise.all(HOSTS.map(async (h) => [h, await probeHost(h)])));
  const npmPing = await probeNpm();
  const cdnCode = network['cdn.playwright.dev'];
  let laneCandidate = cdnCode !== '000' ? 'B' : 'none';
  if (laneCandidate === 'B' && cdnCode === '403') {
    const body = await execText('curl', ['-sS', '--max-time', '15', 'https://cdn.playwright.dev/']);
    if (/Host not allowed/i.test(body.stdout)) laneCandidate = 'none';        // 프록시 거부
  }
  // ... /opt/pw-browsers 목록으로 A, 아니면 C. 나머지 항목(Node, git, 포트, 프록시 변수, uid/sudo, lane 해석)은 ARCHITECTURE.md 「doctor가 기록하는 것」 표대로.
  // Node < 22.12 이면 메시지를 내고 return 1 (스크립트 안에서 Node를 바꾸지 않는다).
  // --write <path> 면 결과 JSON을 그 경로에 쓴다 (BRIEF-1 「SPIKE.md 작성 규칙」의 env.json 필드).
  return 0;
};
```

### 8.6 `test` 래퍼 (`lib/commands.mjs`의 일부)

```js
// mfa-lab/scripts/lib/commands.mjs — install·build·smoke·up·test. 아래는 test만. 같은 lib/ 디렉터리 안이므로 './serve.mjs'처럼 상대 경로다 ('./lib/...'가 아니다).
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { labRoot, runDir } from './apps.mjs';
import { serve } from './serve.mjs';      // 8.4절 lib/serve.mjs
import { doctor } from './doctor.mjs';    // 8.5절 lib/doctor.mjs

export const test = async ({ flags, positional }) => {
  await serve({ flags: { baseline: true }, positional: [] });                     // 서버 보장. 이미 떠 있으면 건너뛴다
  const localPath = path.join(runDir, 'lane.local.json');
  if (!existsSync(localPath)) await doctor({ flags: {} });                         // 새 VM: lane 해석을 먼저
  const local = existsSync(localPath) ? JSON.parse(readFileSync(localPath, 'utf8')) : {};
  const env = { ...process.env, ...(local.browsersPath ? { PLAYWRIGHT_BROWSERS_PATH: local.browsersPath } : {}) };
  const cli = path.join(labRoot, 'e2e', 'node_modules', '@playwright', 'test', 'cli.js');   // @playwright/test의 bin: cli.js
  const args = [cli, 'test', '-c', path.join(labRoot, 'e2e', 'playwright.config.ts'), ...positional, '--project', String(flags.project ?? 'mouse')];   // --project는 항상 넘긴다
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: labRoot, stdio: 'inherit', env });
    child.on('exit', (code) => resolve(code ?? 1));                                 // 종료 코드는 Playwright의 것
  });
};
```

함정

- `npx playwright test`를 직접 실행하지 않는다. 서버 확인과 레인 환경이 빠진다.
- Bash timeout: `install`·`up`·`test`는 600000, `build`는 300000([BRIEF-1-build.md](./BRIEF-1-build.md) 「명령과 Bash timeout」).
- 의존성을 바꾼 프로젝트는 lockfile을 처음부터 다시 만든다(`install --only <app> --fresh`). `node_modules`가 있는 상태에서 의존성만 추가하면 다른 플랫폼용 optional 패키지(`@rollup/rollup-win32-x64-msvc`, `@esbuild/win32-x64`)가 lockfile에서 빠질 수 있다.
- Windows 실행은 검증하지 않았다. `mfa-lab/README.md`에 "미검증"으로 적는다.

---

## 9. 브라우저 레인 명령 (B1-01)

| 목적 | 처음 쓰는 단계 | 상태 | 출처 |
|---|---|---|---|
| 레인 B → A → C 순서로 Chromium을 확보한다. 버전은 섞지 않는다 | B1-01 | 실행 확인(레인 B만): 40ac74c | https://playwright.dev/docs/browsers (`PLAYWRIGHT_BROWSERS_PATH`, `install chromium`, `install-deps`, `--only-shell`), https://playwright.dev/docs/test-cli (`install --dry-run`), 버전 대응 https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/packages/playwright-core/browsers.json , https://raw.githubusercontent.com/microsoft/playwright/v1.56.0/packages/playwright-core/browsers.json |

버전 대응(확인 2026-10-06): v1.63.0 → `chromium`·`chromium-headless-shell` 리비전 **1243**, `153.0.8010.12`. v1.56.0 → 리비전 **1194**, `141.0.7390.37`.

### 레인 B — 다운로드 (`@playwright/test@1.63.0`, Chromium 153)

```bash
# 핀을 e2e/package.json에 적은 뒤
npm --prefix mfa-lab/e2e install --no-audit --no-fund                                  # timeout 600000

# 1차 시도: SKIP 변수를 지우고 랩 로컬 경로로 설치. 최대 2회.
env -u PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD PLAYWRIGHT_BROWSERS_PATH="$PWD/mfa-lab/.run/pw-browsers" \
  node mfa-lab/e2e/node_modules/@playwright/test/cli.js install chromium                 # timeout 600000

# 2차 시도(다운로더만 실패하는 경우, 예: 프록시 뒤 EAI_AGAIN https://github.com/microsoft/playwright/issues/39934):
#   --dry-run 으로 다운로드 URL과 설치 위치를 읽고, curl로 받아 그 위치에 푼 뒤 디렉터리에 빈 파일 INSTALLATION_COMPLETE 를 만든다.
env -u PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD PLAYWRIGHT_BROWSERS_PATH="$PWD/mfa-lab/.run/pw-browsers" \
  node mfa-lab/e2e/node_modules/@playwright/test/cli.js install --dry-run chromium
#   → 출력된 URL 로: curl -fL --retry 2 -o mfa-lab/.run/dl/chromium.zip "<URL>" ; unzip -q -d "<설치 위치>" mfa-lab/.run/dl/chromium.zip
#   INSTALLATION_COMPLETE 표식 파일 이름은 Playwright 레지스트리 구현에서 온 관례이고 여기서는 확인하지 못했다 (미검증).

# 실행 시 공유 라이브러리 누락 오류가 나면 (root 또는 sudo -n 가능할 때만)
node mfa-lab/e2e/node_modules/@playwright/test/cli.js install-deps chromium              # timeout 600000
```

- `cdn.playwright.dev`와 `playwright.download.prss.microsoft.com`은 클라우드 기본 허용 목록에 없다. 사용자가 Custom 목록에 추가하지 않았으면 B는 실패하고 A로 간다([HARNESS.md](./HARNESS.md) 「브라우저 레인」).
- `PLAYWRIGHT_BROWSERS_PATH`는 **설치와 실행 양쪽**에 같은 값이어야 한다(Playwright browsers 문서). 실행 쪽은 `ctl test`가 `.run/lane.local.json`의 `browsersPath`로 넘긴다.
- headless shell만 필요하면 `--only-shell`로 다운로드를 줄일 수 있다. S10(풀 바이너리 비교)을 하려면 전체를 받는다.

### 레인 A — 이미지에 있는 빌드 1194 (`@playwright/test@1.56.0`, Chromium 141)

```bash
ls /opt/pw-browsers                       # chromium-1194 또는 chromium_headless_shell-1194 가 있어야 한다 (doctor가 기록)
env | grep PLAYWRIGHT                     # PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers 를 기대
# e2e/package.json 핀을 1.56.0 으로 바꾸고
rm -rf mfa-lab/e2e/node_modules mfa-lab/e2e/package-lock.json && npm --prefix mfa-lab/e2e install --no-audit --no-fund
# lane.local.json: { "browsersPath": "/opt/pw-browsers", "executablePath": null }
```

- 1194 빌드가 있다는 것은 제3자 보고(https://github.com/privacyfence/privacyfence/issues/760 , https://github.com/niolson/polybag/pull/291)이고 공식 문서에는 없다. 목록으로 직접 확인한다.

### 레인 C — Chrome for Testing 직접 다운로드 (`@playwright/test@1.56.0`, 141.0.7390.37)

```bash
# storage.googleapis.com 은 기본 허용 목록에 있다.
curl -fL --retry 2 -o mfa-lab/.run/dl/cft-141.zip \
  https://storage.googleapis.com/chrome-for-testing-public/141.0.7390.37/linux64/chrome-headless-shell-linux64.zip
mkdir -p mfa-lab/.run/pw-browsers/cft-141 && unzip -q -d mfa-lab/.run/pw-browsers/cft-141 mfa-lab/.run/dl/cft-141.zip
# lane.local.json: { "browsersPath": null, "executablePath": "<repo>/mfa-lab/.run/pw-browsers/cft-141/chrome-headless-shell-linux64/chrome-headless-shell" }
```

- URL 형식: `https://storage.googleapis.com/chrome-for-testing-public/<version>/linux64/chrome-headless-shell-linux64.zip`(풀 바이너리는 `chrome-linux64.zip`). 출처: https://googlechromelabs.github.io/chrome-for-testing/ . 버전 목록 JSON: `https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json`(채널별 최신), `known-good-versions-with-downloads.json`(전체).
- 141.0.7390.37의 두 zip은 2026-10-06에 로컬 PC에서 `HEAD` 200으로 존재를 확인했다(headless shell 약 118 MB). 클라우드 프록시를 통과하는지, 압축 해제 뒤 디렉터리 이름(`chrome-headless-shell-linux64/`)이 위와 같은지는 미실행이다.
- `executablePath`로 지정한 바이너리는 Playwright가 "번들된 Chromium이 아니면 자기 책임"이라고 적은 경로다(https://playwright.dev/docs/api/class-browsertype). Playwright 1.56의 번들 빌드와 같은 141.0.7390.37을 받는 이유다.

### 공통

- 성공한 레인을 `mfa-lab/e2e/lane.json`에 `{ lane, playwright, chromium }`으로 커밋한다. 기계 경로는 `.run/lane.local.json`(무시)에만 둔다.
- Playwright의 Chromium 샌드박스는 기본 **꺼져** 있다(`chromiumSandbox` 기본 false, https://playwright.dev/docs/api/class-browsertype). root 컨테이너에서 추가 플래그가 필요 없다.
- `localhost`가 리스너에 닿지 않을 때의 대안(B1-05 사다리): `launchOptions.args`에 `--host-resolver-rules=MAP crosssite.test 127.0.0.1`, telemetry의 `preview.allowedHosts: ['crosssite.test']`, `registry.json`의 `telemetry-x.origin`을 `http://crosssite.test:4304`로.

---

## 10. 하네스가 의존하는 브라우저·Playwright 동작

하네스의 헬퍼와 판정 규칙이 전제하는 입력 파이프라인의 사실이다. 전부 소스·문서 리딩이고 **미실행**이다. S0~S8이 확인한다. 각 행의 출처가 1차 자료다.

| # | 동작 | 하네스에 미치는 영향 | 출처 |
|---|---|---|---|
| 1 | **CDP 드래그 인터셉트 순서.** `mouse.down` 뒤 왼쪽 버튼이 눌린 채 `mouse.move`가 오면 Playwright는 모든 프레임에 `mousemove`·`dragstart` capture 리스너를 넣고 `Input.setInterceptDrags {enabled: true}`를 켠 뒤 실제 `mouseMoved`를 보낸다. Blink가 `dragstart`를 내고 아무도 `preventDefault`하지 않으면 `Input.dragIntercepted` 이벤트가 오고, Playwright는 `Input.dispatchDragEvent {type:'dragEnter', data}`를 보낸다. 그 뒤의 `mouse.move`마다 `{type:'dragOver'}`만 보낸다. 드래그 중 `mouse.down`은 무시된다 | `begin`은 첫 이동으로 `dragstart`+`dragenter`만 얻고, `dragover`는 두 번째 이동부터다. teleport = 이동 1회 = dragover 1회 | https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/crDragDrop.ts , https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/crInput.ts |
| 2 | **드래그 임계값.** Blink는 Mac이 아니면 `kDragThresholdX = kDragThresholdY = 4`이고 비교는 `>=`다 | 첫 이동은 4px 이상이어야 한다. `begin`은 6px | https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/input/mouse_event_manager.cc |
| 3 | **`mouse.up`이 보내는 것.** 드래그 중 `mouse.up`은 `Input.dispatchDragEvent {type:'drop'}` 하나다. Chromium은 이를 `DragTargetDragOver` → (그 콜백에서) `DragTargetDrop` → `DragSourceSystemDragEnded` → `DragSourceEndedAt(current_op)`로 처리한다. 즉 페이지는 `dragover` → `drop` → `dragend`를 **연달아** 받는다 | 릴리스 직전 dragover가 소스가 아닌 패널에 떨어지면 라이브러리의 취소되지 않는 rAF(`src/components/PanelNodeRenderer.tsx:103-106`)가 드롭 뒤에 실행된다. 「stale preview 판정 규칙」([HARNESS.md](./HARNESS.md))의 근거. 기본 릴리스가 `overShadow`인 이유 | https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/input_handler.cc |
| 4 | **`dragend`의 `dropEffect`.** `DragSourceEndedAt`은 `drag_data_transfer_->SetDestinationOperation(operation)` 뒤 `dragend`를 **`drag_src_`(드래그를 시작한 노드)에** 보낸다. `isConnected` 검사는 없다 | 잠긴 패널 위에서 놓으면 `dragend.dropEffect === 'none'`, 커밋이면 `'move'`. 소스가 미리보기로 리마운트돼 분리돼 있어도 `dragend`는 그 분리된 원본으로 간다 → 프로브의 대상별 리스너(7.8절)만 본다. S3·S5의 전제 | 위 `mouse_event_manager.cc` |
| 5 | **드롭 거부.** 마지막 dragover의 연산이 `none`이면 Blink는 drop을 거부하고 `dragleave`를 보낸다 | 잠긴 패널 릴리스 = `dragover('none')` → `dragleave` → `dragend('none')`, `drop` 없음. OS 커서 대신 쓰는 대체 지표 | https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/frame/web_frame_widget_impl.cc (`DragTargetDrop`), 처리 모델 https://html.spec.whatwg.org/multipage/dnd.html |
| 6 | **Escape = `dragCancel`.** 드래그 중 `keyboard.press('Escape')`는 `cancelDrag()` → `Input.dispatchDragEvent {type:'dragCancel'}` → `DragSourceSystemDragEnded` + `DragSourceEndedAt(kNone)`. 대상 쪽 `dragleave`는 없다 | `cancelEsc` 뒤 `dragend`만 기록된다. `dragleave` 부재는 하네스 부작용이지 버그가 아니다 | `crInput.ts`(위), `input_handler.cc`(위), https://github.com/microsoft/playwright/issues/33853 ("Canceling a drag operation does not fire `dragleave`", closed, P3-collecting-feedback) |
| 7 | **멈춘 커서에는 `dragover`가 없다.** 실제 브라우저는 드래그 중 "every 350ms (±200ms)"마다 dragover를 다시 보내지만 Playwright는 `mouse.move` 때만 보낸다 | 멈춘 커서에서의 재판정은 `nudge()`로 흉내 내고 `emulated` 라벨을 붙인다 | https://html.spec.whatwg.org/multipage/dnd.html , `crDragDrop.ts`(위) |
| 8 | **터치는 CDP로만.** Playwright `touchscreen`은 탭뿐이다(`touchStart` + 빈 `touchPoints`의 `touchEnd`를 연달아). 누르고 있기·이동·떼기는 `Input.dispatchTouchEvent`로 보낸다. 규칙: `touchEnd`·`touchCancel`은 `touchPoints`가 비어야 하고 `touchStart`·`touchMove`는 하나 이상. `TouchPoint`는 `x, y, id` 등. CDP 세션은 Chromium 전용 | `touch.ts`의 모양. `hasTouch: true` 프로젝트에서만 쓴다(Playwright는 `hasTouch`로 `Emulation.setTouchEmulationEnabled`를 켠다; 없이도 trusted인지는 S0가 기록) | https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Input.pdl , https://playwright.dev/docs/api/class-touchscreen , `crInput.ts`(위), https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/crPage.ts |
| 9 | **리사이저는 `pointerdown`을 취소한다**(`src/hooks/useDragResize.ts:20`). Pointer Events 명세: pointerdown을 취소하면 이후 호환 마우스 이벤트(mousedown/mousemove/mouseup)가 발생하지 않는다. `pointerup` 뒤 캡처는 암묵적으로 해제된다 | 리사이즈 중 `mouse*` 이벤트가 없는 것은 정상. 판정은 `pointermove`·`gotpointercapture`로. 같은 이유로 pointerdown을 취소하는 내용 위에서는 Playwright의 드래그 감지(`mousemove` 리스너)가 동작하지 않는다 | https://www.w3.org/TR/pointerevents3/ ("Canceling this event also prevents subsequent firing of compatibility mouse events"), `crDragDrop.ts`(위) |
| 10 | **터치 시작 네이티브 드래그의 버전 차이.** `kTouchDragAndDrop`은 141.0.7390.37에서 `IS_CHROMEOS \|\| IS_ANDROID`일 때만 기본 on, 153.0.8010.12에서는 `IS_CHROMEOS \|\| IS_ANDROID \|\| IS_WIN \|\| IS_LINUX`에서 기본 on이다. 켜져 있으면 `GestureManager::HandleGestureLongPress`가 `HandleDragDropIfPossible`을 불러 `draggable=true` 요소에서 네이티브 HTML5 드래그를 시작할 수 있다 | `?drag=panel`(패널 `draggable=true`, `src/components/PanelNodeRenderer.tsx:143`)에서 550ms 롱프레스는 레인 B(153)에서 네이티브 `dragstart`나 `touchcancel`을 낼 수 있다 = H-TOUCH-NATIVE-RACE의 관찰. 핸들 모드는 `draggable=false`라 영향이 없다 → S7a만 게이트. `native_touch_drag` 라벨: 153 → `on`, 141 → `off`. headless shell에서 실제로 시작되는지는 미실행 | https://raw.githubusercontent.com/chromium/chromium/141.0.7390.37/ui/base/ui_base_features.cc , https://raw.githubusercontent.com/chromium/chromium/153.0.8010.12/ui/base/ui_base_features.cc , https://raw.githubusercontent.com/chromium/chromium/153.0.8010.12/third_party/blink/renderer/core/input/gesture_manager.cc |
| 11 | **드롭 연산과 `effectAllowed`.** `dropEffect`가 `effectAllowed`가 허용하지 않는 값이면 현재 드래그 연산은 `none`이다 | ext-chip이 `effectAllowed`를 비워 두는 이유(3.11절). 패널은 모든 dragover를 `'move'`로 고쳐 쓴다(`PanelNodeRenderer.tsx:86`) | https://html.spec.whatwg.org/multipage/dnd.html |
| 12 | **headless shell과 풀 Chromium.** 기본 headless는 별도 `chromium-headless-shell` 바이너리, `channel: 'chromium'`은 새 headless(풀 바이너리). 드래그·터치 동작이 같다는 것은 추론이다 | S10(선택)이 비교한다. 못 하면 `not-run` | https://playwright.dev/docs/browsers , https://playwright.dev/docs/api/class-testoptions (`channel`) |
| 13 | **좌표.** `page.mouse`·CDP 터치의 좌표는 메인 프레임 뷰포트 CSS px다. `locator.boundingBox()`도 메인 프레임 기준이다. `addInitScript`는 자식 프레임에도 들어간다 | iframe 안을 가리킬 때도 같은 좌표계. 프로브는 프레임별로 모은다 | https://playwright.dev/docs/api/class-browsercontext , https://playwright.dev/docs/input |

---

## 부록: 이 문서가 확인한 것과 확인하지 못한 것 (2026-10-06)

확인한 것(1차 자료를 열어 봄): 위 핀 표의 모든 버전과 호환 범위; `shareStrategy`가 `@module-federation/vite`의 최상위 옵션이고 기본값이 `'version-first'`라는 것(플러그인 소스)과 두 값의 뜻(module-federation.io 설정 페이지); 플러그인 기본값 `filename: 'remoteEntry-[hash]'`, `manifest` 없음; 상위 예제의 host remotes가 매니페스트 URL 문자열이고 React 네 키(`react`, `react/`(긴 형태), `react-dom`, `react-dom/`)를 `singleton: true, requiredVersion: '^19.2.4'`로 공유하며 `build.target: 'chrome89'`라는 것; MF 매니페스트 최상위 필드(`id, name, metaData, shared, remotes, exposes`); `errorLoadRemote` 훅의 인자(`id, error, from, lifecycle, origin`)와 lifecycle 네 값(`beforeRequest | afterResolve | onLoad | beforeLoadShare`), 모듈 팩토리 반환이 `onLoad`에서만 유효하다는 것(런타임 훅 문서와 블로그 예제); 런타임 플러그인 파일이 `export default` 팩토리라는 것; Node `process.kill` 문서에 음수 pid 변경 이력이 없고 Windows만 프로세스 그룹 미지원이라는 것; Vite `build.lib.fileName` 함수 형태, `publicDir`→`outDir` 복사(`copyPublicDir` 기본 true), lib 모드의 `process.env.NODE_ENV` 미치환과 `.js`→`.mjs` 규칙, `transformIndexHtml`의 태그 반환 형태, `server.cors` 기본 정규식, `vite preview` CLI 옵션; Playwright `hasTouch`·`deviceScaleFactor`·`viewport`·`launchOptions`·`trace`·`channel`, JSON reporter `outputFile`, `install --dry-run/--only-shell/--with-deps`, `PLAYWRIGHT_BROWSERS_PATH`, `chromiumSandbox` 기본 false, browsers.json의 1194/141과 1243/153; CDP `dispatchTouchEvent`·`dispatchDragEvent`·`setInterceptDrags`·`dragIntercepted`의 pdl 정의; Playwright `crDragDrop.ts`/`crInput.ts`의 인터셉트·drop·dragCancel 코드; Chromium `input_handler.cc`의 drop 순서, `mouse_event_manager.cc`의 임계값 4(`>=`)와 `DragSourceEndedAt`; `ui_base_features.cc` 141 vs 153의 `kTouchDragAndDrop`; `gesture_manager.cc`의 `HandleGestureLongPress` → `HandleDragDropIfPossible`; HTML 명세의 350ms 문구; Pointer Events의 호환 마우스 이벤트 억제; npm alias 형식과 `npm ping`; Node `detached`/`shell`/`.cmd` 규칙과 `process.kill`; `taskkill /pid /t /f`; Chrome for Testing URL 형식과 141.0.7390.37 zip의 존재(HEAD 200).

확인하지 못한 것(레시피 옆에 표시했다): `shareStrategy: 'loaded-first'`가 실제로 막힌 remote에서 shell을 살리는지(게이트 (b)); `errorLoadRemote`가 `afterResolve`에서 `undefined`를 돌려줄 때 shell 전체가 뜨고 `error-orders` 카드만 남는지(게이트 (b)-2); `@module-federation/runtime`의 실제 `.d.ts`가 위 최소 타입과 맞는지; Playwright 수동 설치의 `INSTALLATION_COMPLETE` 표식; Chrome for Testing zip의 내부 디렉터리 이름과 클라우드 프록시 통과; cross-site iframe의 `sessionStorage`; `Input.dispatchTouchEvent`가 `hasTouch` 없이도 trusted인지; headless shell에서 터치 시작 네이티브 드래그가 실제로 시작되는지; 그리고 이 문서의 모든 코드가 그대로 빌드되는지.
