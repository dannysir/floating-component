# MFA 랩 하네스 (HARNESS)

> **이 문서는**
> - 무엇: `mfa-lab/e2e/` Playwright 하네스의 계약이다. 브라우저 확보 순서(레인), 설정, 헬퍼 API, 프로브·스냅샷 스키마, 불변식 I1~I7, stale preview 판정 규칙, 하네스 부작용 목록, 스펙 구성, 증거 규칙을 정한다.
> - 누가·언제: 클라우드 세션 1이 B1-01~B1-03에서 하네스를 만들 때, 세션 2가 시나리오 스펙을 쓰고 결과를 판정할 때, 수정 세션이 회귀 스펙을 돌릴 때 읽는다.
> - 의존: 슬롯·testid·`window.__fc`·`window.__mfe`·URL 플래그·`ctl.mjs` 명령은 [ARCHITECTURE.md](./ARCHITECTURE.md), 헬퍼·설정 코드 본문은 [RECIPES.md](./RECIPES.md), 단계·스파이크 표는 [BRIEF-1-build.md](./BRIEF-1-build.md), 시나리오·예측은 [BRIEF-2-inspect.md](./BRIEF-2-inspect.md), 가설은 [HYPOTHESES.md](./HYPOTHESES.md), 분류·심각도·귀속 사다리는 [../README.md](../README.md)가 정한다.
> - 상태: 2026-10-07 세션 1이 레인 B(Playwright 1.63.0, Chromium 153 headless shell)에서 이 하네스를 구현하고 스파이크 S0~S10을 실행했다. 실행으로 확인한 내용은 「B1-08 구축 결과」와 각 절의 `실행 확인: 40ac74c` 표시가 기준이다. 표시가 없는 예측(레인 A·C, 세션 2 시나리오)은 설계다.

**용어**

| 용어 | 뜻 |
|---|---|
| 패널 id | 트리 노드의 `id`. DOM에서는 `[data-panel-id="<id>"]` (`src/components/PanelNodeRenderer.tsx:141`). 프리셋마다 다르다 (`p-a`, `editor` 등) |
| 슬롯 | 패널의 `componentKey`. 모든 `data-testid`와 `window.__mfe`의 키 (`control-a`, `orders` 등). 패널 id → 슬롯은 `window.__fc.getTree()`의 `componentKey`로 찾는다 |
| 미리보기 | 드래그 중 라이브러리가 이동 결과를 미리 렌더링한 상태 (`src/components/TreeLayout.tsx:99-108, 161`) |
| shadow 패널 | 미리보기 안에서 드래그 중인 소스 패널. 인라인 점선 스타일이 붙는다 (`PanelNodeRenderer.tsx:13-17, 152`) |
| ghost | 터치 드래그 중 손가락을 따라다니는 패널 복제본. `document.body` 바로 아래에 붙는다 (`src/hooks/useTouchDrag.ts:60-74`) |
| settle | 한 입력 뒤 화면과 카운터가 멈출 때까지 기다리는 하네스 절차 (「헬퍼」) |
| teleport | `mouse.move` 한 번으로 목표 지점까지 가는 이동. dragover가 정확히 1회 발생한다 |
| 레인 | Playwright 버전과 Chromium 빌드의 한 쌍. B, A, C 중 하나만 쓴다 |

**이름 혼동 주의**: 스파이크 ID는 `S0`~`S10`, 심각도는 `sev-1`~`sev-4`다. 둘은 관계없다.

---

## B1-08 구축 결과 (2026-10-07, 세션 1)

실행 확인: 40ac74c. 스파이크 결과·기준선은 [../run00-spike/SPIKE.md](../run00-spike/SPIKE.md).

| 항목 | 실제 |
|---|---|
| 레인 | B. `@playwright/test@1.63.0`, Chromium 153.0.8010.12 headless shell(`chromium_headless_shell-1243`), 풀 바이너리 `chromium-1243`도 설치됨. `lane.json` = `{ "lane": "B", "playwright": "1.63.0", "chromium": "153.0.8010.12" }`, `.run/lane.local.json`의 `browsersPath` = `<repo>/mfa-lab/.run/pw-browsers` |
| 실행 인자 | `--no-proxy-server`, **`--site-per-process`**. headless shell은 기본으로 사이트 격리를 하지 않아 렌더러가 1개였고 `telemetry-x`가 OOPIF가 아니었다. 켠 뒤 `telemetry-x`는 별도 CDP 타깃이다(S9) |
| 프로젝트 | `mouse`, `touch`(`hasTouch: true`), `mouse-full`(`channel: 'chromium'`, S10 전용) |
| `teleport` | 이동 1회 뒤 프로브에 dragover가 없으면 같은 점으로 1회 더 이동한다. **Blink는 드래그 대상 요소가 바뀌는 갱신에서 `dragenter`(새 대상)·`dragleave`(옛 대상)만 보내고 `dragover`는 다음 갱신으로 미룬다.** 그래도 teleport당 dragover는 1회다. `MouseDrag.teleportMoves`가 1 또는 2 |
| 터치 시작 | `handleDrag`는 핸들에서 12px, 이어서 24px로 두 번 움직인다. **Chromium은 touch slop 안의 첫 `touchmove`(12px)를 페이지에 보내지 않는다**(`pointermove`만 나온다). 롱프레스(`longPressDrag`)는 550ms 뒤 첫 이동이 slop 밖이면 그대로 전달된다 |
| CDP 터치와 `hasTouch` | `hasTouch` 없는 `mouse` 프로젝트에서도 CDP `touchStart`가 trusted touchstart를 만든다(S0) |
| 헬퍼 시그니처 차이 | `snapshot(page, step)`, `checkInvariants(page, opts?)`, `expectInvariants(page, opts?)`(lab이 아니라 page. 페이지별 로그는 `labstate.ts`로 찾는다), `capture(page, testInfo, label, opts?)`, `finishCase(page, testInfo, since?)`(케이스 끝 `events.json`·`console.txt`), `readBaseline(name)`·`compareBaseline(a, b)`(`evidence.ts`), `writeBaseline(name, events)`(`baseline.ts`). `lab`은 `open`, `openStandalone`, `console`, `pageErrors`, `requests`, `failedRequests`, `consoleErrors()`, `bodyUserSelect()`, `lastOpen()`을 가진다. 테스트 끝 불변식은 `invariants.json` 첨부로 남는다 |
| 기준선 | S1~S6의 축소 이벤트 로그는 B1-06 federation 추가 뒤, `--site-per-process` 추가 뒤, B1-08 깨끗한 복원 뒤에도 바이트 단위로 같았다 |
| 양성 대조 | S5: npm 0.5.1(:4390)에서 Esc 뒤 I1·I2 모두 실패(요구대로) |
| stale preview | S8: `overShadow` 0/10, `settled`×`other-droppable` 6/10, `immediate`×`other-droppable` 8/10, 소스 위 릴리스는 모두 0/10 |
| S7b | 레인 B headless shell에서 550ms 롱프레스는 네이티브 `dragstart`·`touchcancel`을 내지 않았고 라이브러리 롱프레스 드래그가 커밋됐다 |

## 브라우저 레인

