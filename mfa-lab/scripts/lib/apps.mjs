// mfa-lab/scripts/lib/apps.mjs — 레지스트리 읽기, 활성 집합, 경로 상수.
// 경로는 fileURLToPath로 만든다. 활성 집합 = 디렉터리와 package.json이 있는 앱.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const labRoot = fileURLToPath(new URL('../../', import.meta.url));           // <repo>/mfa-lab/
export const repoRoot = path.resolve(labRoot, '..');
export const runDir = path.join(labRoot, '.run');
export const e2eDir = path.join(labRoot, 'e2e');
export const registry = JSON.parse(readFileSync(path.join(labRoot, 'registry.json'), 'utf8'));

const portOf = (origin) => Number(new URL(origin).port);

// 서버로 띄우는 단위. telemetry-x는 dir이 없어 빠진다 (같은 서버).
const candidates = () => [
  { app: 'shell', dir: path.join(labRoot, registry.shell.dir), port: portOf(registry.shell.origin), origin: registry.shell.origin,
    ready: { url: `${registry.shell.origin}/`, kind: 'html', expect: 'shell' }, outDir: 'dist' },
  { app: 'shell-051', dir: path.join(labRoot, registry.baseline.npm051.dir), port: portOf(registry.baseline.npm051.origin), origin: registry.baseline.npm051.origin,
    ready: { url: `${registry.baseline.npm051.origin}/`, kind: 'html', expect: 'shell-051' }, outDir: registry.baseline.npm051.outDir, baseline: true },
  ...Object.entries(registry.remotes).filter(([, r]) => r.dir).map(([name, r]) => ({
    app: r.app, slot: name, kind: r.kind, dir: path.join(labRoot, r.dir), port: portOf(r.origin), origin: r.origin, outDir: 'dist',
    ready: r.kind === 'same-tree' ? { url: `${r.origin}/mf-manifest.json`, kind: 'manifest', expect: name, fallback: { url: `${r.origin}/`, kind: 'html', expect: r.app } }
      : r.kind === 'mount' ? { url: `${r.origin}${r.entry}`, kind: 'module' }
      : { url: `${r.origin}/`, kind: 'html', expect: r.app },
  })),
];

export const allApps = () => candidates();

export const activeApps = ({ baseline = false } = {}) => candidates().filter((a) =>
  existsSync(path.join(a.dir, 'package.json')) && (!a.baseline || (baseline && existsSync(path.join(a.dir, a.outDir, 'index.html')))));

// 설치 단위(프로젝트 디렉터리). shell-051은 shell과 같은 디렉터리라 중복을 없앤다.
export const projects = () => [...new Set([...candidates().filter((a) => !a.baseline).map((a) => a.dir), e2eDir])]
  .filter((d) => existsSync(path.join(d, 'package.json')));

export const projectName = (dir) => (dir === e2eDir ? 'e2e' : path.basename(dir));

export const ports = () => [...new Set([registry.shell.origin, registry.baseline.npm051.origin,
  ...Object.values(registry.remotes).map((r) => r.origin)].map(portOf))].sort((a, b) => a - b);
