// mfa-lab/scripts/lib/commands.mjs — install·build·smoke·up·test. 명세: doc/qa/mfa/ARCHITECTURE.md 「실행 모델」
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { activeApps, allApps, e2eDir, labRoot, projectName, projects, registry, repoRoot, runDir } from './apps.mjs';
import { execText, playwrightInstallEnv, runNode, runNpm } from './spawn.mjs';
import { readBuild, readyTarget, writeBuild } from './buildinfo.mjs';
import { checkReady } from './ready.mjs';
import { checkPins, lockfileWarnings } from './pins.mjs';
import { serve } from './serve.mjs';
import { collectEnv } from './doctor.mjs';
import { labBrowsersPath, readLane, readLaneLocal, resolveLane } from './browser.mjs';

const sha = (text) => createHash('sha256').update(text).digest('hex');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const onlyList = (flags) => (flags.only ? String(flags.only).split(',') : null);

// 동시 실행 n개 풀
const pool = async (items, n, fn) => {
  const results = [];
  const queue = [...items];
  const worker = async () => {
    const item = queue.shift();
    if (item === undefined) return;
    results.push(await fn(item));
    await worker();
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
};

// ---------------------------------------------------------------- install

const installStampPath = (dir) => path.join(runDir, 'install', `${projectName(dir)}.stamp`);
const installKey = (dir) => sha([
  readFileSync(path.join(dir, 'package.json'), 'utf8'),
  existsSync(path.join(dir, 'package-lock.json')) ? readFileSync(path.join(dir, 'package-lock.json'), 'utf8') : '',
].join('\n'));

const installProject = async (dir, { fresh }) => {
  const name = projectName(dir);
  if (fresh) {
    rmSync(path.join(dir, 'node_modules'), { recursive: true, force: true });
    rmSync(path.join(dir, 'package-lock.json'), { force: true });
  }
  const stampPath = installStampPath(dir);
  if (!fresh && existsSync(path.join(dir, 'node_modules')) && existsSync(stampPath) && readFileSync(stampPath, 'utf8') === installKey(dir)) {
    console.log(`install: ${name} up to date`);
    return { name, ok: true };
  }
  const hasLock = existsSync(path.join(dir, 'package-lock.json'));
  const args = hasLock ? ['ci', '--no-audit', '--no-fund'] : ['install', '--no-audit', '--no-fund'];
  console.log(`install: ${name}: npm ${args.join(' ')}`);
  try {
    await runNpm(args, { cwd: dir });
  } catch (e) {
    console.error(`install: ${name} failed: ${e.message}`);
    return { name, ok: false };
  }
  mkdirSync(path.dirname(stampPath), { recursive: true });
  writeFileSync(stampPath, installKey(dir));
  return { name, ok: true };
};

const installLaneBrowser = async (lane) => {
  if (lane.lane === 'A') return 0;                                        // /opt/pw-browsers를 그대로 쓴다
  if (lane.lane === 'B') {
    const cli = path.join(e2eDir, 'node_modules', '@playwright', 'test', 'cli.js');
    if (!existsSync(cli)) { console.error('install: e2e의 @playwright/test가 없다'); return 1; }
    console.log(`install: lane B browser -> ${labBrowsersPath}`);
    return runNode([cli, 'install', 'chromium'], { cwd: labRoot, env: playwrightInstallEnv() });
  }
  if (lane.lane === 'C') {
    const zip = path.join(runDir, 'dl', 'cft-141.zip');
    mkdirSync(path.dirname(zip), { recursive: true });
    const url = 'https://storage.googleapis.com/chrome-for-testing-public/141.0.7390.37/linux64/chrome-headless-shell-linux64.zip';
    const dl = await execText('curl', ['-fL', '--retry', '2', '-o', zip, url], { timeout: 600000 });
    if (!dl.ok) { console.error(`install: lane C download failed: ${dl.stderr}`); return 1; }
    const dest = path.join(labBrowsersPath, 'cft-141');
    mkdirSync(dest, { recursive: true });
    const uz = await execText('unzip', ['-q', '-o', '-d', dest, zip], { timeout: 600000 });
    return uz.ok ? 0 : 1;
  }
  return 1;
};

export const ensureLaneBrowser = async () => {
  const lane = readLane();
  if (!lane) return 'none';
  const first = resolveLane();
  if (first.lane === 'resolved') return 'resolved';
  const code = await installLaneBrowser(lane);
  if (code !== 0) console.error(`install: lane ${lane.lane} browser install exited ${code} (레인을 바꾸지 않는다)`);
  return resolveLane().lane;
};

const projectDirFor = (name) => (name === 'e2e' ? e2eDir : allApps().find((a) => a.app === name)?.dir);

export const install = async ({ flags = {} } = {}) => {
  const only = onlyList(flags);
  const dirs = only ? [...new Set(only.map(projectDirFor).filter(Boolean))].filter((d) => existsSync(path.join(d, 'package.json'))) : projects();
  // e2e는 브라우저 설치에 필요하므로 다른 프로젝트와 함께 돌려도 된다.
  const results = await pool(dirs, 3, (d) => installProject(d, { fresh: Boolean(flags.fresh) }));
  const failed = results.filter((r) => !r.ok);
  const laneState = !only || only.includes('e2e') ? await ensureLaneBrowser() : 'skipped';
  if (laneState === 'missing') { console.error('install: 커밋된 레인의 브라우저를 찾지 못했다 (BLOCKED-LANE 후보)'); return 3; }
  return failed.length ? 1 : 0;
};

// ---------------------------------------------------------------- build

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
const listFiles = (dir) => {
  if (!existsSync(dir)) return [];
  const st = statSync(dir);
  if (st.isFile()) return [dir];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => !SKIP_DIRS.has(e.name) && !e.name.startsWith('dist-'))
    .flatMap((e) => listFiles(path.join(dir, e.name)));
};
const hashInputs = (paths, extra) => sha([
  ...paths.flatMap(listFiles).sort().map((f) => `${path.relative(repoRoot, f)}:${sha(readFileSync(f))}`),
  JSON.stringify(extra),
].join('\n'));

