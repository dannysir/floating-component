// mfa-lab/scripts/lib/doctor.mjs — 환경 탐침. 외부 탐침은 curl과 npm으로 한다(둘 다 프록시 변수를 따른다).
// Node fetch는 NODE_USE_ENV_PROXY 없이는 프록시를 무시하므로 외부 탐침에 쓰지 않는다.
import { mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { ports, repoRoot } from './apps.mjs';
import { execText, isWin } from './spawn.mjs';
import { OPT_BROWSERS, labBrowsersPath, listDir, resolveLane } from './browser.mjs';

const HOSTS = ['registry.npmjs.org', 'cdn.playwright.dev', 'playwright.download.prss.microsoft.com', 'storage.googleapis.com'];
const PROXY_VARS = ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy'];
const devnull = isWin ? 'NUL' : '/dev/null';
const MIN_NODE = [22, 12];

export const probeHost = async (host) => {
  const r = await execText('curl', ['-sS', '-o', devnull, '-w', '%{http_code}', '--max-time', '15', `https://${host}/`], { timeout: 20000 });
  return r.stdout.trim() || '000';                           // '000' = 연결 불가
};
export const probeNpm = async () => {
  const r = await execText(isWin ? 'npm.cmd' : 'npm', ['ping'], { timeout: 30000 });   // 성공: "npm notice PONG <ms>"
  return r.ok ? 'ok' : 'fail';
};
export const redactProxy = (value) => (value ? value.replace(/\/\/[^@/]+@/, '//') : null);   // user:pass@ 제거. env.json은 커밋된다

// NO_PROXY는 길어서 설정 여부만, 프록시 URL은 host:port만 남긴다.
const proxyInfo = () => Object.fromEntries(PROXY_VARS.map((k) => {
  const v = process.env[k];
  if (!v) return [k, { set: false }];
  if (/no_proxy/i.test(k)) return [k, { set: true, entries: v.split(',').length }];
  const clean = redactProxy(v);
  const hostPort = (() => { try { const u = new URL(clean); return `${u.hostname}:${u.port}`; } catch { return clean; } })();
  return [k, { set: true, value: hostPort }];
}));

const portFree = (port) => new Promise((resolve) => {
  const srv = net.createServer();
  srv.once('error', () => resolve(false));
  srv.once('listening', () => srv.close(() => resolve(true)));
  srv.listen(port, '127.0.0.1');
});

const git = async (args) => (await execText('git', args, { cwd: repoRoot })).stdout.trim() || null;

const nodeOk = () => {
  const [maj, min] = process.versions.node.split('.').map(Number);
  return maj > MIN_NODE[0] || (maj === MIN_NODE[0] && min >= MIN_NODE[1]);
};

// cdn.playwright.dev가 000이 아니면 B. 403 + "Host not allowed"는 프록시 거부라 B가 아니다. 아니면 /opt에 1194가 있으면 A, 둘 다 아니면 C.
const laneCandidateOf = async (network, optList) => {
  const cdn = network['cdn.playwright.dev'];
  const reachable = cdn !== '000' && !(cdn === '403' && /Host not allowed/i.test((await execText('curl', ['-sS', '--max-time', '15', 'https://cdn.playwright.dev/'])).stdout));
  if (reachable) return 'B';
  if (optList.some((n) => /^chromium(_headless_shell)?-1194$/.test(n))) return 'A';
  return 'C';
};

export const collectEnv = async () => {
  const network = Object.fromEntries(await Promise.all(HOSTS.map(async (h) => [h, await probeHost(h)])));
  const npmPing = await probeNpm();
  const optList = listDir(OPT_BROWSERS);
  const portEntries = await Promise.all(ports().map(async (p) => [String(p), await portFree(p)]));
  const uid = isWin ? 'n/a' : Number((await execText('id', ['-u'])).stdout.trim());
  const sudo = isWin ? 'n/a' : (await execText('sudo', ['-n', 'true'], { timeout: 5000 })).ok;
  const npmVersion = (await execText(isWin ? 'npm.cmd' : 'npm', ['-v'])).stdout.trim();
  const laneResult = resolveLane();
  return {
    written_at: new Date().toISOString(),
    working_branch: await git(['rev-parse', '--abbrev-ref', 'HEAD']),
    start_commit: await git(['rev-parse', 'HEAD']),
    library: { tree: await git(['rev-parse', 'HEAD:src']), commit: await git(['rev-list', '-1', 'HEAD', '--', 'src']) },
    shallow_clone: (await git(['rev-parse', '--is-shallow-repository'])) === 'true',
    os: `${os.type()} ${os.release()}`,
    arch: process.arch,
    node: process.version,
    node_ok: nodeOk(),
    npm: npmVersion,
    uid,
    sudo_noninteractive: sudo,
    proxy: proxyInfo(),
    network: { ...network, npm_ping: npmPing },
    playwright_env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('PLAYWRIGHT_'))),
    opt_pw_browsers: optList,
    lab_pw_browsers: listDir(labBrowsersPath),
    ports_free: Object.fromEntries(portEntries),
    lane_candidate: await laneCandidateOf(network, optList),
    lane_resolution: laneResult.lane,
    lane_local: laneResult.local ?? null,
  };
};

export const doctor = async ({ flags = {} } = {}) => {
  const env = await collectEnv();
  console.log(JSON.stringify(env, null, 2));
  if (flags.write) {
    const out = path.resolve(process.cwd(), String(flags.write));
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(env, null, 2)}\n`);
    console.log(`doctor: wrote ${out}`);
  }
  if (env.lane_resolution === 'missing') console.log('doctor: lane.json의 브라우저를 찾지 못했다 (lane: missing). `ctl install` 또는 `ctl up`이 설치한다.');
  if (env.lane_resolution === 'conflict') { console.error('doctor: browsersPath와 executablePath가 둘 다 있다. 멈추고 보고한다.'); return 1; }
  if (!env.node_ok) { console.error(`doctor: Node ${process.version} < ${MIN_NODE.join('.')} (BLOCKED-NODE). 스크립트 안에서 Node를 바꾸지 않는다.`); return 1; }
  return 0;
};