클라우드 이미지에 브라우저가 있는지는 **확인되지 않았다**. 공식 문서의 설치 도구 목록에는 브라우저가 없다. 2026년 9월의 외부 보고 2건은 `/opt/pw-browsers`에 Chromium 빌드 1194가 있고 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`이 설정돼 있다고 한다 (https://github.com/privacyfence/privacyfence/issues/760 , https://github.com/niolson/polybag/pull/291). 그래서 B1-00/B1-01에서 아래 순서로 확인하고, 처음 성공한 레인 하나로 고정한다.

### 순서: B → A → C → 중단 (미실행)

| 순서 | 조건 | 핀 | 브라우저 | 터치 시작 네이티브 드래그 (Linux) |
|---|---|---|---|---|
| **B** (우선) | `cdn.playwright.dev`에 닿고, `playwright install chromium`이 2회 시도 안에 성공하거나(실패하면 아래 「레인별 조건 상세」의 수동 다운로드로 같은 빌드를 받고), 실행된다 | `@playwright/test@1.63.0` | Chromium **153** (153.0.8010.12, 리비전 1243), headless shell | **on** |
| **A** | `/opt/pw-browsers`에 빌드 1194가 있고 실행된다. 다운로드 없음 | `@playwright/test@1.56.0` | Chromium **141** (141.0.7390.37, 리비전 1194), headless shell | **off** |
| **C** (미검증) | B·A 모두 실패. Chrome for Testing headless shell을 curl로 받아 `executablePath`로 지정한다. 버전은 핀과 같은 141.0.7390.x | `@playwright/test@1.56.0` | 받은 빌드 (141) | **off** |
| 중단 | 셋 다 실행 실패 | — | — | `BLOCKED-BROWSER` ([BRIEF-1-build.md](./BRIEF-1-build.md) 「중단 조건」) |

- 버전 근거: `browsers.json`의 v1.56.0 = 리비전 1194 / 141.0.7390.37, v1.63.0 = 리비전 1243 / 153.0.8010.12 (https://raw.githubusercontent.com/microsoft/playwright/v1.56.0/packages/playwright-core/browsers.json , https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/packages/playwright-core/browsers.json).
- "터치 시작 네이티브 드래그": `draggable=true`인 요소를 터치로 길게 누르면 브라우저가 HTML5 드래그(`dragstart`)를 직접 시작하는 기능이다. Chromium의 `kTouchDragAndDrop`은 141에서 ChromeOS·Android에서만 기본 on이고, 153에서는 Windows·Linux에서도 기본 on이다 (https://raw.githubusercontent.com/chromium/chromium/141.0.7390.37/ui/base/ui_base_features.cc , https://raw.githubusercontent.com/chromium/chromium/153.0.8010.12/ui/base/ui_base_features.cc). headless shell에서 실제로 시작되는지는 미실행이다.

### 레인별 조건 상세

- **B**
  - 설치는 자식 프로세스 환경에서 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`를 지우고 `PLAYWRIGHT_BROWSERS_PATH=<repo>/mfa-lab/.run/pw-browsers`(git 무시 경로)로 실행한다.
  - 1차 시도: `playwright install chromium`.
  - 2차 시도(수동 다운로드): 호스트는 curl로 닿는데 Playwright 다운로더만 실패하는 경우(프록시 뒤 `EAI_AGAIN`, https://github.com/microsoft/playwright/issues/39934). 같은 환경 변수로 `playwright install --dry-run chromium`을 실행해 출력된 **`chromium-headless-shell`의 다운로드 URL**을 읽는다(풀 `chromium` URL은 받지 않는다. 실패 로그에 URL이 찍혀 있으면 그 값과 같아야 한다). `mkdir -p mfa-lab/.run/dl mfa-lab/.run/pw-browsers/manual-153 && curl -fL --retry 2 -o mfa-lab/.run/dl/chromium.zip "<URL>"`로 받아 `unzip -q -d mfa-lab/.run/pw-browsers/manual-153 mfa-lab/.run/dl/chromium.zip`으로 `mfa-lab/.run/pw-browsers/manual-153/`에 풀고, 그 안의 실행 파일(`find mfa-lab/.run/pw-browsers/manual-153 -maxdepth 2 -type f -name headless_shell`로 찾는다. 예상 경로 `chrome-linux/headless_shell`, 미검증)의 절대 경로를 `.run/lane.local.json`의 `executablePath`로 둔다. `browsersPath`는 `null`. Playwright의 레지스트리 디렉터리나 표식 파일은 만들지 않는다(`executablePath`가 지정되면 Playwright는 레지스트리를 보지 않는다. https://playwright.dev/docs/api/class-browsertype). 미실행 절차다.
  - 실행 시 공유 라이브러리 누락 오류가 나면 `playwright install-deps chromium`(apt, root 필요)을 한 번 시도한다.
  - 사용자가 클라우드 환경의 네트워크 허용 목록에 `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`을 추가하지 않았으면 B는 실패한다. 그때는 A로 간다.
- **A**: `ls /opt/pw-browsers`에 `chromium-1194` 또는 `chromium_headless_shell-1194`가 있어야 한다. 존재 여부는 `ctl doctor`가 B보다 먼저 확인해 둔다. 그래서 B가 실패했을 때 A로 내려가는 데 비용이 들지 않는다.
- **C**: `https://storage.googleapis.com/chrome-for-testing-public/141.0.7390.37/linux64/chrome-headless-shell-linux64.zip`을 curl로 받아 `mfa-lab/.run/pw-browsers/cft-141/`에 푼다 (`storage.googleapis.com`은 기본 허용 목록에 있다). Playwright는 1.56.0 그대로 두고 `executablePath`만 지정한다. `browsersPath`는 `null`.
- 구체적인 실행 절차와 시도 횟수 기록은 [BRIEF-1-build.md](./BRIEF-1-build.md) 「단계」 B1-00·B1-01을 따른다.

### 왜 B가 A보다 먼저인가

- Chromium 153이 지금 사용자가 쓰는 버전대다.
- 153은 터치 시작 네이티브 드래그가 Linux·Windows에서 켜져 있다. 핸들 없는 모드(`?drag=panel`)에서 라이브러리의 450ms 롱프레스 타이머(`useTouchDrag.ts:8, 246-250`)와 브라우저의 네이티브 드래그가 경합하는지(H-TOUCH-NATIVE-RACE)는 153에서만 볼 수 있다. 141에서는 이 관찰이 `env-limit`이 된다.
- A는 다운로드가 필요 없는 대체 경로로 남긴다.

### 규칙

- **버전을 섞지 않는다.** Playwright 1.56이 153 바이너리를 구동하거나 그 반대인 조합은 금지한다. 레인 C도 Playwright 핀과 같은 141 빌드만 받는다. 레인 B의 수동 다운로드도 1.63.0의 `--dry-run`이 출력한 URL(리비전 1243)만 받는다.
- **레인은 하나만 쓴다.** 세션 1~2에서 두 번째 버전을 겹쳐 설치하지 않는다. 쓰지 않은 Chromium 메이저의 터치 결과는 REPORT.md에 `not-run`(환경 한계)으로 남긴다.
- **레인을 조용히 바꾸지 않는다.** `ctl doctor`가 커밋된 레인을 더 이상 쓸 수 없다고 판단하면 멈추고 보고한다.
- 헬퍼는 1.56에도 있는 API만 쓴다: `page.mouse`, `page.keyboard`, `context.newCDPSession`, `browser.newBrowserCDPSession`, `context.addInitScript`, `page.route`, `page.on('console' | 'pageerror' | 'request')`, `frame.evaluate`.

### `lane.json`과 `.run/lane.local.json`

| 파일 | git | 내용 | 누가 쓰는가 |
|---|---|---|---|
| `mfa-lab/e2e/lane.json` | 커밋 | 레인과 버전만. 기계 경로는 넣지 않는다 | 세션 1이 B1-01에서 한 번 |
| `mfa-lab/.run/lane.local.json` | 무시 | 이 기계의 경로 | `ctl doctor`가 매번 해석해 쓴다 |

```jsonc
// mfa-lab/e2e/lane.json (예시, 미실행)
{ "lane": "B", "playwright": "1.63.0", "chromium": "153.0.8010.12" }

// mfa-lab/.run/lane.local.json (예시, 미실행. ctl doctor가 resolvedAt도 함께 쓴다)
{ "browsersPath": "/abs/path/mfa-lab/.run/pw-browsers", "executablePath": null }
// 레인 B 수동 다운로드: { "browsersPath": null, "executablePath": "/abs/path/mfa-lab/.run/pw-browsers/manual-153/chrome-linux/headless_shell" }
// 레인 A:             { "browsersPath": "/opt/pw-browsers", "executablePath": null }
// 레인 C:             { "browsersPath": null, "executablePath": "/abs/path/mfa-lab/.run/pw-browsers/cft-141/chrome-headless-shell-linux64/chrome-headless-shell" }
```

- 두 필드는 배타적이다. `browsersPath`가 있으면 `ctl test`가 자식 환경에 `PLAYWRIGHT_BROWSERS_PATH`로 넘기고, `executablePath`가 있으면 `playwright.config.ts`가 `launchOptions.executablePath`로 읽는다. 둘 다 있으면 `ctl doctor`가 멈추고 보고한다.

- `native_touch_drag` 라벨은 `lane.json`에 저장하지 않고 `chromium` 메이저에서 유도한다: 153 → `on`, 141 → `off`. 근거가 확인된 버전은 이 둘뿐이다.
- 하네스는 두 곳에서 버전을 검사한다. (1) 설정 로드 시 설치된 `@playwright/test`의 버전이 `lane.json`의 `playwright`와 다르면 예외. (2) `lab.open`이 `browser.version()`의 메이저를 `lane.json`의 `chromium` 메이저와 비교해 다르면 예외.

---

## Playwright 설정

파일은 `mfa-lab/e2e/playwright.config.ts`다 (default export는 도구가 강제하므로 허용). 전문은 [RECIPES.md](./RECIPES.md)에 있다. `mfa-lab/e2e/package.json`은 `private`, `"type": "module"`이고 devDependency는 레인 핀으로 고정한 `@playwright/test` 하나뿐이다. lockfile을 커밋한다.

### 설정값 (미실행)

| 항목 | 값 | 이유 |
|---|---|---|
| `globalSetup`, `webServer` | **두지 않는다** | 서버는 `ctl.mjs`가 띄운다. `globalSetup`은 default export가 하나 더 필요하고, 서버가 없는 단계(B1-01)에서 실패한다 |
| `workers` | `1` | 입력 타이밍(rAF, 450ms 롱프레스)이 4 vCPU에서 CPU 경합을 받으면 안 된다. 세션 1~2는 단일 에이전트, 순차 실행, 서브에이전트 없음 |
| `fullyParallel` | `false` | 위와 같음 |
| `retries` | `0` | 간헐 실패는 숨기지 않고 `repro_rate`로 기록한다 |
| `timeout` | `90_000` | |
| `use.baseURL` | `http://127.0.0.1:4300` | shell. 0.5.1 기준 빌드는 `http://127.0.0.1:4390` |
| `use.viewport` | `{ width: 1280, height: 800 }` | 증거 크기 고정 |
| `use.deviceScaleFactor` | `1` | 위와 같음 |
| `use.launchOptions.args` | `['--no-proxy-server', '--site-per-process']` (실행 확인: 40ac74c) | 프록시 환경 변수가 로컬 origin 요청에 끼어들지 않게 하고, cross-site iframe을 데스크톱 Chrome처럼 별도 프로세스(OOPIF)로 만든다(B1-05) |
| `use.launchOptions.executablePath` | `.run/lane.local.json`의 `executablePath` (레인 C와 레인 B 수동 다운로드만. 그 밖에는 `null`이라 지정하지 않는다) | |
| `use.trace` | `'retain-on-failure'` | 결과는 무시 경로 `test-results/`에 남는다. 커밋하지 않는다 |
| `use.video`, `use.screenshot` | 끔 | 스크린샷은 `capture`로 명시적으로만 찍는다 |
| `reporter` | `line` + `json` (`.artifacts/results.json`) | |
| `projects` | `mouse` (기본), `touch` (`use.hasTouch: true`), `mouse-full` (`channel: 'chromium'`, S10) (실행 확인: 40ac74c) | 터치 헬퍼는 `touch` 프로젝트에서만 쓴다 |

- **테스트마다 새 브라우저 컨텍스트**를 쓴다. Playwright Test의 기본 동작(`{ page }` 픽스처)을 그대로 쓰고, `beforeAll`에서 만든 page 공유, `storageState` 재사용, `test.describe.serial`로 상태를 이어 가는 구성은 금지한다. 직전 제스처의 잔여 상태(stale preview, 모듈 전역 터치 세션 `useTouchDrag.ts:45`)가 다음 테스트로 새지 않게 하기 위해서다.
- S10(선택)을 실행할 때만 `channel: 'chromium'`(풀 바이너리) 프로젝트 `mouse-full`을 추가한다. 풀 바이너리가 없으면 추가하지 않고 S10을 `not-run`으로 기록한다.

### 실행은 항상 `ctl test`로 한다

```
node mfa-lab/scripts/ctl.mjs test <filter> [--project mouse|touch]     # Bash timeout 600000
예: node mfa-lab/scripts/ctl.mjs test spike/s01
    node mfa-lab/scripts/ctl.mjs test explore/r14 --project touch
```

- 래퍼는 먼저 `serve --baseline`을 실행해 서버를 확인하고(이미 떠 있으면 건너뜀), `.run/lane.local.json`에서 `PLAYWRIGHT_BROWSERS_PATH`를 설정한 뒤 Playwright를 띄운다.
- 래퍼는 `--project`를 **항상** 넘긴다 (기본 `mouse`). Playwright는 `--project`가 없으면 모든 프로젝트를 실행하기 때문이다.
- `npx playwright test`를 직접 실행하지 않는다. 서버 확인과 레인 환경 설정이 빠진다.
- 한 번에 스펙 파일 하나 또는 폴더 하나만 실행한다. `ctl.mjs`의 전체 명령 명세는 [ARCHITECTURE.md](./ARCHITECTURE.md) 「실행 모델」에 있다.

---

## 헬퍼

파일은 `mfa-lab/e2e/helpers/`에 둔다. 코드 본문은 [RECIPES.md](./RECIPES.md)에 있다. 이 절은 각 헬퍼의 시그니처, 동작, 그 헬퍼가 지키게 하는 규칙을 정한다. RECIPES.md의 골격과 이름·인자가 다르면 이 절의 **동작 규칙**이 우선이고, 이름 차이는 B1-08에서 실제 구현으로 맞춘다.

### 공통 규칙

- **합성 이벤트 금지.** 드래그·터치·포인터 이벤트를 `dispatchEvent`로 만들지 않는다 (`locator.dispatchEvent`, `page.evaluate` 안의 `el.dispatchEvent` 모두). 이 프로젝트는 합성 이벤트를 잘못된 노드에 보내서 실제 버그를 놓친 적이 있다 (`doc/TODO.md:56-57, 115`).
- **`locator.dragTo`와 `page.dragAndDrop` 금지.** 이유는 `mouseDrag` 절에 있다.
- 모든 좌표는 메인 프레임 뷰포트의 CSS px다. iframe 안을 가리킬 때도 같다.
- 내용·구조 질의는 전부 `[data-tree-root]` 아래로 한정한다. 터치 ghost는 패널을 통째로 복제하므로(`useTouchDrag.ts:60`) 터치 드래그 중에는 모든 `data-testid`가 문서에 두 번 존재한다. ghost는 `body > [style*="z-index: 9999"]`로 따로 읽는다.
- 하네스 전제가 깨지면 `HarnessError`를 던진다 (서버 없음, 신뢰된 `dragstart` 없음, 목표 띠가 너무 좁음 등). 라이브러리 동작은 예외로 표현하지 않고 스냅샷에 기록한다.
- 입력을 보낸 뒤 스크린샷·스냅샷·릴리스·취소 전에는 반드시 `settle`을 거친다 (`immediate` 릴리스만 예외).
- 대기는 `settle`로 한다. `page.waitForTimeout`은 터치 `hold`에서만 쓴다.

### `fixtures.ts`

```ts
export const test;    // lab 픽스처와 probe 옵션을 더한 Playwright test
export const expect;

lab.open(opts: {
  layout: 'census' | 'locks' | 'row3' | 'pair' | 'workbench';
  slots?: Record<string, string>;        // 예: { a: 'bare-0', b: 'orders' }
  drag?: 'handle' | 'panel';             // 기본 'handle'
  lock?: string;                         // 예: 'p-a:draggable'
  iframeShield?: 0 | 1;
  origin?: 'shell' | 'baseline';         // 기본 'shell' (:4300). 'baseline' = :4390 (npm 0.5.1)
  expectState?: Record<string, 'ready' | 'error' | 'unregistered'>;   // 적은 슬롯만 덮어쓴다. 기본: 트리의 모든 슬롯이 'ready'
  flags?: Record<string, string>;        // persist, strict 등 P1 플래그
}): Promise<{ url: string; lib: { source: string; tree: string; commit: string }; skipped: string[] }>;   // skipped = 기다리지 않은 미등록 슬롯

lab.openStandalone(remote: 'orders' | 'board' | 'billing'): Promise<void>;   // remote 단독 페이지 (:4301~:4303)
```

| 동작 | 규칙 |
|---|---|
| URL을 만들고 이동한다. 예: `http://127.0.0.1:4300/?layout=census&a=bare-0&b=bare-1&c=bare-2&d=bare-3` | URL 플래그 이름은 [ARCHITECTURE.md](./ARCHITECTURE.md) 「핸들·잠금·URL 플래그」와 「레이아웃 프리셋」을 따른다 |
| `window.__fc.ready === true`를 기다린다 (최대 15초) | 시작 상태가 확정된 뒤에만 입력을 보낸다 |
| 트리의 모든 슬롯이 기대 상태에 도달할 때까지 기다린다 (최대 15초, 넘기면 `HarnessError`). PanelFrame이 있는 슬롯은 `__fc.frames[slot].state`, bare 슬롯은 `__mfe[slot].mounts >= 1`, iframe 슬롯은 `mirror.loads >= 1` | `expectState`는 적은 슬롯만 덮어쓰고 나머지는 기본값 `'ready'`다. remote를 막은 시나리오는 `expectState: { orders: 'error' }`처럼 명시한다 |
| **미등록 슬롯은 기다리지 않고** 반환값 `skipped`에 적는다. 판정은 `__fc.ready === true` 직후 한 번 한다: 그 패널 요소(`[data-tree-root] [data-panel-id="<id>"]`)에 자식 요소가 없고(`childElementCount === 0`) `__fc.frames`와 메인 프레임 `__mfe` 어디에도 그 슬롯 키가 없으면 미등록이다. `expectState`에 `'unregistered'`로 적은 슬롯도 같은 판정을 거치고, 판정이 어긋나면(자식이나 키가 있다) `HarnessError` | 라이브러리는 store에 없는 `componentKey`를 빈 패널로 그린다 (`src/components/PanelNodeRenderer.tsx:132-136`). PanelFrame도 프로브도 없으니 `frames`·`__mfe` 항목이 생기지 않고, 기다리면 시간 초과만 난다. 등록된 슬롯은 첫 커밋의 `useLayoutEffect`에서 항목을 만들므로 `ready` 시점에 키가 있다 ([ARCHITECTURE.md](./ARCHITECTURE.md) 「계측 계약」). 해당 시나리오: B1-06 게이트 (b)의 `workbench`(`board` 미등록 시점), R19 `pair-unregistered`. 스모크·explore 스펙은 `skipped`가 기대 목록(없으면 `[]`)과 같은지 전제로 단언한다 |
| `__fc.lib.source`가 origin과 맞는지 확인한다 (`shell` → `src` 또는 `dist`, `baseline` → `npm051`) | 다른 빌드를 측정하는 실수를 막는다 |
| 로드 직후의 `document.body.style.userSelect`를 저장한다 | I4의 기준값 |
| `page.on('console')`, `page.on('pageerror')`, `page.on('request')` 수집을 시작한다 | I6과 문서 요청 로그의 원천 |
| 프로브를 넣는다 (컨텍스트 `addInitScript`). 옵션 `test.use({ probe: false })`로 끌 수 있다 | 놀라운 결과는 프로브를 끄고 다시 실행해 본다 ([../README.md](../README.md)의 귀속 사다리) |
| 테스트가 끝나면 불변식 검사를 한 번 실행해 결과를 첨부한다 | 첨부만 하고 테스트를 실패시키지 않는다. 단언은 스파이크·회귀 스펙이 명시적으로 한다 |

### `settle.ts`

```ts
settle(page: Page): Promise<{ stable: boolean; reads: number; ms: number }>;
```

1. 메인 프레임에서 animation frame 2회를 기다리고, 이어서 매크로태스크 1회(`setTimeout 0`)를 기다린다.
2. 다음 값을 읽는다: `domTree`, `__fc.frames`의 카운터, 메인 프레임 `__mfe`의 카운터, 트리 안 모든 iframe 문서의 `__mfe`.
3. 25ms 뒤 다시 읽는다. 직전 읽기와 완전히 같으면 `stable: true`로 끝낸다.
4. 다르면 3을 반복한다. 2부터 500ms가 지나면 `stable: false`로 끝낸다.

- 트리 안 iframe 중 하나라도 문서를 읽을 수 없으면(로딩 중) 그 읽기는 "다름"으로 친다.
- 이유: 라이브러리는 미리보기를 rAF 콜백에서 설정한다 (`PanelNodeRenderer.tsx:103-106`). React 19는 이벤트 밖에서 온 그 갱신을 태스크로 처리하므로 rAF 2회만으로는 경계에 걸린다. 픽스처 카운터는 `useLayoutEffect`에서 쓰지만, 늦게 읽으면 ±1 차이가 라이브러리 동작처럼 보인다.
- `stable: false`는 던지지 않는다. 다음 스냅샷의 `settle` 필드에 남는다. 스파이크 스펙은 `stable === true`를 단언한다. explore 스펙에서 `stable: false`가 나온 단계의 카운터 변화량은 `unsettled`로 표시하고 그 케이스를 다시 실행한다.
- 릴리스 뒤용 별도 함수는 두지 않는다. 릴리스·취소 뒤에도 같은 `settle`을 쓴다.

### `geometry.ts`

```ts
dropPoint(page, anchorId: string, position: 'left' | 'right' | 'top' | 'bottom', depth: number): Promise<Point>;
domTree(page): Promise<string>;
treeNotation(tree: LayoutNode): string;
panelRect(page, panelId: string): Promise<Rect>;
handlePoint(page, slot: string): Promise<Point>;
resizerBetween(page, idA: string, idB: string): Promise<{ rect: Rect; axis: 'x' | 'y' } | null>;
underCursor(page, x: number, y: number): Promise<{ panelId: string | null; droppable: boolean; isIframe: boolean; tag: string; testid: string | null }>;
```

| 헬퍼 | 동작 | 규칙 |
|---|---|---|
| `dropPoint` | 앵커 패널 위에서 라이브러리가 정확히 `(position, depth)`로 해석하는 픽셀 하나를 돌려준다. `src/dnd/dropTarget.ts`의 판정을 그대로 다시 구현한다: ① `[data-tree-root]` rect 기준 가장 가까운 변까지의 정규화 거리가 0.05 미만이면 `depth = 조상 split 수 + 1` (`dropTarget.ts:4, 57-62`) ② 바깥쪽 split부터 안쪽으로, split rect 기준 거리가 0.15 미만이면 `depth = i + 1` (`:5, 64-69`) ③ 아니면 패널 자신의 가장 가까운 변, `depth 0` (`:71-72`). 앵커 rect 안의 후보 격자에 이 판정을 적용해 목표와 일치하는 영역의 중앙을 고른다 | 항상 **현재 DOM의 rect**로 계산한다. 미리보기가 떠 있으면 미리보기 DOM 기준이다 (라이브러리도 같은 DOM으로 계산한다). 좌표를 상수로 적지 않는다. 일치 영역의 폭이나 높이가 **4px 미만일 때만** `HarnessError`를 던진다. 고른 점에서 `underCursor`가 앵커 패널이 아니면 `HarnessError` |
| `domTree` | 렌더된 구조를 중첩 표기로 읽는다. `[data-layout-split]`(`LayoutNodeRenderer.tsx:126`)의 `flex-direction`이 `row`면 `H[...]`, `column`이면 `V[...]`(`:129`), `[data-panel-id]`는 id 그대로. 자식 순서는 DOM 순서, resizer는 뺀다. 예: `H[p-d,p-a,V[p-b,p-c]]` | `[data-testid="workspace"]` 안의 `[data-tree-root]` 하나로 한정한다. **미리보기 트리를 확인하는 유일한 방법**이다 (`__fc.getTree()`는 커밋된 트리만 준다) |
| `treeNotation` | `LayoutNode` JSON을 같은 표기로 바꾼다 (`direction: 'horizontal'` → `H`) | I5에서 `domTree`와 문자열로 비교한다 |
| `panelRect` | `[data-tree-root] [data-panel-id="<id>"]`의 `getBoundingClientRect()` | |
| `handlePoint` | `[data-tree-root] [data-testid="handle-<slot>"]`의 중앙. 없으면 그 슬롯 패널 안의 `[data-drag-handle]` 중앙 | 미리보기 중에는 shadow 패널의 헤더 위치를 준다 (ghost의 복제 헤더가 아니다) |
| `resizerBetween` | `.ftl-resizer`(`src/components/resizerStyles.ts:3`) 중 두 패널 rect 사이에 놓인 것을 기하로 찾는다. 경계 한쪽이 split이면 그 split 안에서 경계에 닿은 패널 id를 넘긴다 | 없으면 `null`. 잠긴 패널 옆에는 resizer가 렌더되지 않는다 (`LayoutNodeRenderer.tsx:107`) |
| `underCursor` | `document.elementFromPoint(x, y)`와 `closest('[data-panel-id]')`. `droppable`은 `data-panel-droppable !== "false"`(`PanelNodeRenderer.tsx:142`) | 릴리스 전 확인과 분류에 쓴다 |

참고: `census`를 1280x800으로 띄우면 `(p-a, left, depth 0)` 띠는 폭이 약 18px로 좁지만 존재한다 (root split 폭의 15% ≈ 188px, p-a 폭의 절반 ≈ 207px 사이). 그 점은 depth 1과 같은 트리를 만든다. 이 수치는 계산값이고 미실행이다.

### `mouseDrag.ts`

Playwright의 `page.mouse`는 Chromium에서 CDP 드래그 인터셉트를 통해 신뢰된(`isTrusted: true`) `dragstart`~`dragend`를 실제 `DataTransfer`와 함께 발생시킨다 (https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/crDragDrop.ts , https://playwright.dev/docs/input). 미실행이며 S1이 확인한다.

```ts
begin(page, slot: string, opts?: { expectStart?: boolean }): Promise<MouseDrag>;

interface MouseDrag {
  sourceId: string;
  teleport(point: Point): Promise<Snapshot>;
  glide(point: Point, steps: number): Promise<Snapshot>;
  nudge(): Promise<Snapshot>;
  release(opts?: { mode?: 'overShadow' | 'settled' | 'immediate' }): Promise<ReleaseResult>;
  cancelEsc(): Promise<ReleaseResult>;
}
interface ReleaseResult {
  mode: 'overShadow' | 'settled' | 'immediate' | 'esc';
  underCursorAtDrop: 'source' | 'other-droppable' | 'locked' | 'iframe' | 'outside' | null;   // esc는 null
  dragendDropEffect: string | null;
  sawDrop: boolean;
  snapshot: Snapshot;
}
```

| 헬퍼 | 동작 | 규칙 |
|---|---|---|
| `begin` | `handlePoint(slot)`으로 이동 → `mouse.down` → 6px 이동 1회 → `settle`. 핸들 위의 실제 mousedown이 패널의 `draggable`을 켠다 (`PanelNodeRenderer.tsx:59-69`) | 첫 이동은 4px 이상이어야 드래그가 시작된다 (Blink 임계값). 첫 이동은 `dragstart` + `dragenter`만 만들고 `dragover`는 만들지 않는다. 시작 확인: 프로브에 소스 패널을 대상으로 한 신뢰된 `dragstart`가 있고 `[data-tree-root]`에 `data-dragging-panel-id="<id>"`가 붙어야 한다. 없으면 `HarnessError`. 잠긴 패널은 `expectStart: false`로 "시작되지 않음"을 확인한다 |
| `teleport` | `mouse.move(x, y)` 1회 → 그 이동으로 dragover가 없었으면(대상 요소가 바뀐 경우, Blink가 dragover를 미룸) 같은 점으로 1회 더 → `settle` → 스냅샷 (실행 확인: B1-03a) | **이동 1회 = dragover 1회 = 미리보기 변화 최대 1회.** 카운터 변화를 미리보기 변화 한 번에 귀속시키기 위한 규칙이다. 측정·취소·커밋 시나리오의 기본 이동 방식이다 |
| `glide` | `mouse.move(x, y, { steps })` → `settle` → 스냅샷. dragover가 여러 번 발생한다 | P1의 churn 시나리오에서만 명시적으로 쓴다 |
| `nudge` | 같은 좌표로 `mouse.move`를 다시 보낸다 → `settle` → 스냅샷 | 멈춘 커서에서는 dragover가 오지 않으므로(「알려진 하네스 부작용」) 이것으로 흉내 낸다. 결과에 `emulated: 'stationary-dragover'` 라벨을 붙인다 |
| `release` | 아래 표 | 릴리스마다 `underCursorAtDrop`을 기록한다 |
| `cancelEsc` | `settle` → `keyboard.press('Escape')` → `settle` | Playwright가 CDP `dragCancel`을 보낸다. `dragleave`가 없는 것은 하네스 부작용이다 |

**릴리스 모드**

| 모드 | 절차 | 용도 |
|---|---|---|
| `overShadow` (기본) | 소스 shadow 패널의 **헤더**(`handlePoint(소스 슬롯)`)로 teleport → `settle` → `underCursor`가 소스 패널인지 확인(아니면 `HarnessError`) → `mouse.up` → `settle` | 모든 커밋 측정. 패널 중앙이 아니라 헤더에서 놓는 이유: 중앙은 iframe 문서나 remote의 드롭 존일 수 있고, 그러면 드롭이 패널에 닿지 않는다 |
| `settled` | `settle` → 커서가 있는 자리에서 `mouse.up` → `settle` | 잠긴 패널·iframe·패널 밖에서 놓는 취소 경로, S8의 비교 |
| `immediate` | 마지막 이동 직후 대기 없이 `mouse.up` → `settle` | S8의 비율 측정과 R08의 stale preview 강제 재현에만 쓴다. 이 모드의 비율을 사용자 체감 빈도로 인용하지 않는다 |

**`underCursorAtDrop` 분류**

릴리스 직전 프로브에 찍힌 **마지막 `dragover`의 대상**으로 정한다. `mouse.up`은 `dragover`를 한 번 더 보내므로(「stale preview 판정 규칙」) 그 기록이 브라우저가 실제로 판정한 대상이다. `overShadow`와 `settled`는 `mouse.up` 전에 `underCursor`로도 확인한다.

| 값 | 조건 |
|---|---|
| `source` | 대상 패널 id가 드래그 중인 소스와 같다 |
| `other-droppable` | 소스가 아닌 패널이고 `data-panel-droppable`이 `"false"`가 아니다 |
| `locked` | 대상 패널에 `data-panel-droppable="false"`가 있다 |
| `iframe` | 마지막 `dragover`가 메인 프레임이 아닌 프레임에 찍혔거나, `underCursor`의 요소가 `<iframe>`이다 |
| `outside` | 패널이 아니다 (resizer, tree root 여백, workspace 여백, 상단 바). 패널 밖에서는 dragover가 취소되지 않아 `drop`이 발생하지 않는다. 취소 경로다 |

**예상 이벤트 순서** (소스 리딩 기반, 미실행. 실제 기준선은 세션 1이 `doc/qa/run00-spike/SPIKE.md`에 기록한다)

| 구간 | 순서 |
|---|---|
| `begin` | `pointerdown`/`mousedown` → `dragstart` → `dragenter` |
| `teleport` | `dragover` (대상이 바뀌면 `dragleave`/`dragenter` 동반) |
| 드롭 가능한 곳에서 릴리스 | `dragover` → `drop` → `dragend` (`dropEffect: 'move'`) |
| 잠긴 패널에서 릴리스 | `dragover`(`dropEffect: 'none'`, `PanelNodeRenderer.tsx:98-101`) → `dragleave` → `dragend`(`dropEffect: 'none'`). `drop` 없음 |
| Escape | `dragend`만. `dragleave` 없음 |
| 소스가 리마운트된 뒤 종료 | `dragend`가 분리된 원본 노드로 간다. window 기록에는 없고 대상별 기록(`phase: 'target'`, `isConnected: false`)에만 남는다 |

**`locator.dragTo` 금지 이유**: `dragTo`는 누르기 → 이동 → 놓기를 한 번에 보낸다. 라이브 미리보기를 거치지 않고, 놓기 직전의 dragover가 예약한 rAF가 드롭 뒤에 실행돼 stale preview를 거의 매번 남긴다. 결과가 실제 사용과 다르고 불변식을 깨뜨린다.

**주의 (코드 리딩, 미실행)**: 소스 패널이 `draggable`은 되고 `droppable: false`인 경우 `overShadow`는 커밋 경로가 아니다. 자기 shadow 위의 `drop`은 `handleDrop`의 `!canDrop` 분기에서 전파가 막혀 루트 커밋에 닿지 않는다 (`PanelNodeRenderer.tsx:115-118`). 이 조합을 쓰는 시나리오는 릴리스 지점을 따로 정하고, 결과는 관찰로 기록한다.

### `touch.ts`

Playwright의 `touchscreen`은 탭만 지원한다 (https://playwright.dev/docs/api/class-touchscreen). 누르고 있기·이동·떼기는 CDP `Input.dispatchTouchEvent`로 보낸다. Chromium 전용이고 `touch` 프로젝트에서만 쓴다.

```ts
openTouch(page): Promise<Touch>;     // page.context().newCDPSession(page)
interface Touch {
  touchStart(point: Point): Promise<void>;     // { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }
  hold(ms: number): Promise<void>;             // 움직이지 않고 대기
  touchMove(point: Point): Promise<Snapshot>;  // { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] } → settle → 스냅샷
  touchEnd(): Promise<Snapshot>;               // { type: 'touchEnd', touchPoints: [] } → settle
  touchCancel(): Promise<Snapshot>;            // { type: 'touchCancel', touchPoints: [] } → settle
}
handleDrag(page, slot: string, waypoints: Point[], end: 'end' | 'cancel'): Promise<TouchResult>;
longPressDrag(page, panelId: string, waypoints: Point[], end: 'end' | 'cancel'): Promise<TouchResult>;
```

- 프로토콜 규칙: `touchEnd`·`touchCancel`은 `touchPoints`가 빈 배열이어야 하고, `touchStart`·`touchMove`는 점이 하나 이상 있어야 한다 (https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Input.pdl).
- 터치 경로는 `endSession`에서 rAF를 취소한다 (`useTouchDrag.ts:175`). 마우스 경로의 stale preview 규칙은 터치에 적용하지 않는다.
- 터치 경로는 `data-dragging-panel-id`를 설정하지 않는다 (마우스 경로만 설정한다, `PanelNodeRenderer.tsx:78`). 터치 드래그 중인지는 ghost 유무로 안다.

| 복합 헬퍼 | 절차 | 오라클과 용도 |
|---|---|---|
| `handleDrag` (`input: touch-cdp-handle`) | 핸들에서 `touchStart` → 12px `touchMove` → (ghost가 없으면) 24px `touchMove`(Chromium touch slop, 실행 확인: B1-03e) → waypoint마다 `touchMove` → `touchEnd` 또는 `touchCancel` | 핸들 모드는 **롱프레스 없이 8px를 넘는 이동**에서 드래그가 시작된다 (`useTouchDrag.ts:9, 145-149, 234`). 핸들 모드의 패널은 `draggable=false`라서(`PanelNodeRenderer.tsx:143`) 네이티브 드래그 경합이 없다. S7a(터치의 유일한 게이트)와 R13·R14가 쓴다 |
| `longPressDrag` (`input: touch-cdp-longpress`) | `?drag=panel`에서 패널 위 `touchStart` → `hold(550)` → waypoint마다 `touchMove` → 종료 | 라이브러리 타이머는 450ms다 (`useTouchDrag.ts:8, 246-250`). 타이머 전에 8px를 넘게 움직이면 세션이 끝난다 (`:142`). **기록 전용**이다 (S7b와 P1). 레인 B에서는 네이티브 `dragstart`나 `touchcancel`이 나타날 수 있고, 그것은 H-TOUCH-NATIVE-RACE의 관찰이다. 환경 한계나 하네스 실패로 처리하지 않는다 |

- `TouchResult`에는 ghost 관찰(개수, rect, `opacity`, `outline`), 종료 시 손가락 아래 분류(`underCursorAtDrop`과 같은 값), `onMovePanel` 호출 여부, 프로브의 `dragstart`·`contextmenu`·`selectstart` 유무를 담는다.
- 잠긴 패널 위에서는 ghost가 `opacity: 0.4`, `outline: 2px solid rgba(232, 17, 35, 0.8)`로 바뀌고(`useTouchDrag.ts:11-12, 85-93, 109-112`), 그 상태에서 떼면 취소된다 (`:160`).
- 참고: 공개 문서는 핸들 모드도 롱프레스로 시작한다고 적혀 있다 (`doc/API.ko.md:33`). 코드와 다르다. 이 불일치는 [HYPOTHESES.md](./HYPOTHESES.md)에 문서 불일치로 등록돼 있고, 하네스의 오라클은 코드 쪽이다.

### `resize.ts`

```ts
resizeBorder(page, opts: { between: [string, string]; delta: number; steps?: number; releaseOver?: Point }): Promise<ResizeResult>;
touchResize(page, opts: { between: [string, string]; delta: number; steps?: number }): Promise<ResizeResult>;
```

- `resizeBorder`: `resizerBetween`의 중앙으로 이동 → `mouse.down` → 축 방향으로 `delta`만큼 `mouse.move(…, { steps })` (기본 10) → `settle` → (`releaseOver`가 있으면 그 점으로 한 번 더 이동, `settle`) → `mouse.up` → `settle`. Resizer는 draggable이 아니므로 드래그 인터셉트가 걸리지 않고 포인터 이벤트가 그대로 간다.
- `touchResize`: 같은 동작을 CDP 터치로 보낸다 (`touch` 프로젝트).
- `ResizeResult`: 두 패널의 전후 크기, 실제 포인터 이동량, `gotpointercapture`/`lostpointercapture` 기록 유무, 릴리스 뒤 `body.style.userSelect`.
- **단언 규칙**: 크기 변화는 **방향과 3px 허용 오차**로 판정한다. 정확한 델타를 단언하지 않는다. 라이브러리가 resizer 두께(8px, `src/components/resizerConstants.ts:1`)를 포함한 split 전체 크기로 px를 비율로 바꾸므로(`LayoutNodeRenderer.tsx:61-66`) 패널은 포인터보다 약간 덜 움직인다.
- 리사이즈 중 `mousemove`·`mouseup`이 없는 것은 정상이다 (「알려진 하네스 부작용」).

### `faults.ts`

```ts
blockRemote(page, origin: string): Promise<() => Promise<void>>;   // 반환값은 해제 함수
```

- `page.route(origin + '/**', (route) => route.abort())`로 그 origin의 모든 요청을 막는다. `lab.open` **전에** 호출한다.
- 규칙: 장애 주입은 서버를 끄지 않고 네트워크 계층에서만 한다. 서버를 끄면 다른 스펙과 `ctl status`가 영향을 받는다.

### `snapshot.ts`, `invariants.ts`, `probe.init.ts`

각각 「스냅샷」, 「불변식」, 「프로브」 절이 정한다.

```ts
snapshot(lab, step: string): Promise<Snapshot>;
diff(before: Snapshot, after: Snapshot): SnapshotDiff;
seedContent(page, slot: string): Promise<void>;
checkInvariants(lab, opts?: { allow?: AllowList }): Promise<InvariantResult[]>;
expectInvariants(lab, opts?: { allow?: AllowList }): Promise<void>;     // 스파이크·회귀 스펙용 단언
installProbe(context): Promise<void>;
readProbe(page, opts?: { since?: number }): Promise<ProbeDump>;         // 모든 프레임을 합친다
resetProbe(page): Promise<void>;
```

### `evidence.ts`

```ts
capture(lab, label: string, opts?: { element?: Locator }): Promise<void>;
writeObservation(obs: Observation): Promise<void>;
promote(opts: { run: string; findingId: string; caseDir: string; images: string[] }): Promise<void>;

interface Observation {
  run: string;        // run 디렉터리 이름. 예: 'run01-tier1' (promote의 run과 같은 값)
  runNo: number;      // 케이스의 실행 번호 N. 1, 2 (3회째를 돌리면 3)
  scenario: string;   // 시나리오 ID. 예: 'R01'
  case: string;       // BRIEF-2 시나리오 표의 케이스 이름 그대로. 예: 'R01-hover'
  expected: string; predicted: string; observed: string;
  verdict: 'as-ideal' | 'as-predicted' | 'deviates';
  labels: Record<string, string | boolean>;   // 「증거와 라벨」의 라벨
  lib: { source: string; tree: string; commit: string };
  invariants: InvariantResult[];
  artifacts: string[];                        // mfa-lab/e2e/.artifacts/ 아래 상대 경로
}
```

| 헬퍼 | 동작 | 규칙 |
|---|---|---|
| `capture` | `settle` 뒤 `<label>.png`(뷰포트 또는 요소)와 `<label>.snapshot.json`을 `mfa-lab/e2e/.artifacts/<spec>/<case>/`에 쓴다. 케이스가 끝날 때 `events.json`(프로브 덤프)과 `console.txt`도 쓴다. 라벨 관례: `01-before`, `02-mid`, `03-after` | 드래그 중에는 `fullPage` 스크린샷을 찍지 않는다. 드래그 상태는 호출 사이에 유지되므로 이동과 이동 사이에 찍을 수 있다 |
| `writeObservation` | 관찰 JSON 한 개를 `doc/qa/<run>/obs/<case>-run<runNo>.json`에 쓴다. 예: `doc/qa/run01-tier1/obs/R01-hover-run1.json`. 같은 경로가 있으면 덮어쓴다(재실행). 필드는 위 `Observation` | `case`는 [BRIEF-2-inspect.md](./BRIEF-2-inspect.md) 「시나리오 표」의 케이스 이름(`RNN-<slug>`)이라 파일 이름에 시나리오 ID가 이미 들어 있다. `expected`·`predicted`는 「기대와 예측」의 사전 등록 문구를 옮겨 적는다. 관찰 뒤에 고치지 않는다. REPORT.md 커버리지 표의 "관찰 기록" 열과 발견 파일의 "관련" 절은 이 경로를 그대로 적는다 |
| `promote` | `caseDir`에서 고른 파일만 `doc/qa/<run>/evidence/<findingId>/`로 복사한다. 이름 규칙: `images`의 PNG는 그대로, `01-before.snapshot.json`은 `tree-before.json`으로, `03-after.snapshot.json`은 `tree-after.json`으로 이름을 바꿔 복사한다 (`02-mid.snapshot.json`은 그대로). `events.json`과 `console.txt`는 이름 그대로 복사하되 JSON 로그는 제스처 구간으로 잘라낸다. 대상 디렉터리를 비우고 다시 쓰므로 여러 번 실행해도 결과가 같다 | 이미지 6장 초과면 `HarnessError`. 발견 ID를 배정한 뒤, 해당 explore 케이스 끝에 `promote` 호출 한 줄을 추가하고 그 케이스를 다시 실행한다. 「발견 하나의 증거 묶음」의 파일 이름은 이 규칙으로만 만든다. 손으로 이름을 바꾸지 않는다 |

---

## 프로브

`window.__probe`는 하네스가 `context.addInitScript`로 **모든 프레임**(iframe 문서 포함)에 넣는 기록기다. 픽스처의 일부가 아니다.

- 수동적이다. `preventDefault`, `stopPropagation`을 절대 호출하지 않고, 모든 리스너를 `{ passive: true }`로 건다.
- `window.__probe = { events, domMoves, domLog, dump(since?), reset() }`. 프레임마다 따로 있다. `readProbe`가 `page.frames()`를 돌며 합치고 `wall`로 정렬한다.

### 기록하는 이벤트

window에 capture와 bubble 리스너를 둘 다 건다.

`dragstart` `dragenter` `dragover` `dragleave` `drop` `dragend` / `pointerdown` `pointermove` `pointerup` `pointercancel` `gotpointercapture` `lostpointercapture` / `touchstart` `touchmove` `touchend` `touchcancel` / `mousedown` `mousemove` `mouseup` / `contextmenu` `selectstart`

(`drag` 이벤트는 기록하지 않는다.)

### 레코드 스키마

```ts
interface ProbeEvent {
  seq: number;                 // 프레임 안 일련번호
  eid: number;                 // 같은 이벤트 객체의 capture/bubble/target 기록을 묶는 번호
  t: number;                   // performance.now() (프레임별 시계)
  wall: number;                // Date.now() (프레임 간 정렬용)
  frame: string;               // location.href
  top: boolean;                // 메인 프레임인가
  type: string;
  phase: 'capture' | 'bubble' | 'target';
  target: { tag: string; testid: string | null; panelId: string | null; droppable: boolean | null };
  isTrusted: boolean;
  isConnected: boolean;        // 기록 시점의 event.target.isConnected
  defaultPrevented: boolean;   // 그 phase 시점의 값
  x: number; y: number;        // clientX / clientY (터치는 changedTouches[0])
  pointerType?: string;
  dropEffect?: string; effectAllowed?: string; types?: string[];   // drag 이벤트만
  stopped?: boolean;           // capture 레코드에만
  count?: number; tLast?: number; xLast?: number; yLast?: number;  // 합쳐진 레코드만
}
```

| 항목 | 규칙 |
|---|---|
| `target` | `event.composedPath()`에서 찾는다. `panelId`는 경로에서 처음 만나는 `[data-panel-id]`, `testid`는 처음 만나는 `[data-testid]`, `droppable`은 그 패널의 `data-panel-droppable !== "false"` |
| capture와 bubble | capture 레코드는 핸들러 실행 **전** 값, bubble 레코드는 실행 **후** 값이다. 잠긴 패널 위 dragover의 `dropEffect: 'none'`, 패널의 `preventDefault` 여부는 bubble 레코드에서 읽는다 |
| `stopped` | capture에서 봤는데 같은 `eid`의 bubble 레코드가 없으면 `dump()`가 capture 레코드에 `stopped: true`를 붙인다. 누군가 전파를 멈췄다는 뜻이다. 예: 패널의 `handleDrop`은 잠긴 패널이거나(`PanelNodeRenderer.tsx:116`) 미리보기가 없을 때(`:119-120`) `stopPropagation`을 호출한다. `stopped` 이벤트는 핸들러 실행 후 값을 window에서 알 수 없다 |
| 합치기 | 같은 프레임에서 `type`, `phase`, 대상 요소, `defaultPrevented`, `dropEffect`가 같은 레코드가 연속되면 하나로 합치고 `count`를 올린다. 대상은 `dragover`, `pointermove`, `mousemove`, `touchmove`. teleport는 dragover가 1회이므로 `count`가 1이어야 한다 |

### 대상별 종료 리스너

- window capture에서 `dragstart`를 보면 **그 이벤트의 target 요소 자체**에 `dragend` 리스너를 건다. `touchstart`를 보면 target 요소 자체에 `touchend`와 `touchcancel` 리스너를 건다. 이 기록은 `phase: 'target'`이다.
- **이유**: 브라우저는 `dragend`와 `touchend`/`touchcancel`을 시퀀스를 시작한 원본 요소로 보낸다. 미리보기가 소스 패널을 리마운트하면 원본 요소는 문서에서 분리되고(`isConnected === false`), 분리된 노드로 간 이벤트의 전파 경로에는 `document`도 `window`도 없다. window 리스너만으로는 이 경로가 **보이지 않는다**. 이 프로젝트가 한 번 놓친 버그가 정확히 이 경로였다 (`doc/TODO.md`의 "해결: 드래그 중 소스 DOM 교체로 종료 이벤트 유실"). 라이브러리의 수정도 같은 원리로 원본 노드에 리스너를 건다 (`TreeLayout.tsx:144-150`, `useTouchDrag.ts:243-245`).
- 판독: 종료 이벤트가 `phase: 'target'` 레코드에만 있고 같은 `eid`의 capture 레코드가 없으면, 그 이벤트는 분리된 노드로 갔다. S3의 통과 조건이 이 레코드(`dragend`, `isConnected: false`)다.
- 분리된 소스로 가는 `touchmove`도 window에서 보이지 않는다. 그 수는 하네스가 보낸 CDP 호출 수로 안다.

### DOM 이동 로그

- 문서 전체에 `MutationObserver`(`childList`, `subtree`)를 건다. 부모가 `[data-tree-root]` 안에 있는 추가·제거 서브트리마다, 그 안의 모든 `[data-panel-id]` 요소를 **요소 동일성**(`WeakMap<Element, number>`로 부여한 `elementSeq`)으로 추적한다.

```ts
domLog: Array<{ seq: number; t: number; panelId: string; kind: 'added' | 'removed' | 'reinserted' | 'remounted'; elementSeq: number }>;
domMoves: { [panelId: string]: number };     // 'reinserted' 횟수
```

| `kind` | 조건 | 의미 |
|---|---|---|
| `added` | 처음 보는 요소이고 그 패널 id도 처음이다 | 최초 마운트 |
| `reinserted` | **같은 요소**가 제거된 뒤 다시 추가됐다. `domMoves[panelId]++` | React fiber는 유지됐고 DOM 노드만 옮겨졌다. React는 keyed 자식의 순서를 바꿀 때 제거 후 삽입을 한다. 안에 iframe이 있으면 다시 로드되고 스크롤·포커스가 초기화된다 |
| `remounted` | 같은 패널 id가 **다른 요소**로 추가됐다 | `PanelNodeRenderer`가 언마운트 후 새로 마운트됐다. 내용 컴포넌트도 새 fiber다 |
| `removed` | 제거된 뒤 다시 추가되지 않았다 (`dump()` 시점 기준) | 리마운트의 옛 요소이거나 `removePanel` |

- 조상 split이 옮겨지면 그 안의 패널은 전부 `reinserted`로, 조상 split이 새로 마운트되면 전부 `remounted`로 기록된다.
- DOM 로그는 메인 프레임에서만 의미가 있다.
- 리마운트, DOM 재삽입, iframe 재로드는 서로 다른 결함이고 수정 방법도 다르다. 그래서 host 프레임 카운터(`__fc.frames`), 내용 카운터(`__mfe`), DOM 동일성 로그(`__probe.domMoves`)를 따로 센다. 앞의 둘은 [ARCHITECTURE.md](./ARCHITECTURE.md) 「계측 계약」이 정한다.

---

## 스냅샷

`snapshot(lab, step)`은 한 단계의 상태를 JSON 하나로 만든다. 모든 DOM 질의는 `[data-tree-root]` 아래로 한정하고, ghost만 `body > [style*="z-index: 9999"]`로 따로 읽는다.

### 필드

| 그룹 | 필드 | 출처 |
|---|---|---|
| 식별 | `step`, `url`, `lib`(`source`, `tree`, `commit`), `settle`(`stable`, `reads`, `ms`) | `__fc.lib`, 직전 `settle` 결과 |
| 트리 | `tree`, `treeNotation`, `treeVersion`, `calls` | `__fc.getTree()`, `__fc.treeVersion()`, `__fc.calls` |
| DOM | `dom.domTree` | `domTree(page)` |
| | `dom.draggingPanelId` | `[data-tree-root]`의 `data-dragging-panel-id` 또는 `null` |
| | `dom.panels[panelId]`: `slot`, `rect`, `draggable`(요소의 `draggable` 프로퍼티), `droppable`(`data-panel-droppable !== "false"`), `shadow`(I2의 스타일 판정), `elementSeq` | 패널 요소 |
| | `dom.resizerCount`, `dom.resizers[]`(`rect`, `axis`) | `.ftl-resizer` |
| | `dom.ghosts[]`: `rect`, `opacity`, `outline`, `iframeCount` | `body > [style*="z-index: 9999"]` |
| | `dom.bodyUserSelect` | `document.body.style.userSelect` |
| 카운터 | `counters.frames` | `__fc.frames` 전체 |
| | `counters.mfe` | 메인 프레임의 `__mfe` 전체 |
| | `counters.iframes[slot]`: `loads`, `docId`, `frameUrl` | 각 iframe 문서의 `__mfe[slot]` (`frame.evaluate`) |
| | `counters.domMoves`, `counters.domLog` | `__probe` |
| 내용 상태 | `content[slot]`: `input`(값), `counter`(텍스트), `scrollTop`, `focused` | testid `<slot>-input`, `<slot>-counter`, `<slot>-scroll`. iframe 슬롯은 프레임 안의 `tele-input`, `tele-scroll`, `tele-loads` |
| | `activeTestid` | `document.activeElement`의 가장 가까운 `data-testid` |
| 로그 | `console[]`, `pageErrors[]` | 직전 스냅샷 이후 수집분 |
| | `documentRequests`: origin별 문서 요청 수 | `page.on('request')` 중 내비게이션 요청. iframe 재로드의 세 번째 오라클 |

- `seedContent(page, slot)`은 제스처 전에 내용 상태를 기본값이 아닌 값으로 만든다: 입력에 `seed-<slot>` 입력, 카운터 버튼 3회 클릭, 스크롤 컨테이너 `scrollTop = 120`. 초기화를 감지하려면 먼저 상태가 있어야 한다.

### `diff(before, after)` 분류

패널(슬롯)마다 한 가지 분류와 근거를 낸다. 위에서부터 처음 맞는 것을 고른다.

| 분류 | 조건 | 함께 기록 |
|---|---|---|
| `remounted` | 구간 안 `domLog`에 그 패널의 `remounted`가 있거나, `frameMounts` 증가(PanelFrame 슬롯), 또는 내용 `mounts` 증가(프로브 슬롯) | iframe 슬롯이면 `loads` 증가량. 세 수준이 서로 맞지 않으면 `mismatch: true` (예: DOM은 그대로인데 내용 `mounts`만 증가) |
| `reloaded` | 리마운트는 없고 iframe 문서의 `loads`가 늘었거나 `docId`가 바뀌었다 | `domMoves` 증가량, mirror `loads`, 문서 요청 수 |
| `reinserted` | 리마운트·재로드는 없고 `domMoves`가 늘었다 | 잃은 내용 상태 목록 (`scrollTop`, `focused` 등) |
| `content-reset` | DOM과 카운터에는 변화가 없는데 `content[slot]` 값이 기본값으로 돌아갔다 | 바뀐 필드. 원인 불명이므로 반드시 조사한다 |
| `untouched` | 위 어느 것도 아니다 | |

- 분류는 드래그한 패널과 드래그하지 않은 패널을 구분하지 않는다. 그 구분과 결함 여부 판단은 [BRIEF-2-inspect.md](./BRIEF-2-inspect.md) 「분류 기본값」을 따른다.
- `settle.stable === false`인 스냅샷이 끼면 diff 결과에 `unsettled: true`를 붙인다.

---

## 불변식

제스처가 **끝난 뒤** `settle`을 거쳐 검사한다. 드래그 중에는 I1~I3이 깨져 있는 것이 정상이다. 결과 항목은 `{ id, pass, detail, allowed }`다.

| ID | 불변식 | 정확한 검사 | 라이브러리 근거 |
|---|---|---|---|
| I1 | 드래그 표시가 남지 않는다 | `document.querySelectorAll('[data-tree-root][data-dragging-panel-id]').length === 0` | 설정: `PanelNodeRenderer.tsx:77-78` (`root.dataset.draggingPanelId`). 해제: `TreeLayout.tsx:80-83`. 마우스 경로에만 있다 |
| I2 | 미리보기 shadow 스타일이 남지 않는다 | `[data-tree-root] [data-panel-id]` 중 `el.style.opacity === '0.5'`이고 `el.style.outlineStyle === 'dashed'`인 요소가 없다. 참고값: `outline: 2px dashed rgba(0, 120, 212, 0.6)`, `outline-offset: -2px` | `SHADOW_STYLE` `PanelNodeRenderer.tsx:13-17`, 적용 `:152` |
| I3 | ghost가 남지 않는다 | `body > [style*="z-index: 9999"]` 중 `el.style.position === 'fixed'`이고 `el.style.pointerEvents === 'none'`인 요소가 없다 | 생성 `useTouchDrag.ts:60-74` (`position: fixed` `:63`, `pointer-events: none` `:70`, `opacity: 0.7` `:10, 71`, `z-index: 9999` `:72`, body에 추가 `:74`, 루트의 `data-panel-id` 제거 `:61`). 제거 `:176` |
| I4 | `body.style.userSelect`가 복원된다 | `document.body.style.userSelect === (lab.open이 저장한 로드 직후 값)` | 리사이즈 시작 시 `"none"` `src/hooks/useDragResize.ts:29-30`, 종료 시 복원 `:52` |
| I5 | 렌더된 구조가 커밋된 트리와 같다 | `domTree(page) === treeNotation(window.__fc.getTree())` | 구조 표식: `data-tree-root` `TreeLayout.tsx:124`, `data-layout-split` `LayoutNodeRenderer.tsx:126`, 방향 `:129`, `data-panel-id` `PanelNodeRenderer.tsx:141` |
| I6 | 새 콘솔 에러가 없다 | 테스트 시작 이후 `console` 타입 `error`와 `pageerror`가 0건 | prod 빌드는 라이브러리의 dev 경고를 제거하므로 콘솔은 라이브러리 경고의 오라클이 아니다 |
| I7 | 트리의 슬롯마다 살아 있는 인스턴스가 정확히 하나다 | 아래 표 | [ARCHITECTURE.md](./ARCHITECTURE.md) 「계측 계약」 |

- I2는 스타일 속성 문자열로 검사하지 않는다. 브라우저가 `outline` 축약형을 직렬화하는 순서가 소스와 다를 수 있다. 개별 프로퍼티(`style.opacity`, `style.outlineStyle`)로 읽는다.
- I2·I5가 함께 깨지고 I1은 통과하는 조합은 「stale preview 판정 규칙」의 시그니처다.

### I7의 적용 범위

I7은 슬롯에 **해당 계측이 있을 때만** 그 항목을 검사한다.

| 검사 | 적용 대상 | 조건 |
|---|---|---|
| host 프레임 | `window.__fc.frames`에 키가 있는 슬롯 (PanelFrame이 있는 슬롯). `bare-*`에는 PanelFrame이 없으므로 적용하지 않는다 | `frameMounts - frameUnmounts === 1` |
| 내용 | 메인 프레임 `window.__mfe`에 키가 있는 슬롯 (프로브가 있는 슬롯). `nav`처럼 내용 프로브가 없는 슬롯에는 적용하지 않는다 | `mounts - unmounts === 1`. `kind: 'mount'`는 `rootsAlive === 1`도 본다 |
| iframe | `kind: 'iframe'`인 슬롯 | `[data-tree-root] iframe[data-testid="iframe-<slot>"]`이 정확히 1개이고, 그 슬롯의 문서가 정확히 1개 읽힌다 |

### 허용 목록

모든 불변식에 **시나리오별 허용 목록**이 있다. I6만의 기능이 아니다.

```ts
type AllowList = { [id in 'I1' | 'I2' | 'I3' | 'I4' | 'I5' | 'I6' | 'I7']?: Array<string | RegExp> };
// 예 (R16, orders origin 차단): { I6: [/127\.0\.0\.1:4301/], I7: ['orders'] }
```

- 항목은 위반 내용의 식별자(슬롯, 패널 id)나 메시지와 대조한다. 허용된 위반은 `allowed`에 적히고 `pass`를 깨뜨리지 않는다.
- 허용 목록은 스펙 파일 안에 이유 주석과 함께 적는다. 관찰한 뒤 결과를 통과시키려고 늘리지 않는다. 예측된 위반을 기록하는 시나리오는 허용 목록이 아니라 관찰로 남긴다.
- S5(0.5.1 양성 대조)는 I1·I2가 **실패해야** 통과한다. S5를 처음 실행할 때, 드래그 중 스냅샷으로 `:4390`에서도 I1·I2의 선택자가 드래그 상태를 잡는지 먼저 확인한다. 0.5.1 번들의 속성·스타일 값이 지금 소스와 같은지는 확인하지 않았다.

---

## stale preview 판정 규칙

가설 H-RAF-STALE(상세는 [HYPOTHESES.md](./HYPOTHESES.md))에 대한 판정 규칙이다. 메커니즘은 코드 리딩 결과이고 **미실행**이다.

### 메커니즘

1. 패널마다 rAF 스케줄러가 하나 있다 (`PanelNodeRenderer.tsx:43-44`). `dragover`는 그 스케줄러로 미리보기 갱신을 예약한다 (`:103-106`).
2. `drop`(`:111-128`)도 `finishDrag`(`TreeLayout.tsx:80-83`)도 이 예약을 취소하지 않는다. 터치 경로는 취소한다 (`useTouchDrag.ts:175`).
3. Playwright의 `mouse.up`은 드래그 중에 CDP `drop`을 보내고, Chromium은 이를 `dragover` → `drop` → `dragend`로 **연달아** 처리한다 (https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/input_handler.cc).
4. 그 마지막 `dragover`가 **소스가 아닌 드롭 가능한 패널**에 떨어지면 rAF가 예약되고, `finishDrag` 뒤에 실행돼 드래그가 없는데도 미리보기를 설정한다 (`src/hooks/useDropPreview.ts:22-26`). 다음에 어떤 `drop`이 루트에 닿으면 그 미리보기가 커밋될 수 있다 (`TreeLayout.tsx:136-143`).
5. 마지막 `dragover`가 **소스 자신의 shadow 패널**에 떨어지면 핸들러는 예약 전에 끝난다 (`PanelNodeRenderer.tsx:94`). 잠긴 패널이면 `:98-101`에서 끝난다.

따라서 결과를 좌우하는 변수는 **릴리스 순간 커서 아래에 무엇이 있는가**다. 릴리스 전에 얼마나 오래 settle했는지가 아니다.

### 규칙

| 항목 | 내용 |
|---|---|
| 시그니처 | 릴리스 뒤 **I1은 통과**하고 **I2 또는 I5가 실패**하며, `underCursorAtDrop === 'other-droppable'`이고, 이벤트 로그에서 그 패널의 마지막 `dragover`가 `drop`/`dragend`와 한 프레임(약 17ms) 안에 있다 |
| 기본 릴리스 | `overShadow`. 마지막 dragover가 소스 shadow에 떨어지므로 구조적으로 경합이 없다. 모든 커밋 측정이 이 모드를 쓴다. Escape와 잠긴 패널 위 릴리스는 예약하는 dragover를 보내지 않으므로 settle 뒤에는 깨끗해야 한다 |
| 한 번만 특성화 | 스파이크 **S8**에서 bare 패널로 릴리스 모드 × 커서 아래 분류별 10회씩 놓고 비율표를 `doc/qa/run00-spike/SPIKE.md`에 기록한다. `overShadow`는 0이 예상값이다. S8의 통과 조건은 [BRIEF-1-build.md](./BRIEF-1-build.md) 「스파이크 표」에 있다 |
| 비율의 의미 | `immediate` 모드의 비율은 하네스가 만든 값이다. 사용자 체감 빈도로 인용하지 않는다 |
| 발견은 1건 | 분류 `library-bug`, `harness_amplified: true`. 경합은 실제로 존재하고, 하네스가 빈도를 키웠다는 뜻이다 |
| 중복 처리 | 이후 릴리스 뒤 실패가 시그니처와 일치하면 새 발견을 만들지 않고 그 발견의 `dup_of`로 표시한다. 그 제스처 구간의 카운터 변화량은 `contaminated`로 표시하고 `overShadow`로 다시 측정한다 |
| 시그니처 밖 | `underCursorAtDrop === 'source'`인데 stale preview가 남거나, Escape·잠긴 패널 릴리스 뒤에 남으면 시그니처와 다르다. **새 발견 후보**로 다룬다 |

- R08은 이 stale 상태를 `immediate` 릴리스로 일부러 만들고 그 후속 영향을 본다. 비율은 S8의 값을 재사용한다.

---

## 알려진 하네스 부작용

아래 현상은 입력 방식(CDP, headless)이나 하네스 자체에서 나온다. **라이브러리 버그로 보고하지 않는다.** 결과가 이 현상에 의존하면 분류는 `harness-artifact`다. 요약본은 [../README.md](../README.md)에 있고 이 표가 전체 목록이다. 근거는 소스 리딩이며 미실행이다.

| # | 현상 | 라이브러리 버그가 아닌 이유 | 대응 |
|---|---|---|---|
| 1 | Escape로 취소하면 `dragend`만 오고 `dragleave`가 없다 | Playwright의 취소는 CDP `dragCancel`이고, Chromium은 소스 쪽 종료만 처리한다 (https://github.com/microsoft/playwright/issues/33853). 실제 브라우저는 `dragleave`를 보낸다 | 그 `dragleave`의 유무에 의존하는 차이는 `harness-artifact`. 라이브러리는 `dragend`로 정리하므로 취소 자체는 검증할 수 있다 |
| 2 | 커서를 멈추고 있으면 `dragover`가 오지 않는다 | 실제 브라우저는 멈춘 커서에도 약 350ms(±200ms)마다 `dragover`를 보낸다 (https://html.spec.whatwg.org/multipage/dnd.html). Playwright는 `mouse.move` 때만 보낸다 | `nudge()`로 흉내 내고 `emulated` 라벨을 붙인다 |
| 3 | `mouse.up`이 `dragover` + `drop` + `dragend`를 연달아 보낸다 | CDP `drop` 처리 순서다. 사람의 릴리스보다 rAF 경합을 훨씬 자주 건드린다 | 「stale preview 판정 규칙」. `harness_amplified` |
| 4 | OS 커서 모양(`not-allowed`)을 볼 수 없다 | headless에는 커서가 없고, 드래그 인터셉트 아래에서는 OS 드래그가 시작되지 않는다 | 대체 지표: `dragend`의 `dataTransfer.dropEffect`와 `drop`의 부재. 커서 모양은 수동 확인 항목 |
| 5 | 리사이즈 중 `mousedown`·`mousemove`·`mouseup`이 없다 | Resizer가 `pointerdown`을 취소한다 (`useDragResize.ts:20`). 브라우저는 그 뒤 릴리스까지 호환 마우스 이벤트를 내지 않는다. 표준 동작이다 | 포인터 이벤트와 `gotpointercapture`로 판정한다 |
| 6 | 드래그 중 `mousemove`·`mouseup`·`pointerup`이 없다 | 드래그가 인터셉트되면 Playwright는 이동마다 `dragOver`만, `mouse.up`에는 `drop`만 보낸다 (crDragDrop.ts, crInput.ts) | 드래그 구간의 마우스 이벤트 부재를 결함으로 보지 않는다 |
| 7 | cross-origin iframe 위에서는 CDP 드래그 이벤트가 **어느 문서에도 오지 않는다**(S9 관찰: `telemetry`(same-site)·`telemetry-x`(cross-site) 모두. host 패널도, iframe 문서의 프로브·`seen`도 0). same-origin `control-iframe`(srcdoc) 위에서는 iframe 문서에 dragenter/dragover가 온다 | 인터셉트된 드래그(`Input.dispatchDragEvent`)의 프레임 전달 방식 때문으로 추정한다. 실제 브라우저는 iframe 문서로 dragover를 보낼 것이다 | `telemetry`·`telemetry-x` 위 마우스 드래그 관찰에는 하네스 충실도 단서를 붙인다. `control-iframe`과 결과가 다르면 이 부작용부터 의심한다 |
| 8 | 터치 드래그 중 같은 `data-testid`가 두 개 있다 | ghost가 패널을 통째로 복제한다 (`useTouchDrag.ts:60-61`). 중복 자체는 하네스의 질의 문제다 | 질의를 `[data-tree-root]` 아래로 한정한다. 복제의 부작용(iframe 문서 추가 로드 등)은 H-GHOST-CLONE으로 따로 관찰한다 |
| 9 | 스크린샷에 resizer가 보이지 않는다 | 기본값이 hover 때만 보이는 설정이다 (`resizerConstants.ts:5`, `resizerStyles.ts:19-20`) | 존재 여부는 `.ftl-resizer` 개수와 rect로 확인한다 |
| 10 | 첫 이동이 4px 미만이면 드래그가 시작되지 않는다. 이동 한 번으로는 `dragover`가 없다 | Blink의 드래그 임계값과 Playwright의 동작이다 (https://playwright.dev/docs/input) | `begin`의 6px 이동과 이후 `teleport`를 쓴다. 직접 `mouse.move`를 조합하지 않는다 |
| 11 | `pointerdown`을 취소하는 내용 위에서는 Playwright가 드래그 시작을 감지하지 못한다 | Playwright의 감지는 `mousemove` DOM 이벤트에 의존하는데, `pointerdown` 취소는 그 이벤트를 막는다 | 그런 내용에서 "드래그가 시작되지 않음"은 실제 마우스로 확인하기 전까지 `harness-artifact` 후보다 |
| 12 | `settle` 전에 읽은 카운터가 ±1 어긋난다 | 읽는 시점 문제다 | `settle`의 `stable`을 확인한다. `unsettled` 구간은 다시 측정한다 |
| 13 | 터치 결과가 실기기와 다를 수 있다 | CDP 터치 에뮬레이션, headless다. 실기기가 아니다 | 「증거와 라벨」의 필수 문장을 붙인다. 실기기 확인은 수동 항목 |
| 14 | 터치 결과가 Chromium 메이저에 따라 다르다 | 터치 시작 네이티브 드래그가 153에서 on, 141에서 off다 | `native_touch_drag` 라벨을 남긴다. 레인 B의 롱프레스 중 네이티브 `dragstart`는 부작용이 **아니라** H-TOUCH-NATIVE-RACE의 관찰이다 |
| 15 | 프로브가 리스너와 `MutationObserver`를 추가한다 | 수동적이지만 타이밍에 영향을 줄 수 있다 | 놀라운 결과는 `test.use({ probe: false })`로 다시 실행한다 |
| 16 | headless shell과 풀 Chromium의 동작이 같다는 보장이 없다 | 같다는 것은 추론이다 | S10으로 비교했다(B1-03f): S1~S3의 축소 이벤트 로그가 같았다. 풀 바이너리는 `/favicon.ico`를 요청하므로 픽스처 HTML에 빈 favicon을 둔다 |
| 17 | 드래그 중 대상 요소가 바뀌는 이동 한 번은 `dragover`를 만들지 않는다 | Blink가 대상 변경 갱신에서 dragover를 다음 갱신으로 미룬다(실제 브라우저도 같다. 사람은 계속 움직이므로 드러나지 않는다) | `teleport`가 같은 점으로 한 번 더 이동한다. 직접 `mouse.move`를 조합할 때 주의 |
| 18 | 첫 터치 이동이 작으면(12px) `touchmove`가 페이지에 오지 않는다 | Chromium의 touch slop 억제 | `handleDrag`가 24px로 한 번 더 움직인다. 8px 문턱(`useTouchDrag.ts:9`) 바로 위의 동작은 이 하네스로 볼 수 없다 |

환경 한계(`env-limit`)로 REPORT.md에 적는 것: OS 커서 모양, 실제 Android·iOS 터치, Firefox·WebKit, 쓰지 않은 Chromium 메이저의 터치 결과, 창 밖에서의 릴리스.

---

## 스펙 구성

스펙은 `mfa-lab/e2e/` 아래 네 폴더에 둔다. 폴더마다 **단언해도 되는 것**이 다르다.

| 폴더 | 누가, 언제 쓰는가 | 무엇을 단언하는가 | 빨간색의 의미 |
|---|---|---|---|
| `smoke/` | 세션 1. 구축 게이트마다 하나: `shell`, `billing`, `telemetry`, `orders`, `board`, `workbench` (B1-02, B1-04~B1-08) | 픽스처 상태: 모든 슬롯이 ready, 메인 프레임과 iframe 안의 카운터를 읽을 수 있음, `reactSame`이 same-tree는 `true`·mount는 `false`, `[data-ftl-styles]`(`resizerStyles.ts:10`) 존재와 resizer 커서 적용, 콘솔 에러 0, remote origin을 막아도 대조군 레이아웃이 뜸 | 픽스처나 서버가 깨졌다 |
| `spike/` | 세션 1. `S0`~`S10` (B1-01, B1-03a~f, B1-05) | 하네스의 충실도: 신뢰된 이벤트 순서, 미리보기 `domTree`, 불변식, 리사이즈의 방향과 3px 오차. **S5는 0.5.1 빌드에서 I1·I2가 실패하는 것을 단언한다.** S7b와 S9는 기록 전용이라 라이브러리 동작을 단언하지 않는다 | 하네스나 픽스처를 아직 믿을 수 없다. S5가 실패하지 않으면 중단 조건이다 |
| `explore/` | **세션 2.** `r01`~`r19`와 P1. 시나리오 하나씩, 실행 직전에 쓴다 | **하네스 전제만**: 서버가 떠 있음, 신뢰된 `dragstart`를 봄, 시작 상태가 기대와 같음, 미리보기 `domTree`가 기대와 같음. **라이브러리 동작은 단언하지 않고 관찰로 기록한다** (`writeObservation`) | 하네스나 픽스처 문제다. 초록색은 "관찰을 얻었다"는 뜻일 뿐 "버그 없음"이 아니다 |
| `regression/` | 세션 2가 발견을 확정할 때마다 하나. 파일명 `fc-qa-NNN-<slug>.spec.ts`. 수정 세션이 `test.fail()`을 제거한다 | **이상적인 동작**(오라클)을 단언한다. 이상 동작 단언은 이 폴더에만 둔다 | `test.fail()` 아래에서 "예상과 달리 통과"로 빨개지면 수정이 들어갔다는 신호다 |

### 규칙

- **explore 스펙은 라이브러리 동작을 단언하지 않는다.** 예측이 맞든 틀리든 스펙은 초록이어야 하고, 판정은 관찰 JSON을 사전 등록 표([BRIEF-2-inspect.md](./BRIEF-2-inspect.md) 「기대와 예측」)와 비교해서 사람이 읽을 수 있게 남긴다. 이렇게 해야 빨간 explore 테스트가 항상 "하네스 문제"를 뜻한다.
- 미리보기 `domTree`가 기대와 다르면 먼저 `dropPoint`와 좌표를 의심한다. 좌표가 맞는데도 다르면 전제 단언을 관찰로 바꾸고 [../README.md](../README.md)의 귀속 사다리로 넘긴다.
- **회귀 스펙의 형태** (미실행):

```ts
test('FC-QA-NNN <증상 한 줄>', { annotation: { type: 'issue', description: 'FC-QA-NNN' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  // 최소 재현 절차 + 이상 동작 단언
});
```

  `test.fail()`은 "실패해야 하는 테스트"로 표시한다. 버그가 있는 동안 스위트는 초록이고, 수정이 들어가 테스트가 통과하면 Playwright가 실패로 보고한다 (https://playwright.dev/docs/api/class-test#test-fail). 그때 `test.fail()`을 제거한다. 절차는 [../FIXING.md](../FIXING.md)에 있다.
- 한 발견에 회귀 스펙 하나, 한 근본 원인에 발견 하나다.
- 스파이크 스펙은 구축 뒤에도 하네스의 자기 검사로 다시 실행한다. 언제 어떤 것을 다시 돌리는지는 [BRIEF-1-build.md](./BRIEF-1-build.md) 「단계」와 [BRIEF-2-inspect.md](./BRIEF-2-inspect.md) 「사전 점검」이 정한다.
- 시나리오의 각 케이스는 깨끗한 컨텍스트에서 2회 실행한다. 절차는 [BRIEF-2-inspect.md](./BRIEF-2-inspect.md) 「시나리오 반복 절차」에 있다.
- Playwright MCP와 CLI는 써도 되는 둘러보기 도구일 뿐이다. 그 결과는 증거가 아니다. 이상한 것을 봤으면 explore 스펙으로 재현한 뒤에만 발견으로 올린다. `.mcp.json`은 추가하지 않는다.

---

## 증거와 라벨

### 저장 위치

| 종류 | 경로 | git |
|---|---|---|
| 원본 산출물 (스크린샷, 스냅샷, 이벤트 로그, `results.json`) | `mfa-lab/e2e/.artifacts/<spec>/<case>/` | 무시 |
| trace, 실패 시 산출물 | `mfa-lab/e2e/test-results/` | 무시. **커밋하지 않는다** |
| 관찰 JSON | `doc/qa/<run>/obs/<case>-run<N>.json` (`writeObservation`이 쓴다. 예: `doc/qa/run01-tier1/obs/R01-hover-run1.json`) | 커밋 |
| 발견의 증거 (선별본) | `doc/qa/<run>/evidence/FC-QA-NNN/` | 커밋 |

### 발견 하나의 증거 묶음

- `01-before.png`, `02-mid.png`, `03-after.png` (제스처 전, 도중, 후)
- `events.json` (프로브 덤프), `tree-before.json`, `tree-after.json` (스냅샷. `promote`가 `01-before.snapshot.json`·`03-after.snapshot.json`의 이름을 바꿔 만든다), `console.txt`
- 카운터 변화량 (`diff` 결과)

### 한도

- 발견당 이미지 **최대 6장**. 1280x800, device scale 1.
- 뷰포트 전체보다 **요소 스크린샷**을 우선한다.
- JSON 로그는 **제스처 구간**(`begin` 직전부터 릴리스 뒤 `settle`까지)으로 잘라낸다.
- trace와 동영상은 커밋하지 않는다.
- 증거는 `promote`로만 옮긴다. 손으로 복사하면 한도와 잘라내기가 빠진다.

### 스크린샷은 직접 열어 본다

- Claude는 발견마다 **적어도 제스처 도중 PNG(`02-mid.png`)를 Read 도구로 열어** 스냅샷과 대조한다.
- 대조 항목: shadow 패널(점선 테두리, 반투명)이 `dom.domTree`가 말하는 위치에 있는가. 패널 수와 배치가 `dom.panels`의 rect와 맞는가. 터치라면 ghost가 `dom.ghosts`의 위치에 있는가. 헤더의 `status-<slot>` 배지 숫자가 `counters`와 같은가. 잘림·넘침·에러 카드가 있는가.
- 스크린샷과 스냅샷이 어긋나면 둘 다 증거로 남기고 원인을 먼저 찾는다. **스크린샷만으로 발견을 확정하지 않는다.** 스냅샷만으로도 확정하지 않는다.

### 라벨

모든 관찰 JSON과 발견의 front matter에 아래 값을 적는다.

| 키 | 값 | 출처 |
|---|---|---|
| `input` | `mouse` \| `touch-cdp-handle` \| `touch-cdp-longpress` | 쓴 헬퍼 |
| `browser` | `chromium-<major> headless-shell` (예: `chromium-153 headless-shell`) | `browser.version()`, `lane.json` |
| `playwright` | 버전 (예: `1.63.0`) | `lane.json` |
| `native_touch_drag` | `on` \| `off` | Chromium 메이저 (153 → `on`, 141 → `off`). 터치가 아니어도 적는다 |
| `library_tree`, `library_commit` | `git rev-parse HEAD:src`, `git rev-list -1 HEAD -- src` | `window.__fc.lib` |

- **터치 결과에는 다음 문장을 그대로 붙인다**: `Chromium CDP touch emulation, headless; not a real device`
- `nudge`를 쓴 결과에는 `emulated: 'stationary-dragover'`를, stale preview 시그니처와 일치하는 결과에는 `harness_amplified: true`를 붙인다.
- `touch` 프로젝트에서 얻은 마우스 결과에는 프로젝트 이름도 적는다 (`hasTouch`가 켜진 컨텍스트다).
- OS 커서 모양, 실제 Android·iOS 터치, Firefox·WebKit은 REPORT.md에 `env-limit` 항목으로 적고 수동 확인 목록에 넣는다.