const hasDep = (dir, name) => {
  const p = path.join(dir, 'package.json');
  if (!existsSync(p)) return false;
  const pkg = readJson(p);
  return Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
};

const shellDir = path.join(labRoot, registry.shell.dir);
export const shellHasBaseline = () => hasDep(shellDir, registry.baseline.npm051.alias);
// MF 기본값: 플러그인이 설치 대상에 있으면 on. 명시적 --mf가 우선한다. mfa-lab/mf-mode.json이 있으면 그 값(MF degraded 기록).
const mfModePath = path.join(labRoot, 'mf-mode.json');
const defaultMf = (dir) => {
  if (existsSync(mfModePath)) return readJson(mfModePath).mf;
  return hasDep(dir, '@module-federation/vite') ? 'on' : 'off';
};

const newStamp = () => `${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}-${randomBytes(2).toString('hex')}`;

const git = async (args) => (await execText('git', args, { cwd: repoRoot })).stdout.trim();

// 앱 하나의 빌드 계획: { app, dir, outDir, env, inputs, lib, mf }
const planFor = (app, { lib, mf }) => {
  const isShell = app.app === 'shell' || app.app === 'shell-051';
  const twinSrc = ['mfe-orders', 'mfe-board', 'mfe-billing'].map((d) => path.join(labRoot, 'apps', d, 'src'));
  const inputPaths = [app.dir, path.join(labRoot, 'contract'), path.join(labRoot, 'registry.json'),
    ...(isShell ? [path.join(repoRoot, 'src'), ...twinSrc] : [])];
  return { app, isShell, lib: isShell ? lib : null, mf, inputs: hashInputs(inputPaths, { lib: isShell ? lib : null, mf }) };
};

