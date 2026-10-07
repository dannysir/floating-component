// mfa-lab/scripts/lib/spawn.mjs — 서버와 npm spawn, execText.
import { spawn, execFile } from 'node:child_process';
import { mkdirSync, openSync } from 'node:fs';
import path from 'node:path';
import { runDir } from './apps.mjs';

export const isWin = process.platform === 'win32';

// vite preview를 node로 직접 띄운다. npx도 셸도 쓰지 않는다. 분리(detached) + 로그 파일 + unref.
export const spawnVitePreview = ({ app, dir, port, outDir, foreground = false }) => {
  mkdirSync(path.join(runDir, 'logs'), { recursive: true });
  const viteBin = path.join(dir, 'node_modules', 'vite', 'bin', 'vite.js');          // vite 7.3.6의 bin: "bin/vite.js"
  const args = [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', outDir];
  const fd = openSync(path.join(runDir, 'logs', `${app}.log`), 'a');
  const child = spawn(process.execPath, args, {
    cwd: dir,
    detached: !foreground,          // Linux: 새 프로세스 그룹의 리더. Windows: 부모가 끝나도 계속 실행
    stdio: ['ignore', fd, fd],      // 부모의 stdio와 연결되지 않아야 백그라운드에 남는다
    windowsHide: true,
    env: { ...process.env },
  });
  if (!foreground) child.unref();
  return child;
};

// npm: win32에서는 npm.cmd라서 shell이 필요하다. 인자는 고정 목록만 넘긴다.
export const runNpm = (args, { cwd, env = {} }) => new Promise((resolve, reject) => {
  const child = spawn(isWin ? 'npm.cmd' : 'npm', args, { cwd, stdio: 'inherit', shell: isWin, env: { ...process.env, ...env } });
  child.on('error', reject);
  child.on('exit', (code) => (code === 0 ? resolve(0) : reject(new Error(`npm ${args.join(' ')} exited ${code} in ${cwd}`))));
});

// node 스크립트를 자식으로 실행하고 종료 코드를 돌려준다(stdio 상속).
export const runNode = (args, { cwd, env = process.env }) => new Promise((resolve) => {
  const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', env });
  child.on('error', () => resolve(1));
  child.on('exit', (code) => resolve(code ?? 1));
});

// Playwright 브라우저 설치용 환경: SKIP 변수를 지우고 랩 로컬 경로를 준다.
export const playwrightInstallEnv = () => {
  const { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: _skip, ...env } = process.env;
  return { ...env, PLAYWRIGHT_BROWSERS_PATH: path.join(runDir, 'pw-browsers') };
};

// win32의 .cmd(npm.cmd)는 shell 없이 spawn하면 Node 18.20.2/20.12.2 이후 EINVAL을 동기로 던진다(CVE-2024-27980). 인자는 고정 목록만 넘긴다.
export const execText = (file, args, opts = {}) => new Promise((resolve) => {
  try {
    execFile(file, args, { encoding: 'utf8', timeout: opts.timeout ?? 20000, cwd: opts.cwd, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, ...(opts.env ?? {}) }, shell: isWin && /\.cmd$/i.test(file) }, (err, stdout, stderr) =>
      resolve({ ok: !err, code: err?.code ?? 0, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') }));
  } catch (err) {
    resolve({ ok: false, code: err?.code ?? 1, stdout: '', stderr: String(err?.message ?? err) });
  }
});
