# BLOCKED — BLOCKED-ENV-WIN (FIXING F1, FC-QA-008)

- 작성: 2026-10-07T04:47Z
- 작업 브랜치: fix/fc-qa-008-resize-capture-cleanup, 마지막 커밋: d303069 (`qa/mfa-lab`과 같음. `src/` 변경 없음)
- 환경: 사용자 Windows PC (Windows 11 Enterprise 10.0.26200, x64), Node v24.18.0, npm 11.16.0, 저장소 경로 `C:\SSAFY\서산\floating-component`
- 코드 `BLOCKED-ENV-WIN`은 이 문서가 붙인 이름이다 (BRIEF-1 표에 없는 Windows 환경 문제).

## 멈춘 단계

FIXING.md F1 "환경 올리기". 통과 조건 "`up`과 스모크가 통과한다" 중 **`ctl up`이 실패**하고, **`ctl smoke`는 검사를 모두 통과한 뒤 종료 코드 127로 끝난다**. 9절 중단 조건 "F1: `ctl up` 또는 스모크가 통과하지 않는다"에 해당한다. F2(수정 전 확인) 이후는 실행하지 않았다.

## 실행한 명령

```bash
node mfa-lab/scripts/ctl.mjs up                      # exit 1 (문제 1)
# 원인 파악을 위해 up의 나머지 단계를 개별 명령으로 실행 (하네스 변경 없음)
node mfa-lab/scripts/ctl.mjs install                 # exit 0
node mfa-lab/scripts/ctl.mjs build --lib src         # exit 0
node mfa-lab/scripts/ctl.mjs build --lib npm051      # exit 0
node mfa-lab/scripts/ctl.mjs serve --baseline        # exit 0
node mfa-lab/scripts/ctl.mjs smoke                   # "smoke: OK" 출력 뒤 exit 127 (문제 2)
node mfa-lab/scripts/ctl.mjs test smoke              # exit 0, 19 passed · 1 skipped
```

## 마지막 로그 40줄

`ctl up` (전체 11줄):

```text
Error: spawn EINVAL
    at ChildProcess.spawn (node:internal/child_process:441:11)
    at spawn (node:child_process:796:9)
    at execFile (node:child_process:349:17)
    at file:///C:/SSAFY/%EC%84%9C%EC%82%B0/floating-component/mfa-lab/scripts/lib/spawn.mjs:47:3
    at new Promise (<anonymous>)
    at execText (file:///C:/SSAFY/%EC%84%9C%EC%82%B0/floating-component/mfa-lab/scripts/lib/spawn.mjs:46:52)
    at probeNpm (file:///C:/SSAFY/%EC%84%9C%EC%82%B0/floating-component/mfa-lab/scripts/lib/doctor.mjs:21:19)
    at collectEnv (file:///C:/SSAFY/%EC%84%9C%EC%82%B0/floating-component/mfa-lab/scripts/lib/doctor.mjs:61:25)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async up (file:///C:/SSAFY/%EC%84%9C%EC%82%B0/floating-component/mfa-lab/scripts/lib/commands.mjs:265:15)
```

`ctl smoke` (끝 11줄):

```text
smoke: ready mfe-telemetry (mfe-telemetry@20261007T044545Z-37e5)
smoke: ready shell (shell@20261007T044549Z-9f3e)
smoke: ready shell-051 (shell-051@20261007T044601Z-9026)
smoke: ready mfe-orders
smoke: ready mfe-board
smoke: ready mfe-billing
smoke: manifest mfe-orders name=orders exposes Panel
smoke: manifest mfe-board name=board exposes Panel
smoke: billing standalone page references remote-entry.js
smoke: OK (6 apps, 0 warnings)
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94
```

`ctl test smoke` (끝):

```text
  1 skipped
  19 passed (18.0s)
```

## 시도한 것

1. `ctl up` → doctor 단계(`collectEnv` → `probeNpm`)에서 `spawn EINVAL`로 즉시 종료. install 이후는 실행되지 않음.
2. `up`을 구성하는 단계를 개별 명령으로 실행(위 "실행한 명령"). install(각 프로젝트 `npm ci`, 레인 B Chromium 153.0.8010.12 / 리비전 1243 설치), build(src·npm051), serve는 모두 통과. 한글 경로, Windows용 optional 패키지(`@rollup/rollup-win32-x64-msvc` 등)는 문제 없었다 — lockfile 재생성(`install --fresh`)은 필요 없음. 패키지 파일·lockfile 변경 없음(`git status` 깨끗).
3. `ctl smoke` → 모든 검사가 OK로 출력된 뒤 프로세스 종료 시 libuv assertion으로 exit 127. 브라우저 스모크 `ctl test smoke`는 19 passed · 1 skipped(클라우드 B2-00과 같은 수).
4. 문제 1 재현: `node -e "require('child_process').execFile('npm.cmd',['-v'],…)"` → 같은 `spawn EINVAL`이 동기 예외로 던져짐.

