# FIXING — 발견을 하나씩 고치는 절차

> **이 문서는**
> - run이 끝난 뒤 `doc/qa/findings/`의 발견을 **1건씩** 고치는 절차다. 클라우드 세션과 사용자의 Windows PC 양쪽에서 쓴다.
> - 읽는 사람: 수정 세션의 Claude(시작 프롬프트는 [mfa/PROMPTS.md](./mfa/PROMPTS.md)의 "수정")와 사용자.
> - 의존: 판정 규칙과 상태 정의는 [README.md](./README.md), 랩 명령(`ctl.mjs`)은 [mfa/ARCHITECTURE.md](./mfa/ARCHITECTURE.md) "실행 모델"과 `mfa-lab/README.md`, 스펙 구조는 [mfa/HARNESS.md](./mfa/HARNESS.md) "스펙 구성".
> - 상태(2026-10-02): 이 절차는 **미실행**이다. 랩(`mfa-lab/`)이 만들어지기 전에 쓴 문서이므로, 명령이 실제와 다르면 `mfa-lab/README.md`를 따른다. Windows PC에서의 실행은 **미검증**이다.

---

## 1. 원칙

1. **한 번에 발견 1건** (같은 `root_cause_group`은 함께 고쳐질 수 있다). 1건 = 브랜치 1개 = PR 1개.
2. **고치기 전에 회귀 스펙이 예상대로 실패하는 것을 먼저 본다.** 그 환경에서 버그가 재현된다는 증거다. 재현되지 않는 환경에서는 고치지 않는다.
3. **픽스처와 하네스를 고쳐서 통과시키지 않는다.** 수정 세션이 `mfa-lab/`에서 바꿀 수 있는 것은 해당 회귀 스펙에서 `test.fail()` 호출을 지우는 것뿐이다. 단언, 대기 시간, 헬퍼, 프로브, 픽스처 앱, 설정을 바꿔야만 통과한다면 멈춘다 (9절).
4. 바꾸는 곳은 `src/`다. `CLAUDE.md`의 코딩 규칙과 설계 원칙을 따른다 (arrow function, named export, 불변 업데이트, SplitNode에 ID를 추가하지 않음 등). 설계 원칙과 충돌하는 수정이 필요해 보이면 멈추고 선택지를 보고한다.
5. 루트 `package.json`, 루트 `package-lock.json`은 수정하지 않는다. 새 의존성을 추가하지 않는다.
6. `src/`를 바꾸므로 `CLAUDE.md` "검증" 규칙이 적용된다: `npm run type-check`, `npm run build`.

---

## 2. 고칠 발견 고르기

1. 대상은 `doc/qa/<run>/REPORT.md` "수정 대기열"의 맨 위 묶음이다. 사용자가 프롬프트에 ID를 적었으면 그 발견이다.
2. 발견 파일(`doc/qa/findings/FC-QA-NNN-*.md`)의 front matter를 읽고 아래 조건을 확인한다.

| 확인 | 조건 | 아니면 |
|---|---|---|
| `class` | `library-bug` | 8절 |
| `status` | `open` | 8절 |
| `blocked_by` | `none`(또는 빈 값)이거나, 적힌 발견이 모두 `fixed`/`verified` | 적힌 발견부터 고친다. 사용자에게 알린다 |
| `repro_spec` | 파일이 실제로 있다 | 9절 (멈춤) |

3. 같은 `root_cause_group`의 다른 발견을 찾아 둔다 (`doc/qa/findings/`에서 그 값을 검색). 수정 뒤 함께 고쳐졌는지 확인한다 (F8).

---

## 3. 브랜치 규칙

랩(`mfa-lab/`)과 회귀 스펙은 `qa/mfa-lab` 브랜치에만 있다. 수정 브랜치는 반드시 그 내용을 포함해야 한다.

| 환경 | 방법 |
|---|---|
| 클라우드 세션 | 세션을 `qa/mfa-lab` 브랜치에서 시작한다. 세션은 자기 작업 브랜치에만 푸시할 수 있다. 그 브랜치 이름을 `doc/qa/mfa/STATE.md`의 "수정 세션" 표(F9)와 최종 보고에 적는다. 사용자가 PR로 `qa/mfa-lab`에 머지한다 |
| 사용자 PC | `git switch qa/mfa-lab` → `git pull` → `git switch -c fix/fc-qa-NNN-<slug>` |
| 다른 브랜치에서 고쳐야 할 때 | 그 브랜치에 `qa/mfa-lab`을 먼저 머지한다 (`git merge qa/mfa-lab`). 랩 없이 고치지 않는다 |