const buildOne = async (plan, { stamp, force, tree, commit }) => {
  const { app } = plan;
  const prev = readBuild().apps[app.app];
  const entryFile = app.kind === 'mount' ? 'remote-entry.js' : 'index.html';
  const outExists = existsSync(path.join(app.dir, app.outDir, entryFile));
  if (!force && prev && prev.inputs === plan.inputs && outExists) {
    console.log(`build: ${app.app} unchanged (buildId ${prev.buildId})`);
    return { app: app.app, ok: true, skipped: true };
  }
  const viteBin = path.join(app.dir, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(viteBin)) { console.error(`build: ${app.app}: vite가 설치되지 않았다. 먼저 install.`); return { app: app.app, ok: false }; }
  const buildId = stamp ?? newStamp();
  const env = {
    ...process.env,
    LAB_BUILD_STAMP: buildId,
    LAB_MF: plan.mf,
    ...(plan.isShell ? { LAB_LIB: plan.lib, LAB_LIB_TREE: tree, LAB_LIB_COMMIT: commit } : {}),
  };
  console.log(`build: ${app.app} (lib=${plan.lib ?? '-'} mf=${plan.mf} stamp=${buildId})`);
  const t0 = Date.now();
  const code = await runNode([viteBin, 'build'], { cwd: app.dir, env });
  if (code !== 0) { console.error(`build: ${app.app} failed (exit ${code})`); return { app: app.app, ok: false }; }
  const data = readBuild();
  writeBuild({ ...data, apps: { ...data.apps, [app.app]: { buildId, lib: plan.lib, mf: plan.mf, outDir: app.outDir, builtAt: new Date().toISOString(), inputs: plan.inputs, seconds: (Date.now() - t0) / 1000 } } });
  return { app: app.app, ok: true };
};

export const build = async ({ flags = {} } = {}) => {
  const only = onlyList(flags);
  const libFlag = flags.lib ? String(flags.lib) : null;
  const apps = activeApps().filter((a) => !a.baseline);
  const base = allApps().find((a) => a.baseline);
  const remotes = apps.filter((a) => a.app !== 'shell');
  const shell = apps.find((a) => a.app === 'shell');
  // 대상: --lib npm051 → shell-051만. 그 밖에는 remote 먼저, shell 나중.
  const targets = libFlag === 'npm051'
    ? (shellHasBaseline() ? [base] : [])
    : [...remotes, ...(shell ? [shell] : [])].filter((a) => !only || only.includes(a.app));
  const withBaseline = only?.includes('shell-051') && libFlag !== 'npm051' && shellHasBaseline() ? [base] : [];
  const all = [...targets, ...withBaseline];
  if (libFlag === 'npm051' && !shellHasBaseline()) { console.error('build: shell package.json에 fc-051이 없다'); return 1; }
  if (all.length === 0) { console.log('build: nothing to build'); return 0; }
  const tree = await git(['rev-parse', 'HEAD:src']);
  const commit = await git(['rev-list', '-1', 'HEAD', '--', 'src']);
  const stamp = flags.stamp ? String(flags.stamp) : process.env.LAB_BUILD_STAMP || null;
  const force = Boolean(flags.force) || Boolean(only) || Boolean(stamp);   // --only나 스탬프 지정이면 항상 빌드한다
  const results = await all.reduce(async (accP, app) => {
    const acc = await accP;
    if (acc.some((r) => !r.ok)) return acc;
    const lib = app.app === 'shell-051' ? 'npm051' : (libFlag ?? 'src');
    const mf = flags.mf ? String(flags.mf) : defaultMf(app.dir);
    return [...acc, await buildOne(planFor(app, { lib, mf }), { stamp, force, tree, commit })];
  }, Promise.resolve([]));
  return results.every((r) => r.ok) ? 0 : 1;
};

// ---------------------------------------------------------------- smoke

const PROTECTED = ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts'];

