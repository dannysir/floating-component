// mfa-lab/scripts/lib/browser.mjs — 레인 해석. lane.json(커밋) → 이 기계의 경로(.run/lane.local.json, 무시).
// 레인을 조용히 바꾸지 않는다. 찾지 못하면 'missing'을 돌려줄 뿐이다.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { e2eDir, runDir } from './apps.mjs';

export const laneJsonPath = path.join(e2eDir, 'lane.json');
export const laneLocalPath = path.join(runDir, 'lane.local.json');
export const labBrowsersPath = path.join(runDir, 'pw-browsers');
export const OPT_BROWSERS = '/opt/pw-browsers';

export const readLane = () => (existsSync(laneJsonPath) ? JSON.parse(readFileSync(laneJsonPath, 'utf8')) : null);
export const readLaneLocal = () => (existsSync(laneLocalPath) ? JSON.parse(readFileSync(laneLocalPath, 'utf8')) : null);

export const listDir = (dir) => { try { return readdirSync(dir).sort(); } catch { return []; } };

const findFile = (dir, name, depth = 3) => {
  if (depth < 0 || !existsSync(dir)) return null;
  const entries = (() => { try { return readdirSync(dir, { withFileTypes: true }); } catch { return []; } })();
  const hit = entries.find((e) => e.isFile() && e.name === name);
  if (hit) return path.join(dir, hit.name);
  return entries.filter((e) => e.isDirectory()).reduce((acc, e) => acc ?? findFile(path.join(dir, e.name), name, depth - 1), null);
};

const hasRevision = (dir, rev) => listDir(dir).some((n) => n === `chromium-${rev}` || n === `chromium_headless_shell-${rev}`);

// lane 값 → { browsersPath, executablePath } 또는 null
export const resolveLanePaths = (lane) => {
  if (!lane) return null;
  if (lane.lane === 'A') return hasRevision(OPT_BROWSERS, '1194') ? { browsersPath: OPT_BROWSERS, executablePath: null } : null;
  if (lane.lane === 'B') {
    if (hasRevision(labBrowsersPath, '1243')) return { browsersPath: labBrowsersPath, executablePath: null };
    const manual = findFile(path.join(labBrowsersPath, 'manual-153'), 'headless_shell');
    return manual ? { browsersPath: null, executablePath: manual } : null;
  }
  if (lane.lane === 'C') {
    const exe = path.join(labBrowsersPath, 'cft-141', 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    return existsSync(exe) ? { browsersPath: null, executablePath: exe } : null;
  }
  return null;
};

// doctor·install·test가 부른다. 찾으면 lane.local.json을 쓰고 'resolved', 못 찾으면 'missing', lane.json이 없으면 'none'.
export const resolveLane = () => {
  const lane = readLane();
  if (!lane) return { lane: 'none' };
  const paths = resolveLanePaths(lane);
  if (!paths) return { lane: 'missing', committed: lane };
  if (paths.browsersPath && paths.executablePath) return { lane: 'conflict', committed: lane, paths };
  mkdirSync(runDir, { recursive: true });
  const local = { ...paths, resolvedAt: new Date().toISOString() };
  writeFileSync(laneLocalPath, `${JSON.stringify(local, null, 2)}\n`);
  return { lane: 'resolved', committed: lane, local };
};
