// mfa-lab/scripts/lib/pins.mjs — 핀 검사. pins에 있는 의존성은 핀과 정확히 같아야 하고, 어떤 의존성에도 ^·~를 쓰지 않는다.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { projectName, projects, registry } from './apps.mjs';

export const checkPins = () => projects().flatMap((dir) => {
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  return Object.entries(deps).flatMap(([name, version]) => {
    const problems = [];
    if (/^[\^~]/.test(version) || /npm:[^@]+@[\^~]/.test(version) || /npm:@[^@]+@[\^~]/.test(version)) problems.push(`${projectName(dir)}: ${name}@${version} uses ^ or ~`);
    if (registry.pins[name] && registry.pins[name] !== version) problems.push(`${projectName(dir)}: ${name}@${version} != pin ${registry.pins[name]}`);
    return problems;
  });
});

// lockfile에 Windows용 optional 패키지가 있는지 (경고만).
export const lockfileWarnings = () => projects().flatMap((dir) => {
  const lock = path.join(dir, 'package-lock.json');
  if (!existsSync(lock)) return [`${projectName(dir)}: package-lock.json 없음`];
  const text = readFileSync(lock, 'utf8');
  const usesVite = text.includes('"node_modules/vite"');
  if (!usesVite) return [];
  return ['@rollup/rollup-win32-x64-msvc', '@esbuild/win32-x64'].filter((p) => !text.includes(`node_modules/${p}"`)).map((p) => `${projectName(dir)}: lockfile에 ${p} 없음`);
});