export const smoke = async () => {
  const failures = [];
  const warnings = [];
  checkPins().forEach((p) => failures.push(`pin: ${p}`));

  const prot = await execText('git', ['status', '--porcelain', '--', ...PROTECTED], { cwd: repoRoot });
  if (prot.stdout.trim()) failures.push(`protected root files changed:\n${prot.stdout}`);
  const srcSt = await execText('git', ['status', '--porcelain', '--', 'src'], { cwd: repoRoot });
  if (srcSt.stdout.trim()) warnings.push(`src/ has changes:\n${srcSt.stdout}`);

  const build = readBuild();
  const apps = activeApps({ baseline: true });
  await Promise.all(apps.map(async (a) => {
    const r = await checkReady(readyTarget(a, build));
    if (!r.ok) failures.push(`ready: ${a.app} (${readyTarget(a, build).url}): ${r.why}`);
    else console.log(`smoke: ready ${a.app}${r.content ? ` (${r.content})` : ''}`);
  }));

  // MF 매니페스트: shell 빌드가 mf on일 때만
  if (build.apps.shell?.mf === 'on') {
    await Promise.all(apps.filter((a) => a.kind === 'same-tree').map(async (a) => {
      const r = await checkReady({ url: `${a.origin}/mf-manifest.json`, kind: 'manifest', expect: a.slot });
      if (!r.ok) { failures.push(`manifest: ${a.app}: ${r.why}`); return; }
      const exposes = JSON.stringify(r.manifest.exposes ?? []);
      if (!exposes.includes('Panel')) failures.push(`manifest: ${a.app}: exposes has no Panel`);
      else console.log(`smoke: manifest ${a.app} name=${r.manifest.name} exposes Panel`);
    }));
  }

  // billing 단독 페이지
  const billing = apps.find((a) => a.app === 'mfe-billing');
  if (billing) {
    const res = await fetch(`${billing.origin}/`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
    const body = res ? await res.text() : '';
    if (!res || res.status !== 200 || !body.includes('remote-entry.js')) failures.push('billing standalone: / does not reference remote-entry.js');
    else console.log('smoke: billing standalone page references remote-entry.js');
  }

  lockfileWarnings().forEach((w) => warnings.push(`lockfile: ${w}`));
  warnings.forEach((w) => console.warn(`smoke: WARN ${w}`));
  failures.forEach((f) => console.error(`smoke: FAIL ${f}`));
  console.log(`smoke: ${failures.length === 0 ? 'OK' : 'FAILED'} (${apps.length} apps, ${warnings.length} warnings)`);
  return failures.length === 0 ? 0 : 1;
};

// ---------------------------------------------------------------- up

export const up = async () => {
  const times = {};
  const timed = async (key, fn) => { const t0 = Date.now(); const r = await fn(); times[key] = (Date.now() - t0) / 1000; return r; };
  const env = await collectEnv();
  if (!env.node_ok) { console.error(`up: Node ${env.node} < 22.12 (BLOCKED-NODE)`); return 1; }
  console.log(`up: node ${env.node}, lane_candidate ${env.lane_candidate}, lane ${env.lane_resolution}`);
  const ic = await timed('install', () => install({ flags: {} }));
  if (ic === 3) { console.error('up: BLOCKED-LANE — 커밋된 레인의 브라우저를 설치 뒤에도 찾지 못했다. 레인을 바꾸지 않는다.'); return 3; }
  if (ic !== 0) return ic;
  const laneState = readLane() ? resolveLane().lane : 'none';
  if (laneState === 'missing') { console.error('up: BLOCKED-LANE'); return 3; }
  const bc = await timed('build', async () => {
    const a = await build({ flags: { lib: 'src' } });
    if (a !== 0) return a;
    return shellHasBaseline() ? build({ flags: { lib: 'npm051' } }) : 0;
  });
  if (bc !== 0) return bc;
  const sc = await timed('serve', () => serve({ flags: { baseline: true } }));
  if (sc !== 0) return sc;
  const smc = await timed('smoke', () => smoke());
  mkdirSync(runDir, { recursive: true });
  writeFileSync(path.join(runDir, 'durations.json'), `${JSON.stringify({ at: new Date().toISOString(), ...times }, null, 2)}\n`);
  console.log(`up: durations (s) ${JSON.stringify(times)}`);
  return smc;
};

// ---------------------------------------------------------------- test

export const test = async ({ flags = {}, positional = [] } = {}) => {
  const sc = await serve({ flags: { baseline: true } });                         // 서버 보장. 이미 떠 있으면 건너뛴다
  if (sc !== 0) { console.error('test: serve failed'); return sc; }
  if (readLane() && !readLaneLocal()) {
    if (resolveLane().lane !== 'resolved') { console.error('test: 레인 브라우저를 찾지 못했다. `ctl up` 또는 `ctl install`을 먼저 실행하라.'); return 1; }
  }
  const local = readLaneLocal() ?? {};
  const env = { ...process.env, ...(local.browsersPath ? { PLAYWRIGHT_BROWSERS_PATH: local.browsersPath } : {}) };
  const cli = path.join(e2eDir, 'node_modules', '@playwright', 'test', 'cli.js');
  const args = [cli, 'test', '-c', path.join(e2eDir, 'playwright.config.ts'), ...positional, '--project', String(flags.project ?? 'mouse')];
  return runNode(args, { cwd: labRoot, env });
};