- PR은 **머지 커밋**으로 합친다. squash하면 `fix_commit` 해시가 사라진다. squash했다면 발견 파일의 `fix_commit`을 머지 뒤의 해시로 고친다.
- `qa/mfa-lab`을 최종적으로 어디에 합칠지는 사용자가 정한다 (2026-10-02 기준 미정).

---

## 4. 절차

명령은 전부 저장소 루트에서 실행한다. 클라우드에서는 `ctl.mjs up`과 `ctl.mjs test`에 Bash 제한 시간 600000ms를 준다. 단계가 끝날 때마다 커밋·푸시한다 (경로를 명시해 스테이징, `git add -A` 금지).

| 단계 | 하는 일 | 명령 | 통과 조건 |
|---|---|---|---|
| F0 | 준비 확인 | `git status --short` , `git log --oneline -5` | 작업 트리가 깨끗하다. 2절 조건을 만족한다. 10절 표로 이미 끝난 단계를 건너뛴다 |
| F1 | 환경 올리기 | `npm ci` (루트. type-check·build용. 패키지 파일은 바뀌지 않는다) → `node mfa-lab/scripts/ctl.mjs up` → `node mfa-lab/scripts/ctl.mjs test smoke` | `up`과 스모크가 통과한다. `ctl doctor`가 커밋된 레인(`mfa-lab/e2e/lane.json`)을 쓸 수 없다고 하면 멈춘다 (레인을 조용히 바꾸지 않는다) |
| F2 | **수정 전 확인** | `node mfa-lab/scripts/ctl.mjs test regression/fc-qa-NNN` (발견의 `input`이 터치면 `--project touch`를 붙인다). 2회 실행 | 두 번 모두 "예상대로 실패" (5절). 실패 이유가 발견의 "기대(오라클)"에 적힌 단언이다 |
| F3 | `src/` 수정 | — | 근본 원인 1개만 고친다. 발견의 "추정 원인"은 가설이므로 코드를 읽고 확인한 뒤 고친다 |
| F4 | 라이브러리 검증 | `npm run type-check` → `npm run build` | 둘 다 통과 |
| F5 | 수정 커밋 | `git add <바꾼 src 파일>` → `git commit -m "fix: <증상 요약> (FC-QA-NNN)"` → `git rev-parse --short HEAD` | 이 해시가 `fix_commit`이다. `src/` 밖의 파일은 이 커밋에 넣지 않는다 |
| F6 | 랩 재빌드 후 **예상과 달리 통과** 확인 | `node mfa-lab/scripts/ctl.mjs stop` → `node mfa-lab/scripts/ctl.mjs up` → F2와 같은 `test` 명령 | `test.fail()`이 아직 있는 상태에서 "예상과 달리 통과"로 보고된다 (5절). 여전히 "예상대로 실패"면 F3으로 돌아간다 (3회까지) |
| F7 | `test.fail()` 제거 | 회귀 스펙에서 `test.fail();` 한 줄만 지운다 (발견 ID를 담은 `annotation`은 남긴다) → F2와 같은 `test` 명령 2회 → `git commit -m "test: FC-QA-NNN 회귀 스펙 test.fail() 제거"` | 두 번 모두 평범하게 통과 |
| F8 | 전체 확인 | `node mfa-lab/scripts/ctl.mjs smoke` → `node mfa-lab/scripts/ctl.mjs test smoke` → `node mfa-lab/scripts/ctl.mjs test regression` → `node mfa-lab/scripts/ctl.mjs test regression --project touch` → (권장) `node mfa-lab/scripts/ctl.mjs test spike` | 6절 표대로 읽는다 |
| F9 | 문서 갱신 | 7절 → `git commit -m "docs: FC-QA-NNN 수정 기록"` → 푸시 | front matter, `doc/TODO.md`, STATE.md "수정 세션" 표가 갱신됐다 |
| F10 | 종료 | `node mfa-lab/scripts/ctl.mjs stop` | 서버가 내려갔다. 최종 보고: 바꾼 파일, `fix_commit`, F8 결과, 함께 고쳐진 발견, 작업 브랜치 이름 |

보충:

