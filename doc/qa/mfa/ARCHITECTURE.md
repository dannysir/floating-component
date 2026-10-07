# MFA 검수 랩 아키텍처 (Harbor Workbench)

> **이 문서는** `@dannysir/floating-components`를 마이크로 프론트엔드(MFA) 환경에서 검수하기 위한 랩 `mfa-lab/`의 설계 기준이다.
> 클라우드 세션 1(구축)이 이 문서대로 만들고, 클라우드 세션 2(검수)와 이후 수정 세션이 이름·포트·계측 필드를 여기서 찾는다.
> 설정 파일 전문은 [RECIPES.md](./RECIPES.md), 가설은 [HYPOTHESES.md](./HYPOTHESES.md), 하네스는 [HARNESS.md](./HARNESS.md), 작업 순서는 [BRIEF-1-build.md](./BRIEF-1-build.md)·[BRIEF-2-inspect.md](./BRIEF-2-inspect.md), 판정 규칙은 [../README.md](../README.md)가 맡는다.
> **상태 (2026-10-07)**: 세션 1이 이 설계대로 `mfa-lab/`을 구축하고 실행했다(실행 확인: 40ac74c). 실제와 다른 점과 확인한 사실은 아래 「B1-08 구축 결과」에 모았다. 그 절과 본문이 다르면 그 절이 실제다. 2차 백로그는 여전히 설계다.

---

## B1-08 구축 결과 (2026-10-07, 세션 1)

실행 확인: 40ac74c. 깨끗한 상태(`mfa-lab/` 아래 `node_modules`·`dist*`·`.run/` 삭제)에서 `node mfa-lab/scripts/ctl.mjs up` 한 번(39초: install 17.7초, build 17.2초)으로 6개 서버(4300, 4390, 4301~4304)가 뜨고 `ctl smoke`가 통과했다. `ctl test smoke` 연속 3회 초록(19 passed, 1 skipped = `EXPECT_ORDERS_STAMP`가 있어야 도는 (c) 케이스).

