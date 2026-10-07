// mfa-lab/scripts/lib/buildinfo.mjs — .run/build.json 읽기·쓰기와 앱별 준비 판정 대상.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { runDir } from './apps.mjs';

const buildPath = path.join(runDir, 'build.json');

export const readBuild = () => (existsSync(buildPath) ? JSON.parse(readFileSync(buildPath, 'utf8')) : { apps: {} });
export const writeBuild = (data) => {
  mkdirSync(runDir, { recursive: true });
  writeFileSync(`${buildPath}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(`${buildPath}.tmp`, buildPath);
};

// same-tree remote는 MF off 빌드면 HTML meta로 판정한다. buildId는 build.json에 있을 때만 확인한다.
export const readyTarget = (app, build = readBuild()) => {
  const info = build.apps[app.app];
  const base = app.ready.fallback && info?.mf === 'off' ? app.ready.fallback : app.ready;
  return { ...base, buildId: base.kind === 'html' ? info?.buildId : undefined };
};