- **F1에서 루트 `npm ci`를 먼저 하는 이유**: 수정 전(F2)과 수정 후(F6~F8)의 실행 조건을 같게 하기 위해서다. 사용자 PC처럼 루트 `node_modules`가 이미 있으면 생략한다. 루트 `node_modules`가 있어도 shell은 `resolve.dedupe`로 자기 React 사본만 쓰도록 설계돼 있다 ([ARCHITECTURE.md](./mfa/ARCHITECTURE.md) "실행 모델"). `npm ci` 뒤에 스모크가 React 중복 증상으로 실패하면 픽스처 문제이므로 멈춘다.
- **F5를 F6보다 먼저 하는 이유**: shell 빌드는 라이브러리 식별자(`window.__fc.lib.tree` = `git rev-parse HEAD:src`, 빌드 입력 `LAB_LIB_TREE`)를 빌드 시점에 기록하므로, 커밋한 뒤에 빌드해야 기록이 수정 커밋과 일치한다 ([ARCHITECTURE.md](./mfa/ARCHITECTURE.md) "실행 모델"의 "빌드 입력"). `ctl.mjs smoke`의 보호 경로 검사는 루트 패키지 파일의 변경만 막고 `src/` 변경에는 경고만 내므로, 커밋하지 않은 `src/` 변경이 `up`을 실패시키지는 않는다(설계 기준, 미실행).
- F6에서 F3으로 돌아가 다시 고치면 커밋도 다시 한다. `fix_commit`에는 마지막 수정 커밋을 적고, 앞선 커밋은 발견 "관련" 절에 적는다.
- **F6에서 `stop` 후 `up`을 하는 이유**: shell은 `src/`를 소스 alias로 번들하므로, `src/`를 바꾸면 shell을 다시 빌드하고 다시 띄워야 한다. `up`은 `src/`가 바뀌면 shell을 다시 빌드하도록 설계돼 있다 (미실행). 다시 빌드되지 않으면 `node mfa-lab/scripts/ctl.mjs build --only shell --force`를 실행한 뒤 `up`을 다시 부른다.
- 기준선 빌드(npm 0.5.1, `http://127.0.0.1:4390`)는 `src/`와 무관하다. 스파이크 S5는 수정 뒤에도 그대로 "실패해야 통과"다.

---

## 5. `test.fail()` 결과 읽는 법