| 항목 | 실제 |
|---|---|
| 앱 | shell, mfe-orders, mfe-board, mfe-billing, mfe-telemetry 전부 구축. blocked 변형 없음 |
| Module Federation | `MF: on`, 기본 설정 단(매니페스트 URL 문자열 remotes, 짧은 키 React 네 키 싱글턴 공유, `React.lazy` 동적 import). `shareStrategy: 'loaded-first'` — `:4301`을 막아도 `census`는 remote 요청 없이 뜨고 `workbench`는 `error-orders`만 그린다(B1-06 (b)). `:4302` 차단도 같다(B1-07) |
| MF 매니페스트 | 최상위 `id, name, metaData, shared, remotes, exposes`. `exposes[0] = { id: 'orders:Panel', name: 'Panel', assets }`, `metaData.remoteEntry = { name: 'remoteEntry.js', path: '', type: 'module' }`, `shared`에 react·react-dom 19.2.4 singleton. `ctl smoke`는 `name`과 `exposes`에 `Panel`이 있는지 본다 |
| 독립 배포 | `LAB_BUILD_STAMP=deploy-2 ctl build --only mfe-orders` → `ctl stop --only mfe-orders` → `ctl serve` 뒤 shell 재빌드 없이 `__mfe.orders.build === 'deploy-2'`, shell `harbor-app` buildId 불변 |
| React 정체성 | `reactSame`: orders·board·twin·control·control-mount `true`, billing `false`, 단독 페이지 `null` |
| iframe | `localhost:4304`가 브라우저 안에서 열린다(`crosssite.test` 대안 불필요). cross-site iframe의 `sessionStorage` 사용 가능. OOPIF는 Chromium 인자 `--site-per-process`가 있어야 생긴다(하네스 설정에 넣음). cross-origin iframe 위의 CDP 마우스 드래그 이벤트는 어느 문서에도 오지 않는다(HARNESS 부작용 #7) |
| `ctl.mjs` | `lib/buildinfo.mjs`(`.run/build.json`·준비 판정 대상)가 더 있다. `build`의 `--mf` 기본값 = `mfa-lab/mf-mode.json`의 `mf`(있을 때. MF degraded 기록용, 지금은 없음) → 없으면 그 앱 `package.json`에 `@module-federation/vite`가 있으면 `on`. `--lib npm051`은 `shell-051`만 빌드. `LAB_BUILD_STAMP` 환경 변수나 `--stamp`·`--only`가 있으면 항상 빌드. `up`은 `.run/durations.json`을 쓴다. 종료 코드: BLOCKED-LANE 3 |
| detached 서버 | 새 Bash 호출에서도 살아 있다(`ctl status` alive·ready). `serve --foreground`는 쓰지 않았다 |
| `vite preview`와 재빌드 | 같은 outDir을 다시 빌드하면 떠 있는 preview가 새 파일을 그대로 서빙했다(`harbor-app` buildId가 새 값으로 바뀜). `serve`는 buildId가 다르면 프로세스를 다시 띄운다 |
| 픽스처 수정 | 모든 HTML에 빈 favicon(`<link rel="icon" href="data:,">`). `PanelFrame`·`Bare` 배지가 첫 마운트를 반영하도록 구독 뒤 한 번 다시 그린다 |
| mfe-board `dnd` 필드 | `cardMoves`(카드 이동 성공), `zoneDrops`(열이 받은 drop, 타입 무관), `copyDrops`(copy 존이 받은 copy 드롭), `lastDragend`(board 안에서 시작한 드래그의 dragend `dropEffect`·`effectAllowed`), `lastTypes`(board 존의 마지막 dragover/drop types) |
| 타입 검사 | 하지 않았다(게이트 아님) |

## 제품 개요

**Harbor Workbench**는 가상의 물류 콘솔이다. 플랫폼 팀이 소유한 shell이 `@dannysir/floating-components`로 패널 레이아웃을 그리고, 팀별 remote가 패널 내용을 공급한다. 검수 대상은 라이브러리이고, Harbor Workbench는 라이브러리가 실제 MFA 안에서 겪을 상황을 만드는 픽스처다.

용어:

| 용어 | 뜻 |
|---|---|
| MFA | 마이크로 프론트엔드 아키텍처. 한 화면을 팀별로 따로 빌드·배포한 앱들로 조립하는 방식 |
| host / shell | 화면의 틀을 소유하고 다른 팀의 앱을 불러와 배치하는 앱. 이 랩에서는 `apps/shell` |
| remote | shell이 런타임에 불러오는 팀별 앱. 이 랩에서는 `apps/mfe-*` |
| 컨테이너 유형 | remote가 패널 안에 들어가는 방식. `same-tree`(host와 같은 React 트리), `mount`(별도 React 루트), `iframe` |
| 슬롯(slot) | 패널에 들어가는 내용의 이름. 라이브러리의 `componentKey`와 같은 값이고, `window.__mfe`의 키이자 모든 `data-testid`의 접두/접미에 쓰인다 |
| 패널 id | 레이아웃 트리에서 `PanelNode.id`. 슬롯과 다를 수 있다(예: 패널 `p-a`에 슬롯 `orders`) |
| 대조군 | remote 없이 같은 조건을 만드는 랩 전용 패널(bare, control, twin, 컨테이너 대조군) |
| 계측 | 검수를 위해 넣은 카운터·로그·testid. 제품 기능이 아니다 |
| 미실행 | 실행해 보지 않은 설계·예측이라는 표시 |

```
            브라우저 한 탭 (http://127.0.0.1:4300)
┌──────────────────────────────────────────────────────────────┐
│ shell (Workspace Platform)   top bar: layout · lib · MF · chip │
│ ┌──────────────────────── TreeLayout ───────────────────────┐ │
│ │ nav  │ orders        │ board        │ billing             │ │
│ │(잠금)│ same-tree(MF) │ same-tree(MF)│ mount(별도 React)   │ │
│ │      │ :4301         │ :4302        │ :4303               │ │
│ │      │               ├──────────────┴─────────────────────┤ │
│ │      │               │ telemetry (iframe, 127.0.0.1:4304)  │ │
│ │      │               │ telemetry-x (iframe, localhost:4304)│ │
│ └──────┴───────────────┴─────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

가상 팀과 소유 범위:

| 팀 | 소유 | 역할 |
|---|---|---|
| Workspace Platform | `apps/shell`, `contract`, `registry.json` | 레이아웃(라이브러리의 유일한 소비자), 패널 프레임(헤더 = 드래그 핸들), 패널별 로딩·에러 경계, 디자인 토큰, 버스, 통합 계약 |
| Order Desk | `apps/mfe-orders` | 주문 검색과 주문 표. 자기 origin에서 자기 주기로 배포 |
| Fulfilment | `apps/mfe-board` | 출하 칸반. 카드에 HTML5 드래그 앤 드롭을 직접 쓴다 |
| Billing | `apps/mfe-billing` | 청구서 편집기. 런타임 의존성 공유를 거부하고 `mount`/`unmount` 계약으로만 통합 |
| Telemetry | `apps/mfe-telemetry` | 다른 스택(바닐라 TS)의 대시보드. iframe으로만 통합 |
| QA | `e2e` | Playwright 하네스 |

바꿀 수 없는 제약(위반하는 설계·구현은 잘못된 것이다):

- 모든 것은 이 저장소 `mfa-lab/` 아래에 두고 푸시한다. 클라우드 VM은 현재 브랜치의 GitHub 원격만 clone한다.
- 프로젝트마다 자기 `package.json`·`package-lock.json`·빌드 결과·origin을 가진다. npm workspaces는 쓰지 않는다.
- 루트 `package.json`, 루트 `package-lock.json`, `src/`, 루트 `tsconfig.json`, 루트 `vite.config.ts`는 수정하지 않는다.
- 검수 대상 라이브러리는 **브랜치 소스**다. shell만 `@dannysir/floating-components`를 `<repo>/src/index.ts`로 alias한다. 루트 `dist/`는 git에서 무시되고, npm 0.5.1에는 패널 잠금과 dragend 수정이 없다.
- 판정에 쓰는 실행 모드는 전부 `vite build` + `vite preview`(prod)다. 이유는 「실행 모델」 참고.
- 버전은 정확히 고정한다(caret 없음): React 19.2.4, react-dom 19.2.4, Vite 7.3.6, `@vitejs/plugin-react` 5.1.2, `@module-federation/vite` 1.23.0. `@vitejs/plugin-react` 5.x는 Vite 4.2~7만 지원하고 6.x는 Vite 8만 지원한다(https://registry.npmjs.org/@vitejs/plugin-react/5.1.2). `@module-federation/vite`는 2026년 9월에만 8번 릴리스됐고 React 싱글턴 관련 수정이 많아 정확히 고정한다(https://github.com/module-federation/vite/releases).

---

## 제품과 랩 계측

문서와 코드에서 "제품"과 "랩 계측"을 구분한다. 제품은 실제 조직이 만들 법한 것이고, 랩 계측은 검수 결과를 라이브러리·픽스처·하네스 중 어디에 귀속할지 가리기 위해 넣은 것이다.

| 구분 | 구성 요소 |
|---|---|
| 제품 | shell(상단 바, 워크스페이스, `PanelFrame`, 어댑터 3종, `nav` 패널), remote 4개(`orders`, `board`, `billing`, `telemetry` — telemetry는 두 origin으로 두 번 임베드), `contract`(타입·버스), 버스, `registry.json`, `workbench` 레이아웃 |
| 랩 계측 | 대조군 슬롯(`bare-0..3`, `control-a..d`, twin `orders-local`·`board-local`·`billing-local`, 컨테이너 대조군 `control-iframe`·`control-mount`), 프로브(`createProbe`, `window.__fc`, `window.__mfe`, 하네스가 주입하는 `window.__probe`), 계약이 강제하는 프로브 표면(input·scroll·counter), ext-chip, URL 플래그(`layout`, 슬롯 지정, `drag`, `lock`, `iframeShield`, `persist`, `strict`), 측정용 레이아웃(`census`, `locks`, `row3`, `pair`), npm 0.5.1 baseline 빌드(:4390), 빌드 스탬프 |

### 실제 MFA와 다른 점

| 항목 | 실제 MFA | 이 랩 | 이유 |
|---|---|---|---|
| remote 등록 | 런타임 레지스트리 서비스나 배포 매니페스트 조회 | `registry.json`을 shell 빌드 때 정적으로 읽어 federation `remotes`를 만든다 | 변수를 줄인다. 런타임 `registerRemotes`/`loadRemote`는 1.23.0에서 확인하지 않았다 |
| 배포 위치 | 팀별 도메인·CDN | 한 머신의 포트 4300~4304. cross-site는 `127.0.0.1`과 `localhost`의 차이로 만든다 | 클라우드 VM 한 대에서 돌린다 |
| 저장소 | 팀별 저장소와 CI | 한 저장소 안의 독립 디렉터리 | 클라우드 세션은 저장소 하나만 clone한다 |
| 독립 배포 | 팀별 파이프라인 | 스모크 한 번으로 확인: `mfe-orders`만 다시 빌드하고 shell은 그대로 둔 채 새 빌드 스탬프가 보이는지 본다(BRIEF-1 B1-06) | 파이프라인 대신 "shell 재빌드 없이 remote가 바뀐다"는 성질만 확인 |
| twin | 없음. shell은 remote 소스를 모른다 | shell이 remote의 소스를 alias(`@twin/*`)로 직접 번들한다 | "remote라서 생긴 현상"과 "내용 때문에 생긴 현상"을 가르는 대조군 |
| `--mf off` | 없음 | remote 지정자를 remote 소스로 alias해 빌드 타임 통합 | federation이 끝내 안 될 때의 최후 대안. `MF: degraded`로 기록하고 사용자가 인지해야 한다 |
| 계약 배포 | 버전이 있는 npm 패키지 | 소스 alias `@harbor/contract` | 설치·배포 단계를 없앤다 |
| 계약 내용 | 타입과 이벤트 | 타입과 이벤트에 더해 테스트용 위젯(프로브 표면)과 카운터를 강제 | 컨테이너 유형이 달라도 같은 조건으로 상태 유실을 비교 |
| React 버전 | 팀마다 다를 수 있다 | 전부 19.2.4 | "별도 루트"와 "다른 React 메이저"를 섞지 않는다. React 18은 2차 |
| 장애 | 지연, 부분 실패, 버전 불일치 | `page.route`로 origin 하나를 막는 한 종류 | 1차는 격리 여부만 본다 |
| 서버 | CDN과 캐시 정책 | `vite preview` | 캐시는 테스트마다 새 브라우저 컨텍스트로 피한다 |
| 인증·라우팅·공유 상태 | 있음 | 없음 | 레이아웃 라이브러리와 무관 |

---

## 앱 목록

| 프로젝트 | 팀 | 유형 | 스택 | origin |
|---|---|---|---|---|
| `mfa-lab/apps/shell` | Workspace Platform | host | React 19.2.4, Vite 7.3.6, `@vitejs/plugin-react` 5.1.2, `@module-federation/vite` 1.23.0(host 역할, B1-06에서 추가) | http://127.0.0.1:4300 (npm 0.5.1 baseline 빌드는 http://127.0.0.1:4390) |
| `mfa-lab/apps/mfe-orders` | Order Desk | `same-tree` (Module Federation remote, React 싱글턴 공유) | 같은 핀, MF 이름 `orders` | http://127.0.0.1:4301 |
| `mfa-lab/apps/mfe-board` | Fulfilment | `same-tree`, MF 이름 `board`, 네이티브 HTML5 DnD 칸반 | 같은 핀 | http://127.0.0.1:4302 |
| `mfa-lab/apps/mfe-billing` | Billing | `mount` (별도 React 루트, 플러그인 없는 ES 모듈 `mount(el, ctx)` / `unmount(el)`) | React 19.2.4를 번들에 포함, Vite lib 모드 | http://127.0.0.1:4303 |
| `mfa-lab/apps/mfe-telemetry` | Telemetry | `iframe` (바닐라 TypeScript) | Vite 앱 빌드 | http://127.0.0.1:4304 (슬롯 `telemetry`, same-site)와 http://localhost:4304 (슬롯 `telemetry-x`, cross-site). 서버는 하나 |
| `mfa-lab/contract` | Workspace Platform | React 없는 계약 소스 (`@harbor/contract` alias) | TypeScript만 | — |
| `mfa-lab/e2e` | QA | Playwright 하네스 | `@playwright/test`를 레인별로 고정 | — |

아래 "겨냥하는 가설"의 `H-*` 이름은 [HYPOTHESES.md](./HYPOTHESES.md)에 정의돼 있다.

### shell

| 항목 | 내용 |
|---|---|
| 상단 바 (트리 밖, 높이 40px 고정) | 레이아웃 이름(`topbar-layout`), 라이브러리 출처와 트리 해시 앞 7자(`topbar-lib`), MF on/off(`topbar-mf`), ext-chip 1개 |
| 워크스페이스 | `<main data-testid="workspace" data-theme="harbor">`, padding 12px. 그 안에 `TreeLayout` 하나(레이아웃 id `main`). padding은 `TreeLayout`의 `padding` prop이 아니라 바깥 wrapper에 준다. 따라서 padding 영역은 트리 루트 **밖**이다 |
| `NavPanel` (슬롯 `nav`) | 정적 메뉴 목록. `workbench` 레이아웃에서만 `nav-toggle-board` 버튼을 그린다: `panelIds`에 `board`가 있으면 `removePanel('board')`, 없으면 `insertPanel({ panel: { id: 'board', componentKey: 'board' }, at: { anchorId: 'billing', position: 'left' } })`(`billing`이 없으면 `at` 생략 = 루트 끝에 추가). 프로브 없음 |
| `ControlPanel` (슬롯 `control-a..d`) | 텍스트 input, 100행 스크롤 목록, 카운터 버튼. 프로브 등록 |
| `Bare` (슬롯 `bare-0..3`) | `PanelFrame` 없는 div. 인라인 `[data-drag-handle]`(`data-testid="handle-bare-<n>"`), input(`bare-<n>-input`), 마운트 수 표시(`status-bare-<n>`). 프로브 등록 |
| ext-chip | `<span draggable="true" data-testid="ext-chip">`. dragstart에서 `setData('application/x-harbor-chip', '1')`만 하고 `effectAllowed`는 건드리지 않는다. remote가 소유하지 않는 유일한 비패널 드래그 소스다 |
| 겨냥하는 가설 | 모든 가설의 대조군. 직접: H-REMOUNT·H-REINSERT(bare/control에서 재현되면 MFA 탓이 아니라 라이브러리 탓), H-DRAGEND, H-RAF-STALE과 그 후속 영향(ext-chip 드롭이 stale 미리보기를 커밋), 잠금 동작, H-RESIZE, remote 코드 없이 H-DROP-HIJACK |
| 계측 | `window.__fc` 전체(「계측 계약」). testid: `shell-root`, `topbar`, `workspace`, `ext-chip`, `shell-error`, `nav-toggle-board`, 패널 프레임 testid(「패널 프레임과 경계」) |
| 빌드 요점 | 라이브러리 alias → `<repo>/src/index.ts`, `@harbor/contract` alias, `@twin/*` alias, `resolve.dedupe ['react','react-dom']`, `server.fs.allow [repoRoot]`, `build.target 'chrome89'`, `host '127.0.0.1'` + `strictPort`. 전문은 [RECIPES.md](./RECIPES.md) |

ext-chip이 `effectAllowed`를 두지 않는 이유: 패널의 dragover 핸들러는 어떤 드래그든 먼저 `preventDefault`하고 `dropEffect`를 `"move"`로 쓴다(`src/components/PanelNodeRenderer.tsx:85-86`). chip이 `effectAllowed = 'copy'`를 주면 브라우저가 드롭을 거부해 R08(b)(stale 미리보기 커밋 확인)가 성립하지 않는다.

### mfe-orders

| 항목 | 내용 |
|---|---|
| 노출 | `./Panel` → named export `Panel: ComponentType<PanelProps>`. `/mf-manifest.json`, `/remoteEntry.js` 제공. `/`는 같은 `Panel`을 레이아웃 없이 그리는 단독 페이지(대조 실험용) |
| 내용 | 프로브 표면(텍스트 input, 자체 스크롤 컨테이너 안의 200행 주문 표, 카운터 버튼) + 주문 검색 폼(select, checkbox). 표는 `min-width: 480px`. 행을 클릭하면 버스에 `order:selected`를 발행 |
| 겨냥하는 가설 | H-REMOUNT(split 키가 밀리거나 부모가 바뀌면 input·카운터·scrollTop 초기화), H-REINSERT(상태는 남고 스크롤·포커스만 유실), H-BOUNDARY(origin을 막으면 이 패널에만 에러 카드). React 싱글턴은 스모크의 `reactSame === true`로만 확인 |
| 계측 | `window.__mfe[slot]` (kind `same-tree`, `reactSame` 기대값 `true`). testid: `<slot>-input`, `<slot>-scroll`, `<slot>-counter`, `<slot>-select`, `<slot>-row-<n>`(n = 0..199) |
| 빌드 요점 | federation remote: `name 'orders'`, `filename 'remoteEntry.js'`, `manifest: true`, `dts: false`, `base` = 절대 origin, `server.origin`, `build.target 'chrome89'`, `shareStrategy 'loaded-first'`. `.css` 파일 없음. 항상 `vite build` + `vite preview` |

### mfe-board

| 항목 | 내용 |
|---|---|
| 노출 | mfe-orders와 같은 모양. MF 이름 `board` |
| 내용 | 프로브 표면 + 3열 칸반(카드 6장, 열마다 2장). 카드는 `draggable`, dataTransfer 타입 `application/x-harbor-card`. 열은 그 타입일 때만 dragover를 `preventDefault`하고 `dropEffect = 'move'`. 인라인 SVG `<img>` 1개, `<a href>` 1개, copy 전용 쌍 1개(소스 `effectAllowed = 'copy'`, 타입 `application/x-harbor-copy`; 존 `dropEffect = 'copy'`). 칸반 핸들러는 `stopPropagation`을 호출하지 않는다(흔한 구현 그대로 둔다) |
| 겨냥하는 가설 | H-FOREIGN-DRAG(카드·이미지·링크 드래그가 패널 이동으로 처리됨), H-DROP-HIJACK(`dropEffect`가 `move`로 바뀜, dragstart에서 `effectAllowed` 덮어쓰기, drop 전파 중단, 패널이 `draggable:false`일 때 copy 드롭 거부), H-REMOUNT(카드 순서 유실) |
| 계측 | mfe-orders의 프로브에 `dnd: { cardMoves, zoneDrops, copyDrops, lastDragend: { dropEffect, effectAllowed }, lastTypes }` 추가. testid: `<slot>-card-<id>`(id = c1..c6), `<slot>-col-<n>`(n = 0..2), `<slot>-img`, `<slot>-link`, `<slot>-copy-src`, `<slot>-copy-zone` |

### mfe-billing

| 항목 | 내용 |
|---|---|
| 노출 | `/remote-entry.js`의 named export `mount(el, ctx: MountContext)`와 `unmount(el)`. `/`는 단독 페이지 |
| 내용 | 프로브 표면 + 청구서 편집기: range 슬라이더, 작은 canvas 스파크라인, 선택 가능한 문단, 체크박스 "mousedown/touchstart에서 stopPropagation"(P1 시나리오에서만 켠다), 마지막 `order:selected`를 보여 주는 줄 |
| 소스 구조 | `src/App.tsx`는 `App: ComponentType<PanelProps>`. `src/remote-entry.tsx`가 `createRoot(el).render(<App slot={ctx.slot} bus={ctx.bus} />)`를 한다. `App`은 `react`, `@harbor/contract`, 상대 경로만 import한다(shell이 twin으로 번들할 수 있어야 한다). 프로브의 `kind: 'mount'`와 `mountCalls`·`unmountCalls`·`rootsAlive`는 mount 모듈(`remote-entry.tsx`)이 `App`을 렌더하기 전에 등록한다. `App`은 선택 prop `kind?: ProbeKind`를 받아 `createProbe`의 `meta`로 그대로 넘긴다. `billing`과 `control-mount`에서는 생략해(`undefined`) 모듈이 먼저 적은 `'mount'`가 유지된다. 같은 `App`을 host 트리 안에서 그리는 `billing-local`(twin)은 래퍼가 `kind: 'local'`을 넘겨 `kind: 'local'`로 기록된다 |
| 겨냥하는 가설 | H-REMOUNT(미리보기가 바뀔 때마다 `root.unmount` + `createRoot`), H-REINSERT(루트는 유지, 스크롤 초기화), H-GHOST-CLONE(정적 복제, 빈 canvas, 토큰 유실), 어댑터의 "import가 unmount 뒤에 끝나는" 경합(픽스처 수준 확인). P1: stopPropagation 토글로 H-HANDLE-STALE, 슬라이더·텍스트 선택과 패널 전체 드래그의 충돌 |
| 계측 | `window.__mfe[slot]` (kind `mount`, `mountCalls`·`unmountCalls`·`rootsAlive` 추가, `reactSame` 기대값 `false`). remote 모듈 안에서 쓴다. host 어댑터는 `window.__fc.frames[slot].lateResolves`를 쓴다. testid: `<slot>-input`, `<slot>-scroll`, `<slot>-counter`, `<slot>-range`, `<slot>-canvas`, `<slot>-text`, `<slot>-stopprop`, `<slot>-last-order` |
| 빌드 요점 | federation 플러그인 없음. Vite lib 모드 ES 빌드: `build.lib.formats ['es']`, `build.lib.fileName: () => 'remote-entry.js'`, `package.json`에 `"type": "module"`, `define: { 'process.env.NODE_ENV': JSON.stringify('production') }`. 단독 페이지는 `public/index.html`(lib 모드는 HTML을 진입점으로 쓸 수 없지만 publicDir는 복사한다)에 두고, 모듈 스크립트가 `./remote-entry.js`를 import해 `mount(el, { slot, bus: stub, contract: 1 })`를 호출한다. `.css` 파일 없음(추가한다면 `?inline`으로 import해 `mount`에서 주입). 근거: https://vite.dev/guide/build (라이브러리 모드) |

`fileName`을 문자열 `'remote-entry.js'`로 주면 결과가 `remote-entry.js.js`(또는 `"type": "module"`이 없으면 `.mjs`)가 된다. `define` 값을 따옴표 없이 주면 식별자로 치환돼 런타임에 예외가 난다. 둘 다 위 형태로 피한다.

### mfe-telemetry

| 항목 | 내용 |
|---|---|
| 노출 | 페이지 `/?slot=<slot>&parent=<shell origin>`. 로드될 때마다 부모에 `{ harbor: 1, slot, type: 'mfe:loaded', payload: { loads, docId } }`를 `postMessage`한다. `parent` 값은 허용 목록(`registry.json`의 `shell.origin`, `baseline.npm051.origin`)에 있을 때만 targetOrigin으로 쓴다 |
| 임베드 | 한 빌드를 두 번: 슬롯 `telemetry` = http://127.0.0.1:4304 (shell과 cross-origin이지만 same-site, 같은 렌더러 프로세스), 슬롯 `telemetry-x` = http://localhost:4304 (cross-site, 별도 프로세스를 의도. 실제 분리 여부는 스파이크 S9에서 기록만 한다) |
| 내용 | 텍스트 input, 100행 스크롤 목록, 로드 수 + docId + 로드 시각 표시, rAF로 움직이는 canvas, 프레임 안에서 본 `dragenter`/`dragover`/`drop`/`pointermove`/`touchstart` 수 |
| 금지 | 프레임 안의 드래그 리스너는 수만 센다. `preventDefault`를 호출하지 않는다(호출하면 iframe이 드롭 대상이 되어 R07·R12의 의미가 바뀐다) |
| 겨냥하는 가설 | H-IFRAME-DEAD(마우스 경로에서 iframe 위로는 host의 dragover/drop이 오지 않음. 터치 경로는 iframe을 대상으로 잡음), H-REMOUNT·H-REINSERT(host fiber가 유지돼도 문서 전체가 다시 로드됨), H-GHOST-CLONE(복제된 iframe이 두 번째 문서를 로드), H-RESIZE(same-site·별도 프로세스 프레임 위의 포인터 캡처), 우회책 `[data-dragging-panel-id] iframe{pointer-events:none}` |
| 계측 (iframe 문서 안) | `window.__mfe[slot] = { slot, kind: 'iframe', loads, docId, loadedAt, build, seen }`. `loads`는 슬롯별 sessionStorage 키 `harbor.loads.<slot>`(try/catch, 실패하면 1 고정). `docId`는 로드마다 `crypto.randomUUID()`. 프레임 안 testid: `tele-loads`, `tele-docid`, `tele-input`, `tele-scroll`, `tele-canvas`, `tele-counts` |
| 계측 (host 쪽) | `window.__fc.frames[slot].mirror`. host 요소 testid `iframe-<slot>`. 세 번째 오라클은 Playwright의 :4304 문서 요청 로그 |
| 빌드 요점 | 프레임워크 없음, Vite 앱 빌드(`index.html`), federation 없음. `vite preview`를 127.0.0.1에 바인드(프로세스 하나가 두 이름을 모두 받는다) |

카운터를 iframe 문서 **안**에 두는 이유: React는 키가 있는 자식의 순서를 바꿀 때 제거 후 삽입으로 처리한다(`enableMoveBefore`가 `false`: https://raw.githubusercontent.com/facebook/react/main/packages/shared/ReactFeatureFlags.js). iframe은 문서에서 떨어졌다 다시 붙으면 내용을 새로 로드한다(https://html.spec.whatwg.org/multipage/iframe-embed-object.html). host wrapper의 마운트 수는 그대로인데 문서만 다시 로드되는 경우를 host 쪽 카운터로는 볼 수 없다.

### contract

| 항목 | 내용 |
|---|---|
| 형태 | React 없는 소스 패키지. 모든 프로젝트가 Vite alias `@harbor/contract` → `mfa-lab/contract/src/index.ts`로 쓴다. 자기 `package.json`(private, 의존성 없음)을 둔다. 루트 `package.json`의 `"sideEffects": false`(`package.json:35`)를 물려받지 않기 위해서다 |
| 내용 | 타입과 헬퍼(「통합 계약」), `CONTRACT.md`(계약 버전 1, 프로브 표면 testid) |
| 규칙 | `react`를 import하지 않는다 |
| 대안 | alias가 lib 모드(B1-04)나 MF remote(B1-06)에서 동작하지 않으면 설치 시점에 각 프로젝트의 `src/vendor/contract/`로 복사한다. 사용했으면 STATE.md에 적는다 |

### e2e

`@playwright/test` 하나만 의존한다. 드래그는 `page.mouse`, 터치는 CDP `Input.dispatchTouchEvent`로 만든다. 구성은 [HARNESS.md](./HARNESS.md) 전체가 맡는다.

---

## 레지스트리

`mfa-lab/registry.json`은 이름·팀·유형·origin·진입점·디렉터리·버전 핀의 단일 기준이다. 처음부터 모든 앱을 적어 둔다. 아직 만들지 않은 앱은 스크립트가 건너뛴다(「실행 모델」의 활성 집합).

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

읽는 곳:

| 소비자 | 쓰는 내용 |
|---|---|
| shell `vite.config.ts` | `remotes`에서 `kind: "same-tree"`인 항목으로 federation `remotes`를 만든다. 형식은 매니페스트 URL 문자열(`orders: 'http://127.0.0.1:4301/mf-manifest.json'`). host의 `remotes` 키는 remote의 `name`과 같다 |
| shell 런타임 | 정적 JSON import. `window.__fc.registry`로 노출. `mount`·`iframe` remote의 URL은 런타임에 여기서 만든다 |
| mfe-telemetry | `postMessage` 허용 origin 목록 |
| `ctl.mjs` | 포트, 준비 확인 URL, 핀 검사 |
| 하네스 | URL 조립, 장애 주입 대상 origin |

규칙:

- remote의 키(`orders` 등)는 제품 슬롯 이름이자 `window.__mfe`의 키다. `orders`와 `board`는 MF 이름이기도 하다.
- 프로젝트의 `package.json`에 있는 의존성 중 `pins`에 있는 것은 버전 문자열이 핀과 정확히 같아야 한다. `mfa-lab/` 아래 어떤 의존성에도 `^`·`~`를 쓰지 않는다. `ctl smoke`가 검사한다.
- `contract` 숫자는 `registry.json`과 `CONTRACT.md`에만 있다. 런타임 계약 검사는 `MountContext.contract`뿐이다.
- 넣지 않은 것: remote별 런타임 매니페스트 검사, 런타임 `registerRemotes`/`loadRemote`, 거버넌스 스크립트. 라이브러리 질문에 답하지 않으면서 픽스처 버그가 될 수 있는 것들이다.

---

## 통합 계약

계약 버전 1. 소스는 `mfa-lab/contract/src/`(미실행).

```ts
// index.ts — 타입
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
  harbor: 1; slot: string; type: 'mfe:loaded';
  payload: { loads: number; docId: string };
}
export type ProbeKind = 'local' | 'same-tree' | 'mount' | 'iframe';
export interface ProbeMeta {
  remote: string;            // 내용 코드를 소유한 쪽: 'shell' | 'orders' | 'board' | 'billing' | 'telemetry'
  kind?: ProbeKind;          // 생략하면 기존 값 유지, 없으면 'same-tree'
  build: string;             // 이 코드를 번들한 빌드의 스탬프
  reactVersion?: string;
  reactSame?: boolean | null;
}
export interface Probe {
  readonly state: Record<string, unknown>;        // window.__mfe[slot]와 같은 객체를 가리킨다
  mounted: () => number;                          // mounts +1, instanceSeq +1. 새 instanceSeq 반환
  unmounted: () => void;                          // unmounts +1
  bump: (key: string, by?: number) => void;       // 숫자 필드 증감 (mountCalls, unmountCalls, rootsAlive, loads ...)
  set: (patch: Record<string, unknown>) => void;  // 그 밖의 필드 (dnd, seen, docId ...)
}
// 헬퍼
export const createProbe: (slot: string, meta: ProbeMeta) => Probe;   // probe.ts
export const createBus: () => InspectableBus;                         // bus.ts
export const ensureStyle: (id: string, css: string) => void;          // style.ts
```

헬퍼 규칙:

| 헬퍼 | 규칙 |
|---|---|
| `createProbe(slot, meta)` | `window.__mfe[slot]`의 유일한 구현. 슬롯당 한 번만 만들고 다시 부르면 같은 프로브를 돌려준다(카운터는 리마운트를 넘어 누적). 뒤에 온 `meta`는 정의된 필드만 덮어쓴다. 값이 바뀔 때마다 `window.dispatchEvent(new CustomEvent('harbor:probe', { detail: { slot } }))`를 보낸다. 갱신은 객체를 새로 만들어 `window.__mfe[slot]`에 다시 대입한다(직접 mutation 금지 규칙) |
| `createBus()` | 메모리 안의 pub/sub. `subscribe`는 해제 함수를 돌려준다 |
| `ensureStyle(id, css)` | `document.head`에 `<style data-harbor-style="<id>">`가 없을 때만 한 번 넣는다 |

카운터를 올리는 위치: 내용 컴포넌트의 `useLayoutEffect(() => { probe.mounted(); return () => probe.unmounted(); }, [])`. passive effect(`useEffect`)가 아니라 layout effect에 두어, 하네스가 `settle` 직후 읽어도 값이 확정돼 있게 한다. `reactVersion`·`reactSame`은 계약이 React를 모르므로 각 remote 코드가 계산해 `meta`로 넘긴다: `reactSame = window.__fc ? window.__fc.reactRef.createElement === React.createElement : null`. 모듈 네임스페이스 객체가 아니라 함수 참조를 비교한다.

### 프로브 표면 (CONTRACT.md에 고정)

모든 패널 내용은 아래 요소를 자기 코드로 그린다. 공유 React 위젯 키트는 두지 않는다. 컨테이너 유형이 달라도 같은 방법으로 상태 유실을 읽기 위한 것이다.

| 유형 | 필수 testid | 의미 |
|---|---|---|
| `local`, `same-tree`, `mount` | `<slot>-input` | 텍스트 input (값 유지 여부) |
| | `<slot>-scroll` | 100행 이상을 담은 스크롤 컨테이너 (scrollTop 유지 여부) |
| | `<slot>-counter` | 누를 때마다 수가 오르는 버튼 (컴포넌트 state 유지 여부) |
| `iframe` (프레임 문서 안) | `tele-input`, `tele-scroll`, `tele-loads` | 프레임 문서 안의 같은 역할. 카운터 버튼 대신 로드 수를 쓴다(문서가 다시 로드되면 모든 상태가 사라지므로) |

`bare-*`는 예외로 input(`bare-<n>-input`)과 마운트 수 표시만 가진다.

### 유형별 계약

| 유형 | remote가 내놓는 것 | host가 주는 것 |
|---|---|---|
| `same-tree` | `export const Panel: ComponentType<PanelProps>`를 `./Panel`로 노출 | `slot`, `bus` props |
| `mount` | ES 모듈의 `mount(el, ctx)`, `unmount(el)`. 같은 `el`에 `mount`를 두 번 부르면 두 번째는 무시(`mountCalls`만 증가). 모르는 `el`의 `unmount`는 무시. `ctx.contract !== 1`이면 예외 | `el`(어댑터가 소유한 div), `{ slot, bus, contract: 1 }` |
| `iframe` | `/?slot=<slot>&parent=<origin>` 페이지와 `mfe:loaded` 메시지 1종 | URL 하나. 버스는 넘기지 않는다 |

---

## host 어댑터

`apps/shell/src/adapters/`에 둔다. 각각 60줄 안팎으로 유지해 README 통합 가이드로 옮겨 쓸 수 있게 한다. 코드 골격은 [RECIPES.md](./RECIPES.md).

| 어댑터 | 대상 슬롯 | 동작 |
|---|---|---|
| `SameTreeRemote` | `orders`, `board` | 정적 로더 맵(`src/registry/loaders.ts`: `{ orders: () => import('orders/Panel'), board: () => import('board/Panel') }`)에서 `React.lazy(() => load().then((m) => ({ default: m.Panel })))`를 슬롯당 한 번 모듈 스코프에 만든다(리마운트 때 다시 받지 않도록). `<Lazy slot={slot} bus={bus} />`를 렌더한다. 타입은 손으로 쓴 `remotes.d.ts` |
| `RemoteMount` | `billing`, `control-mount` | 아래 표 |
| `IframeRemote` | `telemetry`, `telemetry-x`, `control-iframe` | `<iframe data-testid="iframe-<slot>" style="display:block;width:100%;height:100%;border:0">`. remote 슬롯은 `src = origin + entry + '?slot=' + slot + '&parent=' + encodeURIComponent(location.origin)`, `control-iframe`은 `srcDoc`. `sandbox`·`loading` 속성은 주지 않는다 |

`bus`는 `apps/shell/src/bus.ts`의 모듈 스코프 싱글턴(`export const bus = createBus()`)이고 어댑터가 직접 import한다.

### RemoteMount

| 항목 | 동작 |
|---|---|
| DOM | `<div data-testid="mount-<slot>" style="width:100%;height:100%">`를 소유한다 |
| 모듈 로드 | `billing`: `import(/* @vite-ignore */ url)`, `url = registry.remotes.billing.origin + entry`. `control-mount`: host 로컬 모듈 `src/local/controlMount.tsx`. 모듈 promise는 URL(또는 슬롯)별로 모듈 스코프에 캐시한다 |
| mount | `useLayoutEffect` 안에서 promise가 끝나면 `mount(el, { slot, bus, contract: 1 })`를 부르고 프레임 상태를 `ready`로 바꾼다 |
| `lateResolves` | cleanup이 먼저 실행된 뒤에 promise가 끝나면 `mount`를 부르지 않고 `window.__fc.frames[slot].lateResolves`를 1 올린다. 스모크 기대값은 0. 최초 로드가 끝나기 전에 리마운트가 겹칠 때만 오른다 |
| unmount | cleanup에서 `mount`가 이미 불렸다면 `unmount(el)`을 **동기적으로** 부른다. 어댑터는 `billing`과 `control-mount`를 똑같이 다룬다 |
| 실패 | import 거부 또는 `mount`/`unmount`가 없는 모듈이면 렌더 중에 예외를 던져 `RemoteErrorBoundary`가 에러 카드를 그리게 한다. 거부된 promise는 캐시에서 지워 `retry-<slot>`이 다시 시도할 수 있게 한다 |

cross-origin `import()`가 되는 근거: `vite preview`의 CORS 기본값은 `server.cors`를 따르고, 그 기본값은 `localhost`·`127.0.0.1`·`[::1]`의 모든 포트를 허용한다(https://vite.dev/config/preview-options, https://vite.dev/config/server-options).

`billing`과 `control-mount`의 `unmount` 차이(모듈 안쪽 구현의 차이다):

| | `billing` (`mfe-billing/src/remote-entry.tsx`) | `control-mount` (`shell/src/local/controlMount.tsx`) |
|---|---|---|
| React | 자기 번들의 React 19.2.4 (`reactSame: false`) | host의 React (`reactSame: true`) |
| `unmount(el)` | 즉시 `root.unmount()` | `queueMicrotask`로 미룬 뒤 `root.unmount()` |
| 이유 | host의 commit 단계는 remote의 React 사본에게 보이지 않는다. 미룰 필요가 없다 | 어댑터의 cleanup은 host React의 commit 중에 실행된다. 같은 React 사본으로 그 안에서 루트를 동기 unmount하면 React가 그 시점에 unmount를 끝내지 못하고, 개발 빌드에서는 "Attempted to synchronously unmount a root while React was already rendering" 오류를 낸다 |
| 재mount 가드 | 없음 | 미룬 unmount가 실행되기 전에 같은 `el`로 `mount`가 다시 오면 unmount를 취소하고 기존 루트를 유지한다(`strict=1`의 effect 이중 실행 대비) |
| 렌더 내용 | `App` | `@twin/billing`의 같은 `App` (슬롯 `control-mount`) |

이 차이 때문에 `control-mount`의 `unmounts`는 `billing`보다 한 마이크로태스크 늦게 오른다. 하네스의 `settle` 뒤에는 차이가 없어야 한다.

### IframeRemote와 mirror

- `message` 리스너는 wrapper 컴포넌트가 아니라 **모듈 스코프**에 한 번 건다. wrapper가 리마운트되는 동안 온 메시지를 잃지 않기 위해서다.
- 리스너는 `event.origin`이 `registry.json`의 iframe origin(`http://127.0.0.1:4304`, `http://localhost:4304`)이거나 `location.origin`(`control-iframe`의 `about:srcdoc` 문서는 부모 origin을 물려받는다)일 때, 그리고 `data.harbor === 1 && data.type === 'mfe:loaded'`이고 `data.slot`이 아는 iframe 슬롯일 때만 처리한다.
- 처리: `window.__fc.frames[slot].mirror = { loads: 이전 + 1, docIds: [...이전, docId], lastLoadedAt: Date.now() }`. `mirror.loads`는 host가 받은 메시지 수다. 프레임 안의 `loads`(sessionStorage)와 독립된 값이다.
- 첫 메시지를 받으면 프레임 상태를 `ready`로 바꾼다.

