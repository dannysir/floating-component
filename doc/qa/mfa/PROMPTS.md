# PROMPTS — 세션 시작 프롬프트와 사용자가 직접 하는 일

> **이 문서는**
> - 사용자가 읽는 문서다. 클라우드 세션을 시작할 때 붙여넣는 프롬프트 3종(구축·검수·수정)과, 사용자가 손으로 해야 하는 일의 순서를 담는다.
> - 프롬프트는 짧다. 일의 내용은 브리프([BRIEF-1-build.md](./BRIEF-1-build.md), [BRIEF-2-inspect.md](./BRIEF-2-inspect.md), [../FIXING.md](../FIXING.md))에 있고, 프롬프트는 브리프를 가리키고 **허락과 범위**를 전달한다.
> - 계획 승인과 커밋·푸시·설치 허락은 `CLAUDE.md`가 아니라 여기의 프롬프트로 준다 ([../README.md](../README.md) "결정 로그" D6). 그래서 프롬프트의 허락 문장을 지우지 않는다.
> - 상태(2026-10-02): 아래 절차는 **미실행**이다. 클라우드 화면의 메뉴 이름은 달라질 수 있다.

---

## 1. 사용자가 직접 하는 일

### 준비 (한 번)

1. **GitHub 연결과 클라우드 환경을 확인한다.** Claude Code 웹(claude.ai/code)에서 이 저장소(`dannysir/floating-component`)를 선택할 수 있는지, 사용할 클라우드 환경이 있는지 본다.
2. **네트워크 설정을 바꾼다 (권장).** 클라우드 환경 설정에서 네트워크 접근을 **Custom**으로 하고, 기본 허용 목록을 함께 포함하는 옵션을 켠 뒤 아래 두 호스트를 추가한다.
   - `cdn.playwright.dev`
   - `playwright.download.prss.microsoft.com`
   - 이유: Playwright가 Chromium을 내려받는 호스트인데 기본 허용 목록에 없다. `registry.npmjs.org`와 `storage.googleapis.com`은 기본 목록에 있다 ([클라우드 환경 문서](https://code.claude.com/docs/en/cloud-environments)).
   - 하지 않으면: 클라우드 이미지에 들어 있다고 보고된(미확인) 구버전 Chromium 141이나 `storage.googleapis.com`에서 직접 받은 빌드만 쓸 수 있고, 터치 결과 일부가 "환경 한계"가 된다. 어느 브라우저를 쓰게 되는지는 세션 1이 확인해 `STATE.md`에 적는다.
   - 설정 스크립트(setup script)는 필요 없다.
3. **`qa/mfa-lab` 브랜치가 푸시돼 있는지 확인한다.** 클라우드 VM은 로컬 작업 폴더가 아니라 GitHub의 브랜치를 clone한다 ([Claude Code 웹 문서](https://code.claude.com/docs/en/claude-code-on-the-web)).

### 세션 1 — 구축

4. **세션을 시작한다.** 저장소 하나만 붙인 세션으로, 브랜치는 `qa/mfa-lab`, 권한 모드는 **자동 수락**(계획 모드가 아님)으로 한다. 2절의 구축 프롬프트를 첫 메시지로 붙여넣는다.
5. **한 세션에 끝나지 않으면 같은 프롬프트로 이어간다.** 같은 세션을 다시 열어 "계속"이라고 하거나, 새 세션을 그 세션의 작업 브랜치(이름은 `STATE.md`에 적혀 있다)에서 시작해 같은 프롬프트를 붙여넣는다. 세션은 `STATE.md`를 읽고 체크되지 않은 첫 단계부터 이어간다.
6. **`doc/qa/BLOCKED.md`가 생기면** 5절을 따른다.
7. **세션 1이 끝나면**
   - `doc/qa/run00-spike/SPIKE.md`를 읽는다. 게이트 결과와 GO/NO-GO 권고가 있다. 판단 기준은 [BRIEF-1](./BRIEF-1-build.md) "GO 기준".
   - GO 여부를 정한다. 조건부 GO(caveat)면 영향받는 시나리오가 `blocked`로 기록된다는 점을 받아들이는 것이다. NO-GO면 세션 2를 시작하지 않고, SPIKE.md가 제안하는 조치를 한 뒤 구축 프롬프트로 다시 세션을 연다.
   - 세션의 작업 브랜치를 **PR로 `qa/mfa-lab`에 머지**한다. squash하지 말고 머지 커밋으로 합친다 (`STATE.md`가 단계별 커밋 해시를 기록한다).

### 세션 2 — 검수

8. **세션을 시작한다.** 4번과 같은 방식으로 `qa/mfa-lab`에서 시작한다. 3절의 검수 프롬프트 **첫 줄의 `...`을 채워** 붙여넣는다. caveat가 없으면 `없음`, 있으면 SPIKE.md 권고에 적힌 표시를 그대로 쓴다 (예: `MF: degraded`, `터치: env-limit`, `telemetry-x: env-limit`, `blocked(billing)`. 여러 개면 쉼표로 잇는다). 이 줄이 없으면 세션 2는 사전 점검에서 멈춘다.
9. 끊기면 5번, `BLOCKED.md`가 생기면 5절을 따른다.
10. **세션 2가 끝나면**
    - `doc/qa/run01-tier1/REPORT.md`를 읽는다 (커버리지 표, 발견 목록, 수정 대기열).
    - 작업 브랜치를 PR로 `qa/mfa-lab`에 머지한다 (머지 커밋).
    - REPORT.md "사용자 결정 대기"의 질문에 답한다.
    - 수정 대기열을 `doc/TODO.md`로 옮긴다 ([../FIXING.md](../FIXING.md) 11절. 첫 수정 세션에 맡겨도 된다).

### 수정 — 발견 1건씩

11. **발견 1건마다 세션 하나.** `qa/mfa-lab`에서 세션을 시작하고 4절의 수정 프롬프트에서 `FC-QA-NNN`을 고칠 발견 ID로 바꿔 붙여넣는다. 순서는 REPORT.md "수정 대기열"을 따른다. 끝나면 PR을 머지 커밋으로 `qa/mfa-lab`에 합친다.
    - 사용자 PC에서 고칠 때도 같은 프롬프트를 쓴다. 차이는 [../FIXING.md](../FIXING.md) 3절·12절.

### 수동 확인 (클라우드에서 볼 수 없는 것)

12. REPORT.md "환경 한계와 수동 확인"의 항목을 직접 확인한다. 최소한 다음 둘이다.
    - 실제 마우스로 잠긴 패널 위에 드래그했을 때 금지(`not-allowed`) 커서가 보이는지
    - 실기기 터치 (Android Chrome, iOS Safari)

---

## 2. 구축 프롬프트 (세션 1)

```
doc/qa/mfa/BRIEF-1-build.md를 처음부터 끝까지 읽고 그대로 수행해줘. 판정 규칙은 doc/qa/README.md, 설계는 doc/qa/mfa/ARCHITECTURE.md·RECIPES.md·HARNESS.md에 있어.
- 이 브리프는 내가 승인한 계획이야. 계획 모드나 추가 계획 승인 없이 바로 진행해.
- 먼저 doc/qa/mfa/STATE.md를 읽고 체크되지 않은 첫 단계부터 이어서 해. 작업 브랜치 이름을 STATE.md와 최종 보고에 적어줘.
- 변경 범위는 mfa-lab/, doc/qa/, .gitignore뿐이야. src/, 루트 package.json, 루트 package-lock.json은 절대 수정하지 마.
- 허락: mfa-lab/ 아래 각 프로젝트에서 npm install·npm ci, Playwright Chromium 설치(cdn.playwright.dev, playwright.download.prss.microsoft.com, storage.googleapis.com에서 내려받기), apt로 브라우저 의존 패키지 설치(install-deps).
- CLAUDE.md의 "검증" 규칙(type-check, build)은 src/ 변경에만 적용돼. 브리프가 지시한 경우가 아니면 루트에서 npm ci를 실행하지 마.
- 단계가 끝날 때마다 STATE.md를 갱신하고 커밋·푸시해. 스테이징은 경로를 명시해서 하고(git add -A 금지), 위 범위의 커밋·푸시는 미리 허락한다.
- 브리프의 중단 조건에 해당하면 doc/qa/BLOCKED.md를 쓰고 커밋·푸시한 뒤 멈추고 나에게 보고해.
- 라이브러리 버그로 보이는 것을 발견해도 고치지 말고 doc/qa/run00-spike/SPIKE.md에 메모만 해.
- 끝나면 node mfa-lab/scripts/ctl.mjs stop으로 서버를 내리고, 단계별 게이트 결과와 SPIKE.md의 GO/NO-GO 권고, 작업 브랜치 이름을 요약해줘.
```

---

## 3. 검수 프롬프트 (세션 2)

첫 줄의 `...`을 채운다 (1절 8번).

```
SPIKE.md를 읽었고 GO(caveat: ...)로 결정했다.
doc/qa/mfa/BRIEF-2-inspect.md를 처음부터 끝까지 읽고 그대로 수행해줘. 판정 규칙은 doc/qa/README.md를 따라.
- 이 브리프는 내가 승인한 계획이야. 계획 모드나 추가 계획 승인 없이 바로 진행해.
- 먼저 doc/qa/mfa/STATE.md와 doc/qa/run00-spike/SPIKE.md를 읽고, 브리프의 사전 점검을 통과한 뒤 체크되지 않은 첫 단계부터 이어서 해. 작업 브랜치 이름을 STATE.md와 최종 보고에 적어줘.
- 변경 범위는 mfa-lab/, doc/qa/, .gitignore뿐이야. src/, 루트 package.json, 루트 package-lock.json은 절대 수정하지 마.
- 라이브러리(src/) 문제는 고치지 말고 doc/qa/findings/에 1건당 파일 하나로 기록해. 픽스처·하네스(mfa-lab/) 결함은 브리프 규칙대로 고치고 REPORT.md에 남겨.
- 허락: mfa-lab/ 아래 각 프로젝트에서 npm install·npm ci, Playwright Chromium 설치(cdn.playwright.dev, playwright.download.prss.microsoft.com, storage.googleapis.com에서 내려받기), apt로 브라우저 의존 패키지 설치(install-deps).
- CLAUDE.md의 "검증" 규칙(type-check, build)은 src/ 변경에만 적용돼. 브리프가 지시한 경우가 아니면 루트에서 npm ci를 실행하지 마.
- 시나리오가 하나 끝날 때마다 REPORT.md와 STATE.md를 갱신하고 커밋·푸시해. 스테이징은 경로를 명시해서 하고(git add -A 금지), 위 범위의 커밋·푸시는 미리 허락한다.
- 브리프의 중단 조건에 해당하면 doc/qa/BLOCKED.md를 쓰고 커밋·푸시한 뒤 멈추고 나에게 보고해.
- 끝나면 node mfa-lab/scripts/ctl.mjs stop으로 서버를 내리고, REPORT.md의 커버리지 표·발견 목록·수정 대기열과 작업 브랜치 이름을 요약해줘.
```

---

## 4. 수정 프롬프트 (발견 1건)

`FC-QA-NNN`을 고칠 발견 ID로 바꾼다 (첫 문장의 두 군데).

```
doc/qa/FIXING.md를 처음부터 끝까지 읽고, 그 절차대로 FC-QA-NNN 한 건만 고쳐줘. 발견 문서는 doc/qa/findings/FC-QA-NNN-*.md, 판정 규칙은 doc/qa/README.md야.
- FIXING.md는 내가 승인한 계획이야. 계획 모드나 추가 계획 승인 없이 바로 진행해.
- 먼저 doc/qa/mfa/STATE.md(레인, MF 상태)와 발견 문서를 읽고, FIXING.md "재개" 표로 끝난 단계를 건너뛰어 첫 미완료 단계부터 해. 작업 브랜치 이름을 STATE.md의 "수정 세션" 표와 최종 보고에 적어줘.
- 변경 범위: src/, 이 발견의 파일(발견 문서, 회귀 스펙에서 test.fail() 제거), 그리고 FIXING.md "문서 갱신"에 적힌 파일(doc/TODO.md, CHANGELOG, API 문서, STATE.md). 그 밖의 mfa-lab/(픽스처·하네스)과 루트 package.json·package-lock.json은 수정하지 마.
- 허락: 루트 npm ci(패키지 파일은 바꾸지 않음), mfa-lab/ 아래 각 프로젝트의 npm ci, Playwright Chromium 설치(cdn.playwright.dev, playwright.download.prss.microsoft.com, storage.googleapis.com에서 내려받기), apt로 브라우저 의존 패키지 설치(install-deps).
- src/를 바꾸니까 CLAUDE.md "검증"대로 npm run type-check와 npm run build를 통과시켜. 루트 npm ci는 FIXING.md가 지시한 대로만 해.
- 단계가 끝날 때마다 커밋·푸시해. 스테이징은 경로를 명시해서 하고(git add -A 금지), 코드(fix:)와 문서(docs:) 커밋을 나눠. 위 범위의 커밋·푸시는 미리 허락한다.
- FIXING.md의 중단 조건에 해당하면 doc/qa/BLOCKED.md를 쓰고 커밋·푸시한 뒤 멈추고 나에게 보고해. 픽스처나 하네스를 고쳐서 통과시키지 마.
- 끝나면 node mfa-lab/scripts/ctl.mjs stop으로 서버를 내리고, 바꾼 파일, fix_commit, 회귀·스모크 결과, 함께 고쳐진 발견, 작업 브랜치 이름을 요약해줘.
```

---

## 5. 세션이 멈추거나 끊겼을 때

### `doc/qa/BLOCKED.md`가 생겼을 때

세션이 브리프의 중단 조건(브라우저를 구할 수 없음, 실제 드래그 이벤트를 만들 수 없음, 양성 대조가 실패하지 않음, `src/`나 루트 패키지를 고쳐야 하는 상황 등)에 걸리면 `BLOCKED.md`를 쓰고 멈춘다.

1. GitHub에서 세션의 작업 브랜치에 있는 `doc/qa/BLOCKED.md`를 읽는다. 막힌 단계, 실행한 명령, 로그, 시도한 내용, **사용자가 바꿀 수 있는 것**, 재개 방법이 적혀 있다.
2. "사용자가 바꿀 수 있는 것"을 한다. 대부분 1절 2번의 네트워크 설정이다.
3. 같은 프롬프트로 다시 시작한다 (같은 세션을 다시 열거나, 그 작업 브랜치에서 새 세션). 프롬프트 **맨 끝에 한 줄**을 덧붙인다.

```
doc/qa/BLOCKED.md의 조치를 끝냈다: <한 일>
```

4. `BLOCKED.md`는 직접 지우지 않는다. 다시 시작한 세션이 막혔던 단계를 통과하면서 정리한다.
5. 사용자가 해결할 수 없는 조건(예: 양성 대조가 실패하지 않음)이면 그 세션의 보고를 바탕으로 방향을 다시 정한다. 세션 2를 시작하지 않는다.

### 한 단계가 여러 세션에 걸칠 때

- 클라우드 VM은 한동안 쓰지 않으면 멈추고 회수될 수 있다. 실행 중이던 서버와 푸시하지 않은 작업은 사라진다. 그래서 세션은 단계마다 커밋·푸시한다.
- 이어가는 방법은 항상 같다: **같은 프롬프트를 다시 붙여넣는다.** 세션은 `STATE.md`의 체크되지 않은 첫 단계부터 한다.
- 새 세션으로 이어갈 때는 이전 세션의 작업 브랜치에서 시작한다. 또는 그 브랜치를 PR로 `qa/mfa-lab`에 머지한 뒤 `qa/mfa-lab`에서 시작한다.
- 세션 1은 분량이 커서 여러 세션에 걸칠 가능성이 높다. 정상이다.