## 가설

**문제 1 — 확인함.** `mfa-lab/scripts/lib/doctor.mjs:21`(`probeNpm`)과 `:66`(`npm -v`)이 `execText('npm.cmd', …)`를 부르고, `execText`(`mfa-lab/scripts/lib/spawn.mjs:46-48`)는 `shell` 옵션 없이 `execFile`을 쓴다. Node 18.20.2 / 20.12.2 이후(CVE-2024-27980 보안 수정) Windows에서 `.cmd`/`.bat`를 `shell: true` 없이 spawn하면 `EINVAL`이 **동기 예외**로 던져진다. `execText`는 콜백 오류만 처리하므로 예외가 `collectEnv` → `up`까지 올라가 종료된다. 영향: `ctl up`, `ctl doctor`가 Windows + 현대 Node에서 항상 실패. (`runNpm`은 `shell: isWin`이라 install은 정상.)

**문제 2 — 추정.** `ctl.mjs` 마지막 줄의 `process.exit(code)`가 `smoke`의 `fetch`(undici, `commands.mjs` smoke 안 `fetch(... AbortSignal.timeout(3000))` 등)가 남긴 핸들이 닫히는 중에 불려 libuv Windows 비동기 핸들 assertion(`src\win\async.c:94`)이 난 것으로 보인다. Node 24 + Windows에서 알려진 종류의 종료 시 크래시다. 검사 자체는 모두 OK였으므로 판정 결과는 아니지만, 종료 코드가 0이 아니라 `up`의 마지막 단계(smoke) 판정과 자동화에는 실패로 보인다.

두 문제 모두 라이브러리(`src/`)나 FC-QA-008과 무관한 **하네스(`mfa-lab/scripts/`)의 Windows 결함**이다. FIXING.md 9절에 따라 라이브러리 수정과 섞지 않고, 승인 없이 하네스를 고치지 않았다.

## 사용자가 바꿀 수 있는 것

- **선택지 A (권장): 하네스 Windows 수정 승인.** 별도 커밋(`fix(mfa-lab): ...` 또는 `chore(mfa-lab): ...`)으로
  - 문제 1: `execText`에서 win32이고 파일이 `.cmd`이면 `shell: true`를 주거나, `execFile`의 동기 예외를 잡아 `{ ok: false }`로 돌려준다 (`runNpm`과 같은 방식).
  - 문제 2: `ctl.mjs`에서 `process.exit(code)` 대신 `process.exitCode = code`로 두고 자연 종료시키거나, smoke의 fetch 응답 본문을 모두 소비·취소한다.
  - 고친 뒤 FIXING 9절대로 스모크와 S1·S3·S5·S6을 다시 실행하고, 변경 전후로 FC-QA-008 회귀 스펙 결과가 달라지지 않음을 보인다.
- **선택지 B: 개별 명령으로 F1을 대체 승인.** `ctl install` → `ctl build --lib src` → `ctl build --lib npm051` → `ctl serve --baseline` → `ctl smoke`(출력 `smoke: OK` 확인, 종료 코드 127은 무시) → `ctl test smoke`를 F1 통과로 인정. 이번 세션에서 이미 모두 수행했고 서버도 이 방식으로 올라가 있다. F6의 `stop` → `up`도 같은 개별 명령으로 바꿔야 한다.
- **선택지 C: Node 버전 변경.** 문제 1은 Node 22.x에서도 같으므로(보안 수정은 18.20.2/20.12.2/21.7.3 이후 전부) 해결되지 않는다. 권하지 않는다.
- **선택지 D: 클라우드 세션에서 진행.** FIXING.md 12절 "F2에서 재현되지 않으면 클라우드에서"와 같은 경로.

## 재개 방법

사용자가 위 선택지를 정해 프롬프트에 적고 같은 절차(FIXING.md, FC-QA-008)로 다시 시작한다. 재개 표(10절)상 F0부터이며, 브랜치 `fix/fc-qa-008-resize-capture-cleanup`에는 이 문서와 STATE.md 갱신 커밋만 있다. 재개 후 먼저 실행할 명령:

```bash
git status --short && git log --oneline -5 && git rev-parse --abbrev-ref HEAD
node mfa-lab/scripts/ctl.mjs up          # 선택지 A로 하네스를 고친 뒤
node mfa-lab/scripts/ctl.mjs test smoke
```