`control-iframe`의 srcdoc 문서: 인라인 스크립트가 telemetry와 같은 프로브(`window.__mfe['control-iframe']`, sessionStorage 키 `harbor.loads.control-iframe`)를 만들고 `tele-input`·`tele-scroll`·`tele-loads`를 그린 뒤 `parent.postMessage(msg, '*')`를 보낸다. `about:srcdoc`은 이름 붙일 URL origin이 없어 targetOrigin을 `'*'`로 두고, 검증은 받는 쪽이 한다. 서버가 필요 없다.

---

## 공유 의존성 정책

| 의존성 | 정책 | 확인 |
|---|---|---|
| `react`, `'react/'`, `react-dom`, `'react-dom/'` | shell과 same-tree remote 사이에서만 싱글턴 공유. 전부 정확히 19.2.4 | 스모크: same-tree는 `reactSame === true`, mount는 `false` |
| `@dannysir/floating-components` | host 전용. federation으로 노출하거나 공유하지 않는다 | alias는 shell의 vite 설정에만 있다 |
| `@harbor/contract` | 소스 alias. 프로젝트마다 번들에 포함. React 없음 | 모든 vite 설정에 alias |
| 그 밖 | 공유하지 않는다. 각자 번들 | — |
| `vite`, `@vitejs/plugin-react`, `@module-federation/vite` | 모든 `package.json`에 `registry.json`의 핀 그대로 | `ctl smoke` 핀 검사 |

