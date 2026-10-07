// mfa-lab/scripts/lib/serve.mjs — pid 파일, killTree, serve·status·stop 명령.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { activeApps, allApps, runDir } from './apps.mjs';
import { isWin, execText, spawnVitePreview } from './spawn.mjs';
import { checkReady, waitReady } from './ready.mjs';
import { readBuild, readyTarget } from './buildinfo.mjs';

const pidsPath = path.join(runDir, 'pids.json');
export const readPids = () => (existsSync(pidsPath) ? JSON.parse(readFileSync(pidsPath, 'utf8')) : {});
export const writePids = (pids) => {                       // 임시 파일에 쓰고 rename (중간 상태가 남지 않게)
  mkdirSync(runDir, { recursive: true });
  writeFileSync(`${pidsPath}.tmp`, JSON.stringify(pids, null, 2));
  renameSync(`${pidsPath}.tmp`, pidsPath);
};
export const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };   // signal 0 = 존재 확인

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const killTree = async (pid) => {
  if (!alive(pid)) return;
  if (isWin) { await execText('taskkill', ['/pid', String(pid), '/T', '/F']); return; }
  try { process.kill(-pid, 'SIGTERM'); } catch { /* 그룹이 이미 없음 */ }
  try { process.kill(pid, 'SIGTERM'); } catch { /* 이미 없음 */ }
  const waitDead = async (n) => { if (n <= 0 || !alive(pid)) return; await sleep(250); await waitDead(n - 1); };
  await waitDead(20);
  if (alive(pid)) { try { process.kill(pid, 'SIGKILL'); } catch { /* */ } }
};

const tail = (file, n = 40) => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').slice(-n).join('\n') : '(no log)');
const onlySet = (flags) => (flags.only ? new Set(String(flags.only).split(',')) : null);

const selectApps = (flags) => {
  const only = onlySet(flags);
  const wantBaseline = Boolean(flags.baseline) || Boolean(only?.has('shell-051'));
  const apps = activeApps({ baseline: wantBaseline });
  return only ? apps.filter((a) => only.has(a.app)) : apps;
};

const warnMissingBaseline = (flags) => {
  const base = allApps().find((a) => a.baseline);
  const pkgPath = base ? path.join(base.dir, 'package.json') : '';
  const hasAlias = base && existsSync(pkgPath) && JSON.stringify(JSON.parse(readFileSync(pkgPath, 'utf8')).devDependencies ?? {}).includes('"fc-051"');
  if (flags.baseline && hasAlias && !existsSync(path.join(base.dir, base.outDir, 'index.html'))) {
    console.warn(`serve: ${base.app}: ${base.outDir}/index.html 이 없다. --baseline 을 건너뛴다 (경고).`);
  }
};

const serveOne = async (app, build, foreground) => {
  const target = readyTarget(app, build);
  const pids = readPids();
  const first = await checkReady(target);
  if (first.ok && pids[app.app] && alive(pids[app.app].pid)) { console.log(`serve: ${app.app} already ready on :${app.port}`); return { ok: true }; }
  if (first.ok && !foreground) { console.log(`serve: ${app.app} ready on :${app.port} (pid unknown)`); return { ok: true }; }
  if (pids[app.app]) await killTree(pids[app.app].pid);       // 낡은 빌드를 서빙 중이거나 죽은 항목
  if (!existsSync(path.join(app.dir, app.outDir))) { console.error(`serve: ${app.app}: ${app.outDir}/ 가 없다. 먼저 build 하라.`); return { ok: false }; }
  const child = spawnVitePreview({ ...app, foreground });
  writePids({ ...readPids(), [app.app]: { pid: child.pid, port: app.port, outDir: app.outDir, startedAt: new Date().toISOString() } });
  const r = await waitReady(target, { timeoutMs: 60000 });
  if (!r.ok) {
    console.error(`serve: ${app.app} not ready on :${app.port}: ${r.why}\n--- ${app.app}.log (tail) ---\n${tail(path.join(runDir, 'logs', `${app.app}.log`))}`);
    return { ok: false, child };
  }
  console.log(`serve: ${app.app} started pid ${child.pid} on :${app.port}`);
  return { ok: true, child };
};

export const serve = async ({ flags = {} } = {}) => {
  warnMissingBaseline(flags);
  const apps = selectApps(flags);
  if (apps.length === 0) { console.log('serve: no active apps'); return 0; }
  const build = readBuild();
  const results = await apps.reduce(async (accP, app) => [...(await accP), await serveOne(app, build, Boolean(flags.foreground))], Promise.resolve([]));
  const failed = results.some((r) => !r.ok);
  if (flags.foreground && !failed) {
    console.log('serve --foreground: 서버를 이 프로세스에 붙잡아 둔다 (Ctrl+C 또는 ctl stop).');
    await new Promise(() => {});
  }
  return failed ? 1 : 0;
};

export const status = async ({ flags = {} } = {}) => {
  const apps = selectApps({ ...flags, baseline: true });
  const pids = readPids();
  const build = readBuild();
  const rows = await Promise.all(apps.map(async (a) => {
    const p = pids[a.app];
    const r = await checkReady(readyTarget(a, build));
    return { app: a.app, port: a.port, pid: p?.pid ?? null, alive: p ? alive(p.pid) : false, ready: r.ok, why: r.ok ? '' : r.why };
  }));
  if (flags.json) console.log(JSON.stringify(rows, null, 2));
  else rows.forEach((r) => console.log(`${r.app.padEnd(14)} :${r.port} pid=${r.pid ?? '-'} alive=${r.alive} ready=${r.ready}${r.why ? ` (${r.why})` : ''}`));
  return rows.length > 0 && rows.every((r) => r.alive && r.ready) ? 0 : 1;
};

export const stop = async ({ flags = {} } = {}) => {
  const only = onlySet(flags);
  const pids = readPids();
  const targets = Object.entries(pids).filter(([app]) => !only || only.has(app));
  await Promise.all(targets.map(async ([app, p]) => { await killTree(p.pid); console.log(`stop: ${app} (pid ${p.pid})`); }));
  writePids(Object.fromEntries(Object.entries(pids).filter(([app]) => only && !only.has(app))));
  return 0;
};