회귀 스펙은 **이상적인 동작**을 단언하고 `test.fail()`로 감싸 있다. `test.fail()`은 "이 테스트는 실패해야 한다"는 표시다. Playwright는 테스트를 실행하고 실제로 실패하는지 확인한다 ([Playwright 문서: test.fail](https://playwright.dev/docs/api/class-test#test-fail)). 아래 표는 문서에 근거한 것으로 미실행이다.

| 스펙 본문의 결과 | `test.fail()`이 있을 때 보고 | 부르는 이름 | 뜻 |
|---|---|---|---|
| 단언 실패 | 통과로 집계된다. 종료 코드 0 | **예상대로 실패** | 버그가 아직 있다 |
| 통과 | 실패로 보고된다 ("Expected to fail, but passed"). 종료 코드 0이 아님 | **예상과 달리 통과** (unexpected pass) | 버그가 더 이상 재현되지 않는다. 수정이 들어갔다는 신호 |
| 시간 초과 | 실패로 보고된다 | — | 환경 또는 하네스 문제. 버그 재현의 증거가 아니다 |

**주의**: "예상대로 실패"는 이유를 가리지 않는다. 서버가 안 떠 있거나 전제 조건 단언이 실패해도 통과로 집계된다. 그래서 F2에서는 실패 이유를 확인한다.

- 결과 파일 `mfa-lab/e2e/.artifacts/results.json`(JSON 리포터. 경로는 [HARNESS.md](./mfa/HARNESS.md) "Playwright 설정")에서 해당 테스트를 찾는다.
- `expectedStatus`가 `failed`이고, 실행 결과의 오류 메시지가 발견 파일 "기대(오라클)"의 단언(예: 마운트 수가 늘지 않아야 함)에서 난 것인지 본다.
- 오류가 페이지 로드, 서버 연결, "드래그가 시작되지 않음" 같은 전제 조건에서 났다면 재현이 아니다. 9절.

수정 전에 "예상과 달리 통과"가 나오는 경우:

| 상황 | 판단 | 조치 |
|---|---|---|
| 발견의 `library_tree`와 지금의 `git rev-parse HEAD:src`가 다르다 | 다른 수정으로 이미 고쳐졌을 수 있다 | 같은 `root_cause_group`의 `fixed` 발견을 찾는다. 있으면 그 `fix_commit`으로 이 발견도 F7~F9를 진행한다. 없으면 멈추고 보고한다 |
| `src/`가 그대로다 | 환경(OS, 레인)이 달라 재현되지 않거나 스펙이 불안정하다 | 3회 더 실행해 결과를 적고 멈춘다. 상태는 바꾸지 않는다 |

---

## 6. 전체 확인(F8) 결과 읽는 법

| 결과 | 뜻 | 조치 |
|---|---|---|
| 스모크·스파이크 통과, 고친 발견의 스펙 통과, 다른 회귀 스펙은 "예상대로 실패" | 정상 | F9로 |
| 다른 회귀 스펙이 "예상과 달리 통과" | 같은 원인이 함께 고쳐졌다 | 그 발견이 같은 `root_cause_group`이거나 수정 내용으로 설명되면: 그 스펙의 `test.fail()`도 지우고(2회 통과 확인) 같은 `fix_commit`으로 `fixed` 처리한다. 설명되지 않으면 건드리지 않고 보고한다 |
| 전에 통과하던 스펙(스모크, 스파이크, 이미 `fixed`인 발견의 스펙)이 실패 | 수정이 다른 동작을 깨뜨렸다 | `src/`를 다시 고친다. 하네스를 고치지 않는다. 해결하지 못하면 수정 커밋을 되돌리고 9절 |
| 스파이크의 기대가 수정 때문에 정당하게 달라졌다고 판단됨 | 하네스 기준선 변경이 필요하다 | 멈추고 보고한다. 사용자 승인 없이 스파이크를 고치지 않는다 |

- 스모크는 두 가지다: 브라우저 없이 도는 `ctl.mjs smoke`와 브라우저 스모크 스펙(`ctl.mjs test smoke`).
- 터치 프로젝트가 세션 1에서 `env-limit`이 된 레인이면 `--project touch` 실행은 생략하고 그 사실을 보고에 적는다. `doc/qa/findings/`에 `input`이 터치(`touch-cdp-*`)인 발견이 하나도 없을 때도 생략한다.

---

## 7. 문서 갱신 (F9)

| 파일 | 바꾸는 것 |
|---|---|
| `doc/qa/findings/FC-QA-NNN-*.md` | `status: fixed`, `fix_commit: <F5의 해시>`. "관련" 절 끝에 날짜와 한 줄: 무엇을 어떻게 고쳤는지, 확인한 레인. "실제"·"증거" 절은 고치지 않는다 |
| 함께 고쳐진 발견 | 같은 방식으로 `status: fixed`, 같은 `fix_commit` |
| 이 발견을 `dup_of`로 가리키는 발견 | 상태는 `duplicate` 그대로 둔다. "관련" 절에 대상이 고쳐졌다고 한 줄 적는다 |
| `doc/TODO.md` | "QA 발견 수정" 절(11절)의 해당 줄을 `[x]`로 바꾸고 `fix_commit`을 적는다. 절이 없으면 11절대로 먼저 만든다 |
| `CHANGELOG.ko.md`, `CHANGELOG.md` | 사용자가 체감하는 동작 변화면 `[Unreleased]`에 한 줄 추가한다 |
| `doc/API.ko.md`, `doc/API.md` | 문서화된 동작이 바뀌었을 때만 고친다 |
| `doc/qa/mfa/STATE.md` | "수정 세션" 표에 한 줄 추가한다. 표가 없으면 문서 끝에 아래 형식으로 만든다 |

```markdown
## 수정 세션

| 발견 | 작업 브랜치 | 날짜(UTC) | 결과 |
|---|---|---|---|
| FC-QA-NNN | <브랜치 이름> | <date -u 출력> | fixed(<fix_commit>) |
```

`doc/qa/README.md`의 ID 대장은 상태를 담지 않으므로 고치지 않는다.

### `verified`가 되는 시점

`fixed`는 고친 세션이 붙인다. `verified`는 **고친 세션이 아닌 이후의 run**이 붙인다. 조건:

1. `fix_commit`이 포함된 라이브러리 트리에서 실행한다.
2. 회귀 스펙이 `test.fail()` 없이 통과한다.
3. 발견이 나온 원래 시나리오(발견 "관련" 절의 R-ID)를 깨끗한 컨텍스트에서 2회 다시 실행해 기대(오라클)대로이고 불변식 I1~I7이 통과한다.
4. 그 run의 REPORT.md에 기록하고, 발견 "관련" 절에 날짜와 run 이름을 덧붙인 뒤 `status: verified`로 바꾼다.

사용자가 직접 확인하고 `verified`로 바꿔도 된다. 재발하면 `open`으로 되돌리고 "관련" 절에 기록한다.

---

## 8. 이 절차로 바로 고치지 않는 발견

| 발견 | 하는 일 |
|---|---|
| `status: predicted` | 아직 실행으로 관찰되지 않았고 회귀 스펙도 없다. 검수 run이 먼저 관찰해 `open`으로 바꿔야 한다. 사용자가 그 전에 고치라고 명시하면: 회귀 스펙을 먼저 쓰고([HARNESS.md](./mfa/HARNESS.md) "스펙 구성"), 예상대로 실패하는 것을 2회 확인하고, 증거를 남기고 `open`으로 바꾼 뒤 F2부터 진행한다 |
| `status: duplicate` | 따로 고치지 않는다. `dup_of`가 가리키는 발견을 고친다 |
| `status: wontfix` | 고치지 않는다. 사용자만 되돌릴 수 있다. 회귀 스펙은 `test.fail()`인 채로 남겨 알려진 동작을 기록한다 |
| `status: needs-user-confirmation` 또는 `class: spec-question` | 무엇이 옳은 동작인지 사용자가 정하기 전에는 고치지 않는다. 선택지를 정리해 묻는다. 결정이 나면 [README.md](./README.md) "결정 로그"에 추가하고, 결함으로 결정되면 `class: library-bug`·`status: open`으로 바꿔 이 절차를 따른다. 문서만 틀린 것으로 결정되면 `src/` 대신 문서를 고치고 `fixed`로 둔다 (`repro_spec: none`이면 F2·F6·F7은 생략) |
| `class: fixture-bug` | 라이브러리 수정 대상이 아니다. `mfa-lab/`을 고치는 별도 작업이다. 고친 뒤 스모크와 스파이크 S1·S3·S5·S6을 다시 실행한다 |
| `class: harness-artifact` | 고칠 것이 없다. [HARNESS.md](./mfa/HARNESS.md) "알려진 하네스 부작용"에 있는지 확인한다 |
| `class: env-limit` | 수동 확인 항목이다. REPORT.md "환경 한계와 수동 확인" |
| `harness_amplified: true` | 이 절차로 고친다. 다만 회귀 스펙이 경합을 일부러 키우는 릴리스 방식을 쓰므로, F7의 2회 통과에 더해 5회 연속 통과를 확인한다 |

---

## 9. 중단 조건

아래에 해당하면 고치기를 멈춘다. `doc/qa/BLOCKED.md`를 쓰고(양식은 [BRIEF-1](./mfa/BRIEF-1-build.md) "중단 조건". 적을 것: 단계, 실행한 명령 그대로, 로그 마지막 40줄, 시도한 횟수와 내용, 원인 가설, 사용자가 바꿀 수 있는 것, 재개 방법) 커밋·푸시한 뒤 보고한다.

- F1: `ctl up` 또는 스모크가 통과하지 않는다. 커밋된 레인을 쓸 수 없다.
- F2: 회귀 스펙이 없다. 수정 전인데 "예상대로 실패"하지 않는다. 실패 이유가 오라클의 단언이 아니다.
- F3: 수정이 `CLAUDE.md` 설계 원칙과 충돌한다. 공개 API를 바꿔야 한다. 새 의존성이 필요하다.
- F6: 3회 시도해도 "예상과 달리 통과"가 나오지 않는다.
- F7·F8: 회귀 스펙의 단언, 헬퍼, 픽스처, 설정을 바꿔야만 통과한다. 스펙의 기대 자체가 틀렸다고 판단된다 (이 경우 발견을 `needs-user-confirmation`으로 바꾸고 이유를 적는다).
- F8: 다른 스펙이 깨졌고 `src/` 수정으로 해결하지 못했다.

픽스처·하네스의 진짜 결함을 발견했을 때: 라이브러리 수정과 섞지 않는다. 보고하고, 사용자가 승인하면 별도 커밋으로 고친 뒤 스모크와 S1·S3·S5·S6을 다시 실행한다. 그 변경 전후로 대상 회귀 스펙의 결과가 달라지지 않는다는 것을 보인다.

---

## 10. 재개

세션이 끊겼다 다시 시작하면 아래로 어디까지 했는지 판단한다. 클라우드에서는 푸시하지 않은 작업은 없어진 것으로 본다.

| 보이는 것 | 끝난 단계 | 이어서 |
|---|---|---|
| 발견 `status: fixed`, STATE.md "수정 세션"에 행 있음 | F9 | F1 → F8만 다시 확인하고 보고 |
| 회귀 스펙에 `test.fail(`이 없고 발견은 `open` | F7 | F1 → F8 |
| `git log`에 `fix: ... (FC-QA-NNN)` 커밋이 있고 스펙에 `test.fail(`이 있음 | F5 | F1 → F6 |
| 위 어느 것도 아님 | — | F0 |

`doc/qa/BLOCKED.md`가 있으면 먼저 읽는다. 사용자가 조치했다고 프롬프트에 적었으면 막혔던 단계부터 다시 한다.

---

## 11. run 종료 후 한 번: 수정 대기열을 `doc/TODO.md`로 옮기기

검수 세션은 `doc/TODO.md`를 수정하지 않는다 (변경 범위 밖). run이 끝나고 PR이 머지된 뒤, 사용자의 로컬 세션 또는 첫 수정 세션(F0)이 한 번 옮긴다.

- 위치: `doc/TODO.md`의 "진행 중" 아래에 절을 추가한다.
- 내용: REPORT.md "수정 대기열"의 순서대로 `library-bug`·`open` 발견을 한 줄씩. 사용자 결정 대기 항목은 따로 적는다.

```markdown
### QA 발견 수정 (run 01)

> 발견 문서 [doc/qa/findings/](./qa/findings/), 결과 요약 [REPORT.md](./qa/run01-tier1/REPORT.md), 절차 [FIXING.md](./qa/FIXING.md)

- [ ] FC-QA-NNN <제목> — sev-N, `<root_cause_group>`
- [x] FC-QA-NNN <제목> — sev-N, `<root_cause_group>`, 수정 `<fix_commit>`

사용자 결정 대기:

- FC-QA-NNN <제목> — <물어볼 것>
```

---

## 12. 사용자 Windows PC에서 (미검증)

명령은 클라우드와 같다. PowerShell이나 Git Bash에서 저장소 루트를 현재 디렉터리로 두고 `node mfa-lab/scripts/ctl.mjs <명령>`을 실행한다. 아래는 실행해 보지 않은 예상 문제와 대처다. 실제 기준은 `mfa-lab/README.md`다.

| 예상 문제 | 대처 |
|---|---|
| Node 버전 | `node -v`가 22.12 이상이어야 한다. `ctl doctor`가 확인한다 |
| 브라우저가 없다 | 커밋된 `mfa-lab/e2e/lane.json`에는 레인·Playwright·Chromium 버전만 있고 기기별 경로는 없다. `ctl doctor`가 이 PC의 경로를 `mfa-lab/.run/lane.local.json`에 기록하고, `ctl up`(install 단계)이 그 Playwright 버전의 Chromium을 내려받는다. 인터넷 연결이 필요하다 |
| `npm ci`가 플랫폼용 선택 패키지(`@rollup/rollup-win32-x64-msvc` 등)가 없다고 실패한다 | 잠금 파일이 Linux에서 만들어져 생기는 문제다. `node mfa-lab/scripts/ctl.mjs install --only <앱 이름> --fresh`로 그 프로젝트의 `node_modules`와 `package-lock.json`을 지우고 다시 만든다. 이것은 `mfa-lab/` 변경이므로 사용자에게 알리고 승인을 받은 뒤, 라이브러리 수정과 **별도 커밋**(`chore(mfa-lab): ...`)으로 한다. 테스트를 통과시키려는 변경이 아니라 환경 복구이므로 1절 3번에 어긋나지 않는다 |
| 저장소 경로에 한글이 있다 (`C:\SSAFY\서산\...`) | Module Federation 플러그인이 이런 경로에서 동작하는지 확인되지 않았다. 빌드가 경로 때문에 실패하면 영문 경로에 새로 clone해 다시 시도한다 |
| 포트 충돌 | 4300~4304, 4390을 쓴다. 다른 프로세스가 쓰고 있으면 끈다. 5173·5174·4173은 건드리지 않는다 |
| F2에서 "예상대로 실패"하지 않는다 | 이 PC에서는 재현되지 않는 것이다. 여기서 고치지 않고 클라우드 세션에서 진행한다 |
| 결과가 클라우드와 다르다 | OS와 레인을 발견 "관련" 절에 적는다. 터치는 Chromium 153부터 Windows에서도 롱프레스 네이티브 드래그가 켜져 있다 |
| 끝난 뒤 | `node mfa-lab/scripts/ctl.mjs stop`으로 서버를 내린다 (`CLAUDE.md` "작업 방식") |