federation 설정에서 지켜야 할 것(전부 미실행. 전문은 [RECIPES.md](./RECIPES.md)):

- **`shareStrategy: 'loaded-first'`** 를 shell과 MF remote 모두에 둔다. 플러그인 기본값은 `'version-first'`이고(https://raw.githubusercontent.com/module-federation/vite/main/src/utils/normalizeModuleFederationOptions.ts 의 `shareStrategy: options.shareStrategy || 'version-first'`), 이 값에서는 host가 시작할 때 모든 remote 진입 파일을 불러 공유 의존성을 등록한다. remote 하나가 죽어 있으면 shell 전체가 뜨지 않을 수 있다. `'loaded-first'`는 remote를 필요할 때만 부른다(https://module-federation.io/configure/shareStrategy.html). 이 선택이 R16(remote 하나를 막아도 레이아웃 유지)과 B1-06 게이트 (b)의 전제다.
- `'loaded-first'`로도 막힌 remote가 shell을 죽이면, `--mf off`로 내리기 전에 `errorLoadRemote` 훅에서 대체 모듈을 돌려주는 런타임 플러그인을 먼저 시도한다(https://module-federation.io/blog/error-load-remote.html). 단계는 [BRIEF-1-build.md](./BRIEF-1-build.md)의 「단계」.
- remote: `filename: 'remoteEntry.js'`와 `manifest: true`를 명시한다. 기본값은 `remoteEntry-[hash]`와 매니페스트 없음이다(같은 소스 파일). `dts: false`, `base`는 절대 origin, `server.origin` 지정, `build.target: 'chrome89'`(공유 모듈이 top-level await로 로드된다: https://module-federation.io/integrations/build-tool/vite).
- 객체 형식 remote에서 `type`을 빼면 레거시 `var`로 처리되고 경고가 난다. 매니페스트 URL 문자열을 쓰거나 `type: 'module'`을 준다.
- 다른 React 메이저를 쓰는 remote는 `react`를 shared로 선언하면 안 된다. 싱글턴은 모두를 높은 버전으로 맞춘다. 그래서 React 18 사례는 2차의 mount remote다.
- 레이아웃 라이브러리를 공유하지 않는 이유: 라이브러리에는 React context가 없고 컴포넌트 사이 계약이 DOM 수준이다(`data-tree-root`: `src/components/TreeLayout.tsx:124`, `data-panel-id`·`data-panel-droppable`: `src/components/PanelNodeRenderer.tsx:141-142`, dataTransfer 타입 `text/panel-id`: `src/components/PanelNodeRenderer.tsx:75`). alias된 소스를 공유하는 경로는 플러그인에서 2026년 9월까지 수정이 이어진 부분이다.

alias와 React 중복: shell은 `<repo>/src/index.ts`와 remote 소스(twin)를 자기 번들에 넣는다. 이 파일들의 `react` import가 shell의 사본으로 가도록 `resolve.dedupe: ['react', 'react-dom']`을 둔다. 루트 `package.json`의 `"sideEffects": false`가 alias된 `src/`에도 적용될 수 있으므로, 스모크는 리사이저 스타일 태그 `[data-ftl-styles]`(`src/components/resizerStyles.ts:25-31`이 모듈 로드 때 주입)가 있는지 확인한다.

픽스처의 타입 검사는 게이트가 아니다. alias된 `src/`는 루트의 `@types/react`가 필요한데 클라우드에는 루트 `node_modules`가 없다. Vite는 타입을 지우기만 한다.

---

## 버스

- shell이 소유한 메모리 버스 하나(`createBus()`). same-tree remote에는 props로, mount remote에는 `MountContext`로 넘긴다. 평범한 JS 객체라 React 사본이 달라도 넘어간다.
- 제품 흐름은 하나: `mfe-orders`가 행 클릭 때 `order:selected`를 `{ orderId: string }`으로 발행하고, `mfe-billing`의 `App`이 구독해 `<slot>-last-order`에 표시한다. twin도 같은 버스를 쓴다.
- 구독은 `App`의 effect에서 하고 cleanup에서 해제한다.
- `window.__fc.bus.subscriberCount(topic)`은 리마운트가 반복될 때의 누수 검사다. `subscriberCount('order:selected')`는 살아 있는 billing 계열 인스턴스 수(`billing`, `billing-local`, `control-mount` 중 트리에 있는 것)와 같아야 한다. 다르면 픽스처 버그다.
- 1차에는 iframe으로 가는 브리지, 공유 스토어, remote 사이 직접 import가 없다. 단독 페이지는 자기 `createBus()` 인스턴스를 stub으로 쓴다.

---

## CSS와 크기

| 항목 | 규칙 |
|---|---|
| shell 토큰 | `apps/shell/src/tokens.css`. 기본 토큰 `--hb-*`는 `:root`, 테마 토큰(`--hb-bg`, `--hb-fg`, `--hb-accent`, `--hb-border`)은 워크스페이스 wrapper `[data-theme]`에 둔다. 의도적이다: 터치 ghost는 `document.body`에 붙으므로(`src/hooks/useTouchDrag.ts:60-74`) 테마 토큰을 잃고, 이는 computed style로 측정할 수 있다(H-GHOST-CLONE) |
| remote 스타일 | 1차 remote는 `.css` 파일을 내지 않는다. 인라인 스타일 + `ensureStyle`로 넣는 style 태그 하나. 모든 선택자는 `[data-mfe="<name>"]` 아래로 한정하고 remote의 최상위 요소가 `data-mfe`를 가진다. MF·lib 모드·iframe 세 가지 CSS 파이프라인을 확인 대상에서 뺀다 |
| 토큰 사용 | remote는 `var(--hb-fg, #1f2328)`처럼 대체값을 준다. iframe 문서는 토큰을 받지 못한다 |
| shell이 보장하는 크기 | `shell-root`는 `display:flex; flex-direction:column; height:100vh`. 상단 바 `flex:0 0 40px`. 워크스페이스 `flex:1; min-height:0; padding:12px; box-sizing:border-box; display:flex`. `TreeLayout`은 기본값(`width`/`height` 100%)으로 워크스페이스를 채운다. 1280x800 뷰포트에서 트리 루트는 1256x736으로 계산된다(미실행). 스모크는 루트 높이가 0보다 큰지 확인한다(부모가 명시 크기를 가져야 한다: [doc/API.ko.md](../../API.ko.md)의 "크기") |
| `PanelFrame` | `display:flex; flex-direction:column; height:100%`. 헤더 높이 28px. body는 `flex:1; min-height:0; overflow:auto; position:relative` |
| remote | body를 `width:100%; height:100%`로 채운다. `100vh`를 쓰지 않는다 |
| 핸들 | `touch-action`을 주지 않는다. 라이브러리의 날것 동작을 본다 |
| 라이브러리 쪽 사실 | 패널 wrapper는 `overflow:auto`(`src/components/PanelNodeRenderer.tsx:151`). 리사이저는 `.ftl-resizer`, 기본 두께 8px(`src/components/resizerConstants.ts:1`), 기본은 hover 때만 보인다. shell은 `resizer*` props를 주지 않는다 |

---

## 패널 프레임과 경계

`PanelFrame`은 `bare-*`를 뺀 모든 슬롯을 감싼다(미실행).

```tsx
<section data-testid={`frame-${slot}`} data-slot={slot} data-kind={kind}>
  <header data-drag-handle data-testid={`handle-${slot}`}>
    제목 · 팀 · 유형 · <output data-testid={`status-${slot}`} />
  </header>
  <div data-testid={`body-${slot}`}>
    <RemoteErrorBoundary slot={slot}>
      <Suspense fallback={<PanelSkeleton slot={slot} />}>{children}</Suspense>
    </RemoteErrorBoundary>
  </div>
</section>
```

- props는 `slot`, `kind`(`'local' | 'same-tree' | 'mount' | 'iframe'`), `title`, `team`, `children`이고 전부 필수다. `title`·`team`은 헤더의 "제목 · 팀"에 쓴다.
- 헤더(핸들)는 경계 **밖**에 둔다. remote가 죽어도 패널을 끌 수 있다(R16).
- `RemoteErrorBoundary`는 class 컴포넌트다(허용된 예외). `error-<slot>` 카드와 `retry-<slot>` 버튼을 그린다. retry는 실패한 로더 캐시를 버리고 다시 시도한다. `PanelSkeleton`은 `loading-<slot>`을 그린다.
- `TreeLayout` 바깥에는 Suspense도 에러 경계도 두지 않는다. 바깥 경계가 있으면 remote 하나의 지연·실패가 레이아웃 전체를 내린다.
- `status-<slot>`은 host 프레임 마운트 수와 내용 카운터를 나란히 보여 준다: `f<frameMounts> c<mounts>`, iframe은 `f<frameMounts> l<mirror.loads>`. wrapper와 내용의 불일치가 스크린샷에 보이게 하려는 것이다. `harbor:probe` 이벤트와 mirror 갱신 때 다시 그린다.
- `PanelFrame`은 `useLayoutEffect`에서 `frameMounts`를, cleanup에서 `frameUnmounts`를 올린다.

프레임 상태(`window.__fc.frames[slot].state`):

| 유형 | `loading` | `ready` | `error` |
|---|---|---|---|
| `local` | — | 마운트 즉시 | — |
| `same-tree` | Suspense fallback이 보이는 동안 | lazy가 풀려 내용이 커밋된 뒤 | 경계가 예외를 잡았을 때 |
| `mount` | import가 끝나기 전 | `mount()` 호출 뒤 | import 거부·계약 위반 |
| `iframe` | 첫 `mfe:loaded` 전 | 첫 `mfe:loaded` 수신 뒤 | 쓰지 않는다(iframe 로드 실패는 host가 알 수 없다) |

testid 전체(패널 관련):

| testid | 위치 |
|---|---|
| `frame-<slot>`, `handle-<slot>`, `body-<slot>`, `status-<slot>` | `PanelFrame` (`bare-*`는 `handle-`·`status-`만) |
| `loading-<slot>`, `error-<slot>`, `retry-<slot>` | 스켈레톤과 에러 카드 |
| `mount-<slot>` | `RemoteMount`의 div |
| `iframe-<slot>` | `IframeRemote`의 iframe 요소 |
| `<slot>-input`, `<slot>-scroll`, `<slot>-counter` 등 | 내용(프로브 표면과 앱별 testid) |

터치 ghost는 패널을 통째로 복제하므로 드래그 중에는 같은 testid가 둘이 된다. 하네스는 모든 조회를 `[data-tree-root]` 아래로 한정한다([HARNESS.md](./HARNESS.md)의 「스냅샷」).

---

## 대조 사다리와 store 등록

문제가 어느 단계에서 처음 나타나는지로 라이브러리 버그·컨테이너 고유 현상·픽스처 버그를 가린다. 판정 절차는 [../README.md](../README.md)의 귀속 사다리가 맡고, 여기서는 단계를 이루는 슬롯을 정의한다.

| 컨테이너 유형 | 사다리 (왼쪽에서 오른쪽으로 변수 하나씩 추가) |
|---|---|
| same-tree | `bare` → `control` / twin(`orders-local`, `board-local`) → remote(`orders`, `board`) |
| mount | `billing-local`(host 트리 안) → `control-mount`(별도 루트, host의 React) → `billing`(별도 루트, 자기 React, 원격 모듈) |
| iframe | `control` → `control-iframe`(srcdoc, 부모와 같은 origin) → `telemetry`(cross-origin, same-site) → `telemetry-x`(cross-site) |

| 슬롯 | 구성 | 더해지는 변수 |
|---|---|---|
| `bare-0..3` | div + 인라인 핸들 + input + 마운트 카운터. `PanelFrame` 없음 | 라이브러리만 |
| `control-a..d` | `PanelFrame` + `ControlPanel` | + 패널 프레임과 일반 내용 |
| `orders-local`, `board-local`, `billing-local` | `PanelFrame` + remote 자신의 소스를 shell이 alias로 번들한 것 (`@twin/orders` → `../mfe-orders/src/Panel.tsx`, `@twin/board` → `../mfe-board/src/Panel.tsx`, `@twin/billing` → `../mfe-billing/src/App.tsx`) | + remote의 내용. 컨테이너는 host 트리 그대로 |
| `control-mount` | `PanelFrame` + `RemoteMount` + host 로컬 mount 모듈 | + 별도 React 루트 |
| `control-iframe` | `PanelFrame` + `IframeRemote` + srcdoc | + iframe 문서 경계 |
| 제품 슬롯 | `PanelFrame` + 어댑터 + remote | + 원격 로딩(그리고 `billing`은 자기 React, `telemetry*`는 다른 origin·site) |

주의:

- twin의 프로브는 `build`가 shell의 스탬프다(shell이 번들했으므로). remote의 프로브는 remote의 스탬프다. 이 값으로 twin과 remote를 구분할 수 있다.
- `telemetry`에는 twin이 없다. iframe 고유 현상은 `control-iframe`으로 가린다. "한 remote에서만 재현되면 픽스처 버그"라는 기본값은 컨테이너 대조군이 깨끗할 때만 적용한다.
- `control-iframe`은 부모와 같은 origin이라 같은 프로세스이고 host가 `contentDocument`에 접근할 수 있다. 문서 경계와 재삽입 시 재로드는 같다.
- `--mf off`에서는 remote와 twin이 같은 모듈이 된다. remote-vs-twin 비교와 R16은 `blocked (MF degraded)`가 된다.

### store 등록

store는 모듈 스코프에서 한 번 만들고, 모든 키를 처음부터 고정된 엘리먼트로 등록한다. 늦은 등록은 하지 않는다(`register`는 리렌더를 일으키지 않는다: `src/tree/componentStore.ts:13-15`). 아래는 키와 `kind`만 보여 주는 요약이다. `PanelFrame`의 필수 prop `title`·`team`은 생략했다. 전문(단계별 주석 포함)은 [RECIPES.md](./RECIPES.md) 3.8절. 미실행:

```tsx
// apps/shell/src/workspace/store.tsx (요약. title·team prop 생략)
export const components = createComponentStore({
  nav: <PanelFrame slot="nav" kind="local"><NavPanel /></PanelFrame>,
  'bare-0': <Bare slot="bare-0" />,
  'bare-1': <Bare slot="bare-1" />,
  'bare-2': <Bare slot="bare-2" />,
  'bare-3': <Bare slot="bare-3" />,
  'control-a': <PanelFrame slot="control-a" kind="local"><ControlPanel slot="control-a" /></PanelFrame>,
  'control-b': <PanelFrame slot="control-b" kind="local"><ControlPanel slot="control-b" /></PanelFrame>,
  'control-c': <PanelFrame slot="control-c" kind="local"><ControlPanel slot="control-c" /></PanelFrame>,
  'control-d': <PanelFrame slot="control-d" kind="local"><ControlPanel slot="control-d" /></PanelFrame>,
  'control-iframe': <PanelFrame slot="control-iframe" kind="iframe"><IframeRemote slot="control-iframe" /></PanelFrame>,
  'control-mount': <PanelFrame slot="control-mount" kind="mount"><RemoteMount slot="control-mount" /></PanelFrame>,
  orders: <PanelFrame slot="orders" kind="same-tree"><SameTreeRemote slot="orders" /></PanelFrame>,
  board: <PanelFrame slot="board" kind="same-tree"><SameTreeRemote slot="board" /></PanelFrame>,
  billing: <PanelFrame slot="billing" kind="mount"><RemoteMount slot="billing" /></PanelFrame>,
  telemetry: <PanelFrame slot="telemetry" kind="iframe"><IframeRemote slot="telemetry" /></PanelFrame>,
  'telemetry-x': <PanelFrame slot="telemetry-x" kind="iframe"><IframeRemote slot="telemetry-x" /></PanelFrame>,
  'orders-local': <PanelFrame slot="orders-local" kind="local"><OrdersTwin slot="orders-local" bus={bus} /></PanelFrame>,
  'board-local': <PanelFrame slot="board-local" kind="local"><BoardTwin slot="board-local" bus={bus} /></PanelFrame>,
  'billing-local': <PanelFrame slot="billing-local" kind="local"><BillingTwin slot="billing-local" bus={bus} /></PanelFrame>,
});
```

- 키는 19개다. remote·twin·컨테이너 대조군의 키는 해당 remote를 만드는 단계에서 추가한다(그 전에는 alias 대상 파일이 없어 import할 수 없다). 순서는 [BRIEF-1-build.md](./BRIEF-1-build.md)의 「단계」.
- 등록되지 않은 키를 가진 패널은 라이브러리가 빈 패널로 그린다(`src/components/PanelNodeRenderer.tsx:132-136`).
- 한 레이아웃에 같은 `componentKey`는 한 번만 나올 수 있다. `__mfe`와 testid가 슬롯으로 키잉되기 때문이다. URL로 중복·미등록 슬롯을 지정하면 shell은 레이아웃 대신 `shell-error`를 그리고 `window.__fc.error`에 이유를 적는다.
- StrictMode는 끈다(effect 이중 실행이 카운터를 두 배로 만든다). `strict=1`은 P1 전용이다.

### 레이아웃 상태

```tsx
// apps/shell/src/workspace/Workspace.tsx (미실행)
const { tree, onMovePanel, onResizeBorder, removePanel, insertPanel, panelIds } =
  useLoggedLayoutTree('main', initialTree);

<TreeLayout
  tree={tree}
  components={components}
  onMovePanel={onMovePanel}
  onResizeBorder={onResizeBorder}
  dragHandleSelector={flags.drag === 'panel' ? undefined : '[data-drag-handle]'}
/>
```

- `useLoggedLayoutTree(layoutId, initialTree)`는 `useLayoutTree`를 얇게 감싼다. `onMovePanel`·`onResizeBorder`·`removePanel`·`insertPanel` 호출마다 `window.__fc.calls`에 한 줄(`treeVersionBefore` 포함)을 남긴 뒤 `movePanel`·`resizeBorder`·`removePanel`·`insertPanel`에 넘긴다.
- `treeVersion`은 첫 커밋 뒤 0이고 `tree` 참조가 바뀔 때마다 1 오른다. "호출은 됐지만 무시됨"은 호출 뒤에도 `treeVersion`이 그대로인 것으로 판정한다. 라이브러리는 잠금 위반 때 같은 트리를 돌려주고 `devWarn`만 내는데(`src/hooks/useLayoutTree.ts:123-130`), `devWarn`은 prod 빌드에서 사라진다(`src/utils/devWarn.ts:2`).
- `removePanel`·`insertPanel`·`panelIds`는 shell 내부 context(`src/workspace/actions.ts`)로 `NavPanel`에 전달한다.

---

## 레이아웃 프리셋

`?layout=<이름>`으로 고른다. 기본은 `workbench`. 필드 이름은 `src/tree/types.ts:7-30`의 `PanelNode`·`SplitNode` 그대로다. 표기 `H[...]`는 가로 split, `V[...]`는 세로 split이다. Resizer 수는 코드 리딩으로 계산한 값이다(`resizable: false` 패널과 맞닿은 경계선은 그려지지 않는다: `src/components/LayoutNodeRenderer.tsx:107`).

| 프리셋 | 구조 (패널 id) | 슬롯 지정 쿼리 (기본값) | Resizer 수 | 용도 |
|---|---|---|---|---|
| `census` | `H[p-a, V[p-b, p-c], p-d]` | `a` `b` `c` `d` (`control-a` `control-b` `control-c` `control-d`) | 3 | 리마운트·재삽입 계수. 스파이크는 `a=bare-0&b=bare-1&c=bare-2&d=bare-3` |
| `locks` | `H[nav, editor, V[terminal, output]]` | `editor` `terminal` `output` (`control-a` `control-b` `control-c`) | 2 | 잠금과 취소 경로. [doc/TODO.md](../../TODO.md)의 검증 기록과 같은 배치 |
| `row3` | `H[p-a, p-b, p-c]` | `a` `b` `c` (`control-a` `control-b` `control-c`) | 2 | 같은 split 안의 순서 변경, iframe 위 드롭, iframe 옆 리사이즈 |
| `pair` | `H[p-a, p-b]` | `a` `b` (`control-a` `control-b`) | 1 | 터치 ghost |
| `workbench` | `H[nav, orders, V[H[board, billing], H[telemetry, telemetry-x]]]` | 없음 (패널 id = 슬롯) | 4 | 제품 기본 화면 |

`census`:

```json
{ "type": "split", "direction": "horizontal", "size": 1, "children": [
  { "type": "panel", "id": "p-a", "size": 1, "componentKey": "control-a" },
  { "type": "split", "direction": "vertical", "size": 1, "children": [
    { "type": "panel", "id": "p-b", "size": 1, "componentKey": "control-b" },
    { "type": "panel", "id": "p-c", "size": 1, "componentKey": "control-c" } ] },
  { "type": "panel", "id": "p-d", "size": 1, "componentKey": "control-d" } ] }
```

`locks`:

```json
{ "type": "split", "direction": "horizontal", "size": 1, "children": [
  { "type": "panel", "id": "nav", "size": 1, "componentKey": "nav", "minWidth": 200, "maxWidth": 200, "draggable": false, "droppable": false, "resizable": false },
  { "type": "panel", "id": "editor", "size": 2, "componentKey": "control-a" },
  { "type": "split", "direction": "vertical", "size": 2, "children": [
    { "type": "panel", "id": "terminal", "size": 1, "componentKey": "control-b" },
    { "type": "panel", "id": "output", "size": 1, "componentKey": "control-c" } ] } ] }
```

`row3`:

```json
{ "type": "split", "direction": "horizontal", "size": 1, "children": [
  { "type": "panel", "id": "p-a", "size": 1, "componentKey": "control-a" },
  { "type": "panel", "id": "p-b", "size": 1, "componentKey": "control-b" },
  { "type": "panel", "id": "p-c", "size": 1, "componentKey": "control-c" } ] }
```

`pair`:

```json
{ "type": "split", "direction": "horizontal", "size": 1, "children": [
  { "type": "panel", "id": "p-a", "size": 1, "componentKey": "control-a" },
  { "type": "panel", "id": "p-b", "size": 1, "componentKey": "control-b" } ] }
```

`workbench`:

```json
{ "type": "split", "direction": "horizontal", "size": 1, "children": [
  { "type": "panel", "id": "nav", "size": 1, "componentKey": "nav", "minWidth": 200, "maxWidth": 200, "draggable": false, "droppable": false, "resizable": false },
  { "type": "panel", "id": "orders", "size": 3, "componentKey": "orders", "minWidth": 320 },
  { "type": "split", "direction": "vertical", "size": 3, "children": [
    { "type": "split", "direction": "horizontal", "size": 2, "children": [
      { "type": "panel", "id": "board", "size": 1, "componentKey": "board" },
      { "type": "panel", "id": "billing", "size": 1, "componentKey": "billing" } ] },
    { "type": "split", "direction": "horizontal", "size": 1, "minHeight": 160, "children": [
      { "type": "panel", "id": "telemetry", "size": 1, "componentKey": "telemetry" },
      { "type": "panel", "id": "telemetry-x", "size": 1, "componentKey": "telemetry-x" } ] } ] } ] }
```

- 슬롯 지정 쿼리는 해당 패널의 `componentKey`만 바꾼다. 예: `?layout=census&a=control-a&b=orders&c=control-c&d=control-d`.
- min/max는 부모 split 방향 축에만 적용된다(`src/components/panelSizeStyle.ts:23-25`). `nav`의 `minWidth = maxWidth = 200`과 `orders`의 `minWidth: 320`은 가로 split의 자식이라, 아래쪽 split의 `minHeight: 160`은 세로 split의 자식이라 유효하다.
- `workbench`는 모든 1차 remote가 등록된 뒤(B1-07 이후)에 온전히 그려진다. 그 전에는 미등록 슬롯이 빈 패널이다.
- npm 0.5.1 baseline(:4390)에는 잠금 옵션이 없다. 거기서 `nav`는 잠기지 않는다. baseline은 대조군 레이아웃의 양성 대조(S5)에만 쓴다.
- 프리셋에 없는 트리(예: R19의 min/max 제약을 건 대조군 트리)는 `persist=1`과 localStorage 선기록으로 주입한다(다음 절).

---

## 핸들·잠금·URL 플래그

### 핸들 전략

- shell이 `PanelFrame` 헤더에 핸들을 그리고 `dragHandleSelector="[data-drag-handle]"`을 넘긴다. iframe 내용(2차의 shadow DOM 내용 포함)에서도 동작하는 유일한 방식이고, README에 권장 패턴으로 올릴 후보다.
- 핸들 모드에서 패널의 `draggable` 속성은 평소 `false`이고(`src/components/PanelNodeRenderer.tsx:143`), 핸들에서 mousedown이 일어날 때만 `true`가 된다(`src/components/PanelNodeRenderer.tsx:59-69`).
- 터치: 핸들 모드는 롱프레스 없이 핸들을 누른 채 8px 넘게 움직이면 드래그가 시작된다(`src/hooks/useTouchDrag.ts:9`, `:145-149`, `:234`). 핸들이 없을 때만 450ms 롱프레스가 걸린다(`src/hooks/useTouchDrag.ts:8`, `:246-250`). [doc/API.ko.md](../../API.ko.md)의 `dragHandleSelector` 설명("핸들(또는 패널)을 롱프레스")과 다르다. 이 불일치는 [HYPOTHESES.md](./HYPOTHESES.md)에 문서 불일치로 선등록돼 있다.
- `?drag=panel`은 `dragHandleSelector`를 넘기지 않는다(패널 전체가 `draggable`, 터치는 롱프레스). 스파이크 S7b와 P1 시나리오에서만 쓴다.
- `bare-*`는 인라인 `[data-drag-handle]`을 가진다. remote가 직접 그리는 핸들은 2차에만 있다.
- "iframe 내용 안에서는 드래그를 시작할 수 없다"는 버그가 아니라 통합 가이드다(결정 D4, [../README.md](../README.md)).

### 잠금

- `nav`: `draggable: false, droppable: false, resizable: false`, `minWidth = maxWidth = 200`. 드롭 불가 패널 위에서 놓는 취소 경로와 "Resizer 없음" 확인에 쓴다.
- `?lock=<panelId>:<csv>`: 어떤 프리셋에서든 패널 하나의 나열된 옵션을 `false`로 만든다. csv 값은 `draggable`, `droppable`, `resizable`. 예: `?layout=row3&a=board&lock=p-a:draggable`(R11). 여러 패널을 잠그려면 `lock`을 반복한다.

### URL 플래그

| 플래그 | 값 (기본) | 동작 |
|---|---|---|
| `layout` | `census` `locks` `row3` `pair` `workbench` (`workbench`) | 프리셋 선택. 모르는 값이면 `shell-error` |
| `a` `b` `c` `d` / `editor` `terminal` `output` | 슬롯 이름 | 프리셋의 해당 패널에 넣을 슬롯 |
| `drag` | `handle` `panel` (`handle`) | 핸들 전략 |
| `lock` | `<panelId>:<csv>` | 위 |
| `iframeShield` | `0` `1` (`0`) | `1`이면 `<style>`로 `[data-dragging-panel-id] iframe{pointer-events:none}`을 넣는다. `data-dragging-panel-id`는 마우스(HTML5) 드래그의 dragstart에서 트리 루트에 붙는다(`src/components/PanelNodeRenderer.tsx:78`). 터치 경로는 이 속성을 쓰지 않는다 |
| `persist` | `0` `1` (`0`) | `1`이면 localStorage 키 `harbor.layout.<layout>.v1`을 쓴다. 로드 때 키가 있고 JSON으로 읽히면 그것을 초기 트리로 쓴다(검증 없이 그대로. 미등록 키도 통과시킨다). 커밋된 트리가 바뀔 때마다 `JSON.stringify(tree)`를 저장한다. `0`이면 읽지도 쓰지도 않는다. R19(필수 묶음)가 쓰므로 shell과 함께 만든다 |
| `strict` | `0` `1` (`0`) | `1`이면 `<React.StrictMode>`로 감싼다. P1 전용이고 해당 시나리오에 도달했을 때 추가한다 |

임의 트리 주입: 하네스가 `harbor.layout.<layout>.v1`에 원하는 트리 JSON을 써 두고 `?layout=<layout>&persist=1`로 연다. R19의 "미등록 키 → 빈 패널"과 min/max 제약 트리가 이 방법을 쓴다. 새 플래그를 만들지 않는다.

세션 2에서 `mfa-lab/` 아래를 바꿨다면(플래그 추가 포함) 스모크와 S1·S3·S5·S6을 다시 돌린 뒤 계속한다([BRIEF-2-inspect.md](./BRIEF-2-inspect.md)의 「범위와 금지」).

---

## 계측 계약

카운터는 세 수준이다. React 리마운트, DOM 재삽입, iframe 재로드는 서로 다른 결함이라 따로 센다.

| 수준 | 전역 | 누가 쓰는가 | 무엇을 세는가 |
|---|---|---|---|
| host 프레임 | `window.__fc.frames[slot]` | shell의 `PanelFrame`·어댑터 | 프레임 컴포넌트의 마운트·언마운트 |
| 내용 | `window.__mfe[slot]` | remote 모듈 또는 iframe 문서 안의 코드(`createProbe`) | 내용 컴포넌트의 마운트·언마운트, iframe은 문서 로드 |
| DOM 정체성 | `window.__probe.domMoves` | 하네스가 주입한 MutationObserver | 같은 요소가 떼였다 다시 붙은 횟수 |

카운터는 슬롯별로 리마운트를 넘어 누적된다. 갱신은 객체를 새로 만들어 전역 속성에 다시 대입하는 방식으로 한다.

### `window.__fc` (shell, 미실행)

```ts
window.__fc = {
  ready: boolean,                 // 첫 레이아웃 커밋 뒤 true
  error?: string,                 // URL 오류 등으로 shell-error를 그렸을 때
  build: string,                  // shell의 빌드 스탬프
  lib: { source: 'src' | 'npm051' | 'dist', tree: string, commit: string },
  env: { mode: 'prod' | 'dev', mf: 'on' | 'off', layout: string, flags: Record<string, string> },
  reactVersion: string,
  reactRef: { createElement: Function },          // reactSame 비교용 정체성 토큰
  registry: Registry,                             // registry.json 그대로
  getTree(layoutId = 'main'): LayoutNode,         // 커밋된 트리. 미리보기 트리가 아니다
  treeVersion(layoutId = 'main'): number,
  calls: Array<{
    seq: number; t: number; layout: string;
    fn: 'onMovePanel' | 'onResizeBorder' | 'removePanel' | 'insertPanel';
    args: unknown[]; treeVersionBefore: number;
  }>,
  frames: { [slot: string]: {
    kind: 'local' | 'same-tree' | 'mount' | 'iframe';
    frameMounts: number; frameUnmounts: number;
    state: 'loading' | 'ready' | 'error';
    lateResolves?: number;                                              // kind 'mount'
    mirror?: { loads: number; docIds: string[]; lastLoadedAt: number }; // kind 'iframe'
  } },
  bus: { subscriberCount(topic: string): number },
  resetLog(): void                // calls만 비운다. 카운터와 treeVersion은 그대로
};
```

| 필드 | 값의 출처 |
|---|---|
| `lib.source` | 빌드 때의 `LAB_LIB`. `src` = 브랜치 소스 alias, `npm051` = npm 0.5.1(`fc-051`), `dist` = 루트 `dist/index.js` alias(B1-02의 대안을 썼을 때만) |
| `lib.tree` | `git rev-parse HEAD:src` (shallow clone에서도 같은 값이 나오는 트리 해시. 1차 식별자). 문서 작성 시점 값은 `c1da6c9dc03a4811eea42c220be309e5e73b0a4a` |
| `lib.commit` | `git rev-list -1 HEAD -- src` (2차 식별자. shallow clone에서는 HEAD가 나올 수 있다). 문서 작성 시점 값은 `ea25ff7` |
| `build` | 빌드 스탬프(아래) |
| `env.mf` | 빌드 때의 `LAB_MF` |
| `env.flags` | 쿼리스트링 전체 |
| `getTree` | `useLayoutTree`의 `tree`. 미리보기 중의 렌더 구조는 DOM에서 읽어야 한다([HARNESS.md](./HARNESS.md)의 「헬퍼」 `domTree`) |
| `t` | `performance.now()` |

`lib.source`가 `npm051`이면 번들된 라이브러리는 npm 0.5.1이고, `tree`·`commit`은 빌드한 체크아웃을 가리킬 뿐이다. `bare-*` 슬롯은 `PanelFrame`이 없으므로 `frames`에 항목이 없다. `nav`는 프로브가 없으므로 `__mfe`에 항목이 없다. 하네스의 불변식 I7은 이에 맞춰 적용 범위를 나눈다([HARNESS.md](./HARNESS.md)의 「불변식」).

### `window.__mfe[slot]` (내용, `createProbe`가 만든다)

| 유형 | 필드 |
|---|---|
| 공통 (`local`, `same-tree`, `mount`) | `slot`, `remote`, `kind`, `build`, `mounts`, `unmounts`, `instanceSeq`, `reactVersion`, `reactSame` |
| `mount` 추가 | `mountCalls`, `unmountCalls`, `rootsAlive` (mount 모듈이 올린다) |
| `board` 추가 | `dnd: { cardMoves, zoneDrops, copyDrops, lastDragend: { dropEffect, effectAllowed }, lastTypes }` |
| `iframe` (프레임 문서 안의 `window.__mfe[slot]`) | `slot`, `kind: 'iframe'`, `build`, `loads`, `docId`, `loadedAt`, `seen: { dragenter, dragover, drop, pointermove, touchstart }` |

- `instanceSeq`는 가장 최근에 마운트된 인스턴스의 순번(1부터)이다.
- 살아 있는 인스턴스 수는 `mounts - unmounts`다.
- 기대값: `reactSame`은 `orders`·`board`·twin·`control-*`·`control-mount`에서 `true`, `billing`에서 `false`, 단독 페이지에서 `null`.
- 기대값: `kind`는 `orders`·`board`에서 `same-tree`, twin(`orders-local`·`board-local`·`billing-local`)·`control-a..d`·`bare-0..3`에서 `local`, `billing`·`control-mount`에서 `mount`, iframe 슬롯(`telemetry`·`telemetry-x`·`control-iframe`)에서 `iframe`. `PanelFrame`이 있는 슬롯은 `window.__fc.frames[slot].kind`(`PanelFrame`의 `kind` prop)와 같은 값이어야 한다. 다르면 픽스처 버그다.
- iframe 문서의 `__mfe`는 부모에서 직접 읽을 수 없다(cross-origin). 하네스가 프레임별로 읽는다.

### `window.__probe` (하네스가 모든 프레임에 주입)

`{ events: [...], domMoves: { [panelId]: number }, reset() }`. `domMoves`의 키는 슬롯이 아니라 **패널 id**다. 이벤트 레코드의 필드와 수집 규칙은 [HARNESS.md](./HARNESS.md)의 「프로브」가 맡는다. 픽스처 코드는 `__probe`를 읽거나 쓰지 않는다.

### 빌드 스탬프

- 값: 앱을 빌드할 때의 환경 변수 `LAB_BUILD_STAMP`. `ctl build`가 앱마다 넣는다(`--stamp <값>`으로 지정, 없으면 `<UTC yyyymmddThhmmssZ>-<난수 4자리 hex>`로 생성). 직접 `vite build`를 돌려 값이 없으면 `dev`.
- 쓰이는 곳: `window.__fc.build`(shell), `window.__mfe[slot].build`(그 코드를 번들한 빌드), HTML의 `<meta name="harbor-app" content="<app>@<스탬프>">`, `mfa-lab/.run/build.json`.
- 독립 배포 확인: `mfe-orders`만 새 스탬프로 다시 빌드하고 orders preview만 재시작한 뒤, shell을 다시 빌드하지 않은 상태에서 `window.__mfe.orders.build`가 새 값이고 `window.__fc.build`가 그대로인지 본다.
- `<app>` 이름: `shell`, `shell-051`(baseline), `mfe-orders`, `mfe-board`, `mfe-telemetry`. `mfe-billing`의 `public/index.html`은 빌드 때 치환되지 않으므로 고정값 `mfe-billing@static`을 쓴다.

---

## 저장소 구조

```
mfa-lab/
  README.md                      실행 방법(클라우드, Windows). B1-08에서 작성. Windows 실행은 "미검증"으로 표시
  registry.json                  이름·팀·유형·origin·진입점·디렉터리·핀
  contract/                      @harbor/contract
    package.json                 private, 의존성 없음
    CONTRACT.md                  계약 버전 1, 프로브 표면
    src/{index.ts,probe.ts,bus.ts,style.ts}
  scripts/
    ctl.mjs                      의존성 없는 CLI (「실행 모델」). 명령 분기만
    lib/{apps,spawn,ready,pins,browser,doctor,serve,commands,buildinfo}.mjs
                                 apps=레지스트리·활성 집합, spawn=프로세스, ready=준비 판정, pins=핀 검사,
                                 browser=레인 해석, doctor=탐침, serve=serve·status·stop·pid 파일, commands=나머지 명령
  apps/
    shell/
      package.json  package-lock.json  vite.config.ts  index.html  tsconfig.json(편집기용, 게이트 아님)
      src/main.tsx
      src/{instrumentation.ts,bus.ts,tokens.css,lab-env.d.ts}
                                 lab-env.d.ts = vite define 전역 상수(__LAB_*) 선언
      src/topbar/{TopBar.tsx,ExtChip.tsx}
      src/workspace/{Workspace.tsx,store.tsx,layouts.ts,flags.ts,actions.ts,useLoggedLayoutTree.ts,PanelFrame.tsx}
      src/adapters/{SameTreeRemote.tsx,RemoteMount.tsx,IframeRemote.tsx,RemoteErrorBoundary.tsx,resetLoader.ts}
                                 resetLoader.ts = 슬롯별 로더 캐시 비우기 콜백 레지스트리(retry용)
      src/registry/{registry.ts,loaders.ts,remotes.d.ts}
                                 registry.ts = registry.json을 타입 붙여 export
      src/mf/fallbackPlugin.ts   MF 런타임 플러그인(errorLoadRemote). B1-06 사다리 (b)-2에서만 만들고 등록
      src/local/{Bare.tsx,ControlPanel.tsx,NavPanel.tsx,twins.tsx,controlMount.tsx,controlIframe.ts}
    mfe-orders/
      package.json  package-lock.json  vite.config.ts  index.html(단독 페이지)
      src/{Panel.tsx,standalone.tsx}
    mfe-board/                   mfe-orders와 같은 모양
    mfe-billing/
      package.json("type": "module")  package-lock.json  vite.config.ts
      public/index.html          단독 페이지 (lib 모드가 그대로 복사)
      src/{remote-entry.tsx,App.tsx}
    mfe-telemetry/
      package.json  package-lock.json  vite.config.ts  index.html
      src/main.ts
    */node_modules/  */dist/  */dist-*/        (무시)
  e2e/
    package.json  package-lock.json  playwright.config.ts
    lane.json                    커밋. { lane, playwright, chromium }만
    helpers/  smoke/  spike/  explore/  regression/     (구성은 HARNESS.md)
    .artifacts/  test-results/                          (무시)
  .run/                                                 (무시)
    pids.json                    { "<app>": { pid, port, outDir, startedAt } }
    build.json                   { "apps": { "<app>": { buildId, lib, mf, outDir, builtAt, inputs } } }
    lane.local.json              { browsersPath, executablePath, resolvedAt }
    logs/<app>.log
    install/<project>.stamp      lockfile 해시
    pw-browsers/                 랩 로컬 브라우저 설치 위치
```

| 구분 | 내용 |
|---|---|
| 커밋 | 위에서 "(무시)"가 붙지 않은 전부. 프로젝트별 `package-lock.json` 포함 |
| 무시 | `.gitignore`에 이미 있다: `node_modules/`, `dist/`(깊이 무관), `mfa-lab/.run/`, `mfa-lab/e2e/.artifacts/`, `mfa-lab/e2e/test-results/`, `mfa-lab/**/dist-*/` |
| 수정 금지 | 루트 `package.json`, 루트 `package-lock.json`, `src/`, 루트 `tsconfig.json`, 루트 `vite.config.ts` |
| npm 배포 | 루트 `package.json`의 `files` 화이트리스트(`package.json:36-43`)가 `mfa-lab/`과 `doc/`을 패키지에서 제외한다. `.npmignore`는 바꾸지 않는다 |

문서와 결과물의 위치(`doc/qa/` 아래 findings, run 디렉터리, 증거)는 [../README.md](../README.md)의 디렉터리 규칙이 맡는다.

---

## 포트와 origin

모두 `strictPort`, 127.0.0.1에 바인드한다. 5173·5174(`.claude/launch.json`이 사용)와 4173(Vite preview 기본)은 쓰지 않는다.

| 앱 | 포트 | 브라우저에서 쓰는 origin | 준비 확인 (127.0.0.1에서 폴링) | 본문 검사 |
|---|---|---|---|---|
| shell | 4300 | http://127.0.0.1:4300 | `/` | `<meta name="harbor-app" content="shell@<buildId>">` |
| mfe-orders | 4301 | http://127.0.0.1:4301 | `/mf-manifest.json` (MF off면 `/`) | JSON으로 읽히고 `name === "orders"` (MF off면 meta `mfe-orders@`) |
| mfe-board | 4302 | http://127.0.0.1:4302 | `/mf-manifest.json` (MF off면 `/`) | `name === "board"` (MF off면 meta `mfe-board@`) |
| mfe-billing | 4303 | http://127.0.0.1:4303 | `/remote-entry.js` | 문자열 `mount`와 `unmount` 포함 |
| mfe-telemetry | 4304 | http://127.0.0.1:4304 (same-site)와 http://localhost:4304 (cross-site). 프로세스 하나 | `/` | meta `mfe-telemetry@<buildId>` |
| 2차 예약 | 4305~4308 | 127.0.0.1 | — | — |
| shell @ npm 0.5.1 | 4390 | http://127.0.0.1:4390 (`vite preview --outDir dist-051`) | `/` | meta `shell-051@<buildId>` |
| 죽은 origin | 4399 | 아무것도 바인드하지 않는다 | — | — |

- 본문 검사가 필요한 이유: `vite preview`는 `index.html`이 있는 빌드에서 없는 경로에도 `index.html`을 200으로 돌려준다. 상태 코드만 보면 `mf-manifest.json`이 없어도 "준비됨"이 되고, 그 포트를 잡은 다른 프로세스도 통과한다.
- `buildId`는 `.run/build.json`의 값과 같아야 한다. `build.json`이 없으면 `<app>@` 접두만 확인한다.
- 모든 URL의 기준은 `127.0.0.1`이다. `localhost`는 cross-site iframe 슬롯에만 나오고, 닿는지는 Node가 아니라 브라우저 안에서 확인한다.
- site 구분: `127.0.0.1:4300`과 `127.0.0.1:4304`는 포트만 다르므로 cross-origin이지만 same-site다. `localhost`와 `127.0.0.1`은 서로 다른 site다.
- `localhost`가 리스너에 닿지 않을 때의 대안: Chromium 실행 인자 `--host-resolver-rules=MAP crosssite.test 127.0.0.1`과 telemetry의 `preview.allowedHosts: ['crosssite.test']`, 그리고 `registry.json`의 `telemetry-x.origin`을 `http://crosssite.test:4304`로 바꾼다. 그것도 안 되면 `telemetry-x` 열만 `env-limit`이 된다.

---

## 실행 모델

모든 명령은 저장소 루트에서 실행하고 Linux(클라우드)와 Windows(사용자 PC)에서 같은 형태다. 훅, 설정 스크립트, `.mcp.json`은 필요 없다. 준비는 아래 명령으로만 한다.

### 명령 (`node mfa-lab/scripts/ctl.mjs <cmd>`)

"Bash timeout"은 Bash 도구 호출에 넘길 `timeout` 값(ms)이다. 클라우드의 포그라운드 Bash는 기본 2분, 최대 10분이다(https://code.claude.com/docs/en/tools-reference).

| 명령 | 하는 일 | Bash timeout |
|---|---|---|
| `doctor [--write <path>]` | 환경 탐침(아래). `e2e/lane.json`이 있으면 그 레인의 Chromium을 찾아 `.run/lane.local.json`에 쓴다. 찾지 못하면 `lane.local.json`을 쓰지 않고 결과에 `lane: "missing"`으로 기록한 뒤 **0으로 끝난다**(실패가 아니다. 설치는 `install`, 판정은 `up`·`test`가 한다). `--write`면 결과 JSON을 그 경로에 쓴다(`doc/qa/<run>/env.json`). Node가 22.12 미만이면 메시지를 내고 0이 아닌 코드로 끝난다(스크립트 안에서 Node를 바꾸지 않는다) | 기본 |
| `install [--only a,b] [--fresh]` | 활성 프로젝트(앱 + `e2e`)마다: lockfile이 있으면 `npm ci`, 없으면 `npm install`(처음. 생긴 lockfile은 커밋한다). `--no-audit --no-fund`, 동시 3개. lockfile 해시 stamp가 같으면 건너뛴다. `--fresh`는 `node_modules`와 lockfile을 지우고 `npm install`한다. 브라우저 설치도 여기서 한다: `e2e/lane.json`이 있고 `.run/lane.local.json`이 없으면(새 VM. `.run/`은 git 무시 경로라 바이너리가 없다) 그 레인의 브라우저를 설치한다. 레인 A는 다운로드 없음(`/opt/pw-browsers`를 그대로 쓴다). 레인 B는 `node mfa-lab/e2e/node_modules/@playwright/test/cli.js install chromium`(자식 환경에서 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`를 지우고 `PLAYWRIGHT_BROWSERS_PATH=<repo>/mfa-lab/.run/pw-browsers`). 레인 C는 `curl -fL --retry 2`로 Chrome for Testing 141.0.7390.37 headless shell zip을 `mfa-lab/.run/dl/cft-141.zip`에 받아 `mfa-lab/.run/pw-browsers/cft-141/`에 푼다. 명령 전문은 [RECIPES.md](./RECIPES.md) 9절, 레인 규칙은 [HARNESS.md](./HARNESS.md)의 「브라우저 레인」. 설치 실패는 0이 아닌 코드로 끝나되 레인을 바꾸지 않는다 | 600000 |
| `build [--only a,b] [--lib src\|npm051\|dist] [--mf on\|off] [--stamp <s>] [--force]` | 앱별 `vite build`. remote 먼저, shell 나중. 입력이 그대로면 건너뛴다(앱 디렉터리 + `mfa-lab/contract` + shell은 저장소 `src/`·twin 소스·`registry.json`). `--lib npm051`은 shell을 `dist-051`로 빌드한다. `.run/build.json` 기록 | 300000 |
| `serve [--baseline] [--only a,b] [--foreground]` | 활성 앱마다 `vite preview`를 띄운다. 준비 확인(상태 200 + 본문 검사)에 이미 통과하는 앱은 건너뛴다(멱등). 250ms 간격으로 최대 60초 폴링. `.run/pids.json` 기록. 실패하면 로그 끝부분을 출력하고 0이 아닌 코드. `--baseline`은 :4390도 띄우되 `dist-051`이 없으면 경고만 내고 넘어간다. 활성 앱이 없으면 아무것도 하지 않고 0 | 기본 |
| `status [--json]` | 활성 앱별 pid 생존 + 준비 확인. 전부 떠 있을 때만 0 | 기본 |
| `smoke` | 브라우저 없이 하는 검사(아래) | 기본 |
| `stop [--only a,b]` | Linux `process.kill(-pid, 'SIGTERM')`, Windows `taskkill /pid <pid> /T /F`. `pids.json` 정리 | 기본 |
| `up` | `doctor` → 필요하면 `install`(의존성 + 위 규칙대로 레인 브라우저) → `doctor`의 lane 해석 재실행 → `lane.json`이 있는데 이때도 못 찾으면 **BLOCKED-LANE**(메시지를 내고 0이 아닌 코드로 끝난다. 레인을 조용히 바꾸지 않는다. [BRIEF-1-build.md](./BRIEF-1-build.md)의 「중단 조건」) → 낡았으면 `build`(`--lib src`, 그리고 shell `package.json`에 `fc-051`이 있으면 `--lib npm051`도) → `serve --baseline` → `smoke`. 복구용 단일 명령. `lane.json`이 아직 없으면(B1-01 전) lane 단계는 건너뛴다 | 600000 |
| `test <filter> [--project mouse\|touch]` | `serve --baseline`을 먼저 실행한 뒤 `node mfa-lab/e2e/node_modules/@playwright/test/cli.js test -c mfa-lab/e2e/playwright.config.ts <filter> --project <p>`를 실행한다. `--project`는 항상 넘긴다(기본 `mouse`). 호출 한 번에 스펙 파일 하나 또는 폴더 하나. 종료 코드는 Playwright의 것 | 600000 |

`--only`에 쓰는 이름: `shell`, `shell-051`, `mfe-orders`, `mfe-board`, `mfe-billing`, `mfe-telemetry`, `e2e`(install만).

처음 설치할 때는 `up` 하나로 10분을 넘길 수 있다. 그때는 `install`, `build`를 따로 실행한 뒤 `up`을 부른다.

### 활성 집합

`registry.json`은 처음부터 모든 앱을 적어 두지만, `serve`·`status`·`smoke`·`install`·`build`는 **디렉터리와 `package.json`이 존재하는 앱만** 기대한다. 아직 만들지 않은 remote 때문에 게이트가 실패하지 않는다. baseline(`shell-051`)은 빌드는 shell `package.json`에 `fc-051`이 있을 때, 서빙은 `apps/shell/dist-051/index.html`이 있을 때만 기대한다.

### doctor가 기록하는 것

| 항목 | 방법 |
|---|---|
| 네트워크 | `curl -sS -o /dev/null -w '%{http_code}' https://<host>/` (대상: `registry.npmjs.org`, `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`, `storage.googleapis.com`)와 `npm ping`. 코드가 `000`이 아니면 닿는 것으로 본다. 둘 다 프록시 환경 변수를 따른다. Node 내장 `fetch`는 `NODE_USE_ENV_PROXY=1`(Node 22.21 이상) 없이는 프록시를 무시하므로(https://github.com/nodejs/node/pull/57165) 외부 탐침에 쓰지 않는다 |
| 프록시 | `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`와 소문자 변형. 값의 `user:pass@` 부분은 지우고 기록한다(env.json은 커밋된다) |
| 권한 | `id -u`, `sudo -n true`의 성공 여부 (Windows에서는 `n/a`) |
| git | `git rev-parse --is-shallow-repository`, `git rev-parse HEAD`, 브랜치 이름, `git rev-parse HEAD:src`, `git rev-list -1 HEAD -- src` |
| 런타임 | `node -v`, `npm -v`, 플랫폼 |
| 브라우저 | `/opt/pw-browsers` 목록, `PLAYWRIGHT_*` 환경 변수, `mfa-lab/.run/pw-browsers` 목록 |
| 포트 | 4300~4304, 4390의 사용 여부. 로컬 확인은 Node로 한다(프록시를 타지 않아야 한다) |
| lane | `e2e/lane.json`이 있으면 그 레인의 Chromium을 찾아 `.run/lane.local.json`에 `{ browsersPath, executablePath, resolvedAt }`를 쓴다. 찾는 위치: 레인 A `/opt/pw-browsers/chromium-1194` 또는 `chromium_headless_shell-1194` → `browsersPath: "/opt/pw-browsers"`; 레인 B `mfa-lab/.run/pw-browsers/chromium-1243` 또는 `chromium_headless_shell-1243` → `browsersPath: "<repo>/mfa-lab/.run/pw-browsers"`(수동 설치 `manual-153/`이면 그 실행 파일을 `executablePath`로); 레인 C `mfa-lab/.run/pw-browsers/cft-141/chrome-headless-shell-linux64/chrome-headless-shell` → `executablePath`. 찾지 못하면 `lane.local.json`을 쓰지 않고 `lane: "missing"`으로 기록한 뒤 0으로 끝난다. 설치 여부 판단과 BLOCKED-LANE 판정은 `up`·`install`·`test`의 몫이다. 레인을 조용히 바꾸지 않는다 |

`mfa-lab/e2e/lane.json`(커밋)에는 `{ lane, playwright, chromium }`만 둔다. 머신 경로는 `.run/lane.local.json`(무시)에만 둔다. `ctl test`는 `browsersPath`가 있으면 자식 환경에 `PLAYWRIGHT_BROWSERS_PATH`로 넘기고, `executablePath`는 `playwright.config.ts`가 `.run/lane.local.json`에서 읽는다([HARNESS.md](./HARNESS.md)의 「Playwright 설정」). `lane.json`은 있는데 `.run/lane.local.json`이 없으면(새 VM) `ctl test`는 `doctor`의 lane 해석을 먼저 실행한다. 그래도 `missing`이면 `test`는 브라우저를 설치하지 않고 "`ctl up` 또는 `ctl install`을 먼저 실행하라"는 메시지를 내고 0이 아닌 코드로 끝난다. `install` 뒤에도 못 찾는 경우만 BLOCKED-LANE이다.

### smoke가 검사하는 것

| 검사 | 통과 조건 |
|---|---|
| 핀 | 활성 프로젝트의 `package.json`에서 `registry.json` `pins`에 있는 의존성이 핀과 정확히 같다. `^`·`~` 없음 |
| 보호 경로 | `git status --porcelain -- package.json package-lock.json tsconfig.json vite.config.ts`(루트 파일)가 비어 있다. `src`에 변경이 있으면 경고만 낸다(수정 세션에서는 `src/`를 고치는 것이 정상이다) |
| 준비 확인 | 활성 앱 전부가 「포트와 origin」의 상태 200 + 본문 검사를 통과 |
| MF 매니페스트 | (`build.json`의 shell `mf`가 `on`일 때만) `/mf-manifest.json`의 `name`이 맞고 `exposes`에 `Panel`이 있다(실행 확인: 40ac74c. 모양은 「B1-08 구축 결과」) |
| billing 단독 페이지 | :4303의 `/`가 `remote-entry.js`를 참조하는 HTML |
| lockfile (경고만) | 각 lockfile에 `@rollup/rollup-win32-x64-msvc`와 `@esbuild/win32-x64`가 있다. 없으면 경고를 낸다(게이트 아님) |

Playwright의 `globalSetup`은 쓰지 않는다. 서버 보장은 `ctl test`가 맡는다. 그래서 어떤 단계도 "서버가 Bash 호출·30분 백그라운드 제한·VM 일시정지를 넘어 살아 있을 것"에 의존하지 않는다.

### 서버 프로세스

- 실행 형태: `node <app>/node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port <port> --strictPort [--outDir dist-051]`, cwd는 앱 디렉터리. npx와 셸을 쓰지 않는다. `detached: true`, stdio는 `.run/logs/<app>.log`, `unref()`.
- 경로는 `fileURLToPath`로 만든다. 사용자 PC의 저장소 경로에 ASCII가 아닌 문자가 있다.
- npm은 win32에서 `shell: true`로 spawn한다(인자는 고정 목록). Node 20.12 이상은 셸 없이 `.cmd`를 spawn하면 `EINVAL`을 던진다(CVE-2024-27980 대응).
- 분리된 자식이 Bash 호출과 함께 죽는 환경이면(클라우드에서의 동작은 문서에 없다. B1-02에서 새 Bash 호출로 `status`를 실행해 확인한다) `serve --foreground`를 `run_in_background`와 timeout 7200000으로 띄운다. 백그라운드 명령은 timeout을 주지 않으면 30분 뒤 멈추고 최대 2시간이다.
- 세션을 끝낼 때 `ctl stop`을 실행한다(CLAUDE.md: 새로 띄운 서버는 작업 뒤 종료).
- 의존성을 바꾼 뒤에는 그 프로젝트의 lockfile을 처음부터 다시 만든다(`ctl install --only <app> --fresh`). `node_modules`가 있는 상태에서 의존성만 추가하면 다른 플랫폼용 optional 패키지가 lockfile에서 빠질 수 있고, 그러면 Windows의 `npm ci`가 실패한다.
- Windows 실행은 검증하지 않았다. `mfa-lab/README.md`에 "미검증"으로 적는다.

### 빌드 입력

`ctl build`가 자식 프로세스에 넘기는 환경 변수다. 각 `vite.config.ts`가 읽어 `define`과 alias를 정한다(본문은 [RECIPES.md](./RECIPES.md)).

| 변수 | 값 | 쓰는 곳 |
|---|---|---|
| `LAB_LIB` | `src` \| `npm051` \| `dist` | shell: 라이브러리 alias 대상과 `outDir`(`npm051`이면 `dist-051`) |
| `LAB_MF` | `on` \| `off` | shell: `off`면 `orders/Panel`·`board/Panel`을 remote 소스로 alias |
| `LAB_BUILD_STAMP` | 스탬프 문자열 | 모든 앱 |
| `LAB_LIB_TREE`, `LAB_LIB_COMMIT` | `git rev-parse HEAD:src`, `git rev-list -1 HEAD -- src` | shell |

### 실행 모드

| 모드 | 내용 | 지위 |
|---|---|---|
| prod | 모든 앱이 `vite build` + `vite preview` | 유일한 판정 기준. `@module-federation/vite`의 상위 CI가 다루는 조합은 build + preview뿐이다(https://raw.githubusercontent.com/module-federation/vite/main/playwright.config.ts). `devWarn`과 React 개발 경고가 빠지므로 오라클은 콘솔 문구가 아니라 `window.__fc.calls`, `treeVersion`, 트리·DOM 스냅샷, 카운터다 |
| npm 0.5.1 baseline | shell을 `--lib npm051`로 빌드해 :4390에서 서빙. 대조군 레이아웃만 쓴다 | 양성 대조(S5) 전용. 스파이크, B1-06 재실행, B1-08 인계 스모크, 세션 2 사전 점검에서 실행한다. 0.5.1은 알려진 버그(소스 리마운트 후 취소 시 미리보기 잔존: [doc/TODO.md](../../TODO.md))가 있으므로 하네스가 이를 잡지 못하면 하네스를 믿을 수 없다 |
| MF degraded (`--mf off`) | federation 사다리를 다 써도 안 될 때만. remote 지정자가 remote 소스의 alias가 된다 | `MF: degraded`로 기록. 조건부 GO이고 사용자가 인지해야 한다. R16과 모든 remote-vs-twin 비교는 `blocked (MF degraded)` |
| dev-host 패스 | shell만 `vite --force`(dev), remote는 preview. `devWarn` 콘솔 수집용 | 보류. P1. 어떤 것도 막지 않는다 |
| packed-tarball 패스 | 루트에서 `npm run build && npm pack` 한 tarball을 shell에 설치 | 보류. P1. 루트 설치가 필요하므로 실행하면 기록한다 |

### 루트 node_modules 정책

- 클라우드 세션은 저장소 루트에서 `npm ci`를 실행하지 않는다. 루트 `node_modules`가 없으면 alias된 라이브러리 소스의 `react`는 `resolve.dedupe`로만 풀리므로, 설정이 틀리면 React가 두 벌 로드되는 대신 빌드가 실패한다.
- 사용자 Windows PC에는 루트 `node_modules`(React 19.x)가 있다. 그 경우는 `dedupe`가 중복을 막는다.
- 예외: B1-02에서 소스 alias가 실패했을 때의 대안(루트에서 `npm ci && npm run build` 후 `dist/index.js`를 alias, `--lib dist`). 썼으면 STATE.md와 SPIKE.md에 기록한다.
- CLAUDE.md의 "검증" 규칙(`npm run type-check`, `npm run build`)은 `src/` 변경에만 적용된다. `mfa-lab/`의 확인 방법은 `ctl smoke`와 스모크 스펙이다.

### VM 일시정지·회수 뒤 재개

클라우드 VM은 몇 분 쉬면 일시정지되고 이후 회수될 수 있다. 실행 중이던 프로세스는 복구되지 않는다(https://code.claude.com/docs/en/cloud-environments).

1. `git status --short && git log --oneline -3`
2. [STATE.md](./STATE.md)를 읽는다.
3. `node mfa-lab/scripts/ctl.mjs up` (timeout 600000)
4. `node mfa-lab/scripts/ctl.mjs test smoke`
5. 체크되지 않은 첫 단계부터 계속한다. 푸시하지 않은 작업은 사라진 것으로 본다.

새 VM에는 `.run/`이 없으므로 `up`이 레인 브라우저를 다시 설치한다(레인 A는 설치 없음). `install` 뒤에도 커밋된 레인의 브라우저를 찾지 못해 `up`이 BLOCKED-LANE으로 끝나면 멈추고 보고한다. 레인을 조용히 바꾸지 않는다.

### 커밋 위생

- 경로를 명시해 stage한다. `git add -A`와 `git add .`는 쓰지 않는다.
- 커밋 전에 `git status --short`와 `git diff --cached --stat`을 확인한다. 브라우저 바이너리, `dist*`, `.run/`, `node_modules`가 보이면 멈춘다.
- 스펙이 초록이 될 때마다 WIP 커밋 + 푸시를 해도 된다.
- 커밋·푸시 허락과 범위(`mfa-lab/`, `doc/qa/`, `.gitignore`)는 사용자가 붙여넣는 프롬프트에 있다([PROMPTS.md](./PROMPTS.md)).

---

## 공개 API 커버리지

`src/index.ts:1-20`의 export, `TreeLayout`의 props(`src/components/TreeLayout.tsx:21-40`), `useLayoutTree`의 반환값(`src/hooks/useLayoutTree.ts:164-175`)을 전부 나열한다. 시나리오 ID는 [BRIEF-1-build.md](./BRIEF-1-build.md)의 「스파이크 표」(S*)와 [BRIEF-2-inspect.md](./BRIEF-2-inspect.md)의 「시나리오 표」(R*)에 정의돼 있다.

### export

| export | run 01 | 어디서 / 제외 이유 |
|---|---|---|
| `TreeLayout` | 포함 | 모든 시나리오 |
| `useLayoutTree` | 포함 | `useLoggedLayoutTree`를 통해 |
| `createComponentStore` | 포함 | `store.tsx`. 초기값 등록 경로만 |
| 타입 `ComponentStore` | 일부 | `get`·`has`는 라이브러리가 렌더 때 호출(`src/components/PanelNodeRenderer.tsx:132-133`), 미등록 키는 R19. `register`·`unregister`(늦은 등록)는 범위 밖: 리렌더를 일으키지 않는다고 문서화된 동작이고 2차 H-STORE-LATE에서 다룬다 |
| `getFirstPanelId`, `getPanelIds`, `insertPanelIntoTree` | 범위 밖 (직접 호출) | 브라우저 입력과 무관한 순수 함수다. `getPanelIds`는 `panelIds`를 통해(`src/hooks/useLayoutTree.ts:45`), `insertPanelIntoTree`는 `insertPanel`을 통해(`src/hooks/useLayoutTree.ts:157`) 간접 실행된다 |
| 타입 `LayoutNode`, `PanelNode`, `SplitNode`, `SplitDirection`, `LayoutDirection`, `DropPosition`, `InsertPanelInit`, `InsertAt` | 범위 밖 | 컴파일 타임 전용. 픽스처 타입 검사는 게이트가 아니다 |

### `TreeLayout` props

| prop | run 01 | 어디서 / 제외 이유 |
|---|---|---|
| `tree`, `components` | 포함 | 모든 시나리오 |
| `onMovePanel` | 포함 | 커밋되는 드래그(S1, S7a, R02 등)에서 호출, 취소 경로(S2~S5, R01, R07)에서 호출되지 않음을 `window.__fc.calls`로 확인 |
| `onResizeBorder` | 포함 | S6, R08(c), R15, R17, R19 |
| `dragHandleSelector` | 포함 | 기본(`[data-drag-handle]`)은 모든 시나리오. 미지정은 S7b(기록만)와 P1 |
| `direction` | 범위 밖 | 단일 축 제한은 드롭 판정의 부분집합이고 MFA 고유 상호작용이 없다. 기본값 `"complex"`만 쓴다 |
| `width`, `height` | 기본값만 | 100%로 부모를 채우는 경로만. 명시 값은 범위 밖 |
| `backgroundColor`, `margin`, `padding` | 범위 밖 | 외관. 워크스페이스 padding은 wrapper에 준다 |
| `resizerThickness`, `resizerLength`, `resizerColor`, `resizerHoverColor`, `resizerHoverOnly` | 범위 밖 | 외관. 기본값 경로는 스모크(`[data-ftl-styles]` 존재, 리사이저 커서)와 R17의 화면 확인으로 본다 |

### `useLayoutTree` 반환값

| 반환값 | run 01 | 어디서 / 제외 이유 |
|---|---|---|
| `tree` | 포함 | 모든 시나리오 |
| `movePanel` | 포함 | 드래그 커밋 전부 |
| `resizeBorder` | 포함 | S6, R15, R17, R19 |
| `removePanel`, `insertPanel` | 포함 | R17 (Nav의 `nav-toggle-board`) |
| `panelIds` | 포함 | R17 (토글 상태 판단) |
| `hasPanel` | 범위 밖 | `panelIds`와 같은 정보 |
| `firstPanelId` | 범위 밖 | 순수 셀렉터. 상호작용 경로 없음 |
| `setTree` | 범위 밖 | 복원은 `initialTree`로 한다. 외부 상태 관리 연동은 1차 범위가 아니다 |
| `splitPanel` | 범위 밖 | 프로그램 호출 전용. 결과 구조는 `insertPanel`의 앵커 삽입과 같고 사용자 입력 경로가 아니다 |

### 노드 옵션과 기능

| 기능 | run 01 | 어디서 |
|---|---|---|
| `draggable` / `droppable` / `resizable` | 포함 | `nav`(S2, S4, R07, R14, R17), `?lock=`(R11) |
| `minWidth` / `maxWidth` / `minHeight` / `maxHeight` (패널·split) | 포함 | R19(1280·800 폭에서 px 확인, 창 리사이즈와 경계선 드래그 모두), R17(`nav` 200, `orders` 320, 아래 split 160) |
| 직렬화 왕복 | 포함 | R19 (`?persist=1`) |
| 콘텐츠 오버플로우 스크롤 | 포함 | R19, R17 |
| 터치 경로 | 포함 | 핸들 드래그 S7a, R13, R14, R18. 롱프레스는 S7b(기록만)와 P1 |
| 중첩 `TreeLayout`, 여러 인스턴스 | 범위 밖 | 2차 (`mfe-planner`) |

---

## 코딩 규칙 예외

`mfa-lab/` 코드도 저장소 규칙([CLAUDE.md](../../../CLAUDE.md): arrow function, named export, `import type`, 불변 업데이트)을 따른다. `.mjs` 스크립트도 같다. 허용된 예외는 다음뿐이다.

| 예외 | 위치 | 근거 |
|---|---|---|
| 외부 의존성 | `mfa-lab/` 각 프로젝트의 `package.json` | CLAUDE.md의 예외 한 줄. 루트 `package.json`·lockfile·`src/`는 그대로 |
| `export default` | `vite.config.ts`, `playwright.config.ts` | 도구가 강제 |
| `{ default: m.Panel }` | `SameTreeRemote`의 `React.lazy` 어댑터 | `React.lazy`가 `default` 키를 요구. remote 자체는 named export만 쓴다 |
| class | `RemoteErrorBoundary` | 에러 경계는 class 컴포넌트만 가능 |
| class (2차) | 커스텀 엘리먼트 | 플랫폼이 강제 |

예외가 아닌 것: 계측 전역(`window.__fc`, `window.__mfe`)은 값 객체를 spread로 새로 만들어 다시 대입한다. 전역 속성 대입 자체는 피할 수 없는 유일한 쓰기다.

---

## 2차 백로그

세션 1·2에서는 만들지 않는다. run 01의 REPORT.md를 보고 무엇을 어떤 순서로 만들지 정한다. 포트 4305~4308을 예약해 둔다.

| 항목 | 내용 | 겨냥하는 가설 |
|---|---|---|
| `mfe-alerts` (Notifications 팀) | open Shadow DOM을 가진 커스텀 엘리먼트 + 자기 React 루트. connect/disconnect 수를 엘리먼트 클래스 안에서 센다 | H-SHADOW-HANDLE, H-SHADOW-END |
| `mfe-planner` (Route Planning 팀) | 중첩 `TreeLayout`을 그리는 same-tree MF remote. 라이브러리 사본을 자기 번들에 가진다. 사본을 공유하는 경우는 shell 로컬 twin으로 만든다(라이브러리는 federation으로 공유하지 않는다). 중첩 레이아웃은 `window.__fc.calls`에 자기 레이아웃 id로 기록 | H-NEST-START, H-NEST-SCOPE, H-TOUCH-ANCHOR, H-TOUCH-SESSION, H-STYLE-FIRSTCOPY |
| `mfe-audit` (Compliance 팀) | `mfe-billing`의 React 18.3.1 판. 같은 mount 계약. `react`를 공유하지 않는다 | React 메이저 공존 |
| 공격적 전역 CSS 플래그 (Growth 팀) | 기존 remote 하나에 플래그로 켠다. 한 번에 변수 하나 | CSS 누출 내성 |
| shadow root 안의 레이아웃 | shell의 `TreeLayout`을 shadow root 안에 렌더 | H-SHADOW-LAYOUT |
| 늦은 store 등록 | 레이아웃이 그려진 뒤 `register` | H-STORE-LATE |
| 느린 remote | 지연 주입 | 로딩 상태에서의 드래그 |

1차에서 2차로 미룬 이유: 첫 클라우드 실행은 실패를 픽스처·하네스·라이브러리 중 어디에 귀속할지 가릴 수 있을 만큼 작아야 한다. 실패하는 remote(R16)만 1차로 당겼다. 추가 프로젝트가 필요 없고, 장애 격리는 MFA shell의 핵심이기 때문이다.
