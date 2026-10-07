// 증거와 기준선. 규칙: doc/qa/mfa/HARNESS.md 「evidence.ts」, 「증거와 라벨」
import type { Locator, Page, TestInfo } from '@playwright/test';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { harnessError } from './errors';
import { settle } from './settle';
import { snapshot } from './snapshot';
import { readProbe } from './probe.init';
import { labStateOf } from './labstate';
import type { InvariantResult } from './invariants';
import type { BaselineRecord } from './baseline';

export { reduceEvents, writeBaseline, baselineDir } from './baseline';
export type { BaselineRecord } from './baseline';

const e2eRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
export const artifactsRoot = path.join(e2eRoot, '.artifacts');

// 기준선 비교: 축소 형식 두 배열을 순서대로 비교하되, 연속된 같은 dragover 레코드는 하나로 본다.
const collapse = (xs: BaselineRecord[]): BaselineRecord[] => xs.reduce<BaselineRecord[]>((acc, r) => {
  const last = acc[acc.length - 1];
  const same = last && r.type === 'dragover' && last.type === r.type && last.phase === r.phase && last.panelId === r.panelId && last.isTrusted === r.isTrusted && last.top === r.top;
  return same ? acc : [...acc, r];
}, []);
const key = (r: BaselineRecord) => `${r.type}/${r.phase}/${r.panelId}/${r.isTrusted}/${r.top}`;

export const compareBaseline = (a: BaselineRecord[], b: BaselineRecord[]): { equal: boolean; index: number; a: string | null; b: string | null } => {
  const ca = collapse(a).map(key);
  const cb = collapse(b).map(key);
  const n = Math.max(ca.length, cb.length);
  const index = Array.from({ length: n }, (_, i) => i).find((i) => ca[i] !== cb[i]) ?? -1;
  return { equal: index === -1, index, a: index === -1 ? null : ca[index] ?? null, b: index === -1 ? null : cb[index] ?? null };
};

export const readBaseline = (name: string): BaselineRecord[] =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../doc/qa/run00-spike/evidence/baseline/${name}.events.json`, import.meta.url)), 'utf8'));

const caseDirOf = (info: TestInfo) => path.join(artifactsRoot, path.basename(info.file).replace(/\.spec\.ts$/, ''), info.title.replace(/[^\w.-]+/g, '_'));

// settle 뒤 <label>.png와 <label>.snapshot.json을 .artifacts/<spec>/<case>/에 쓴다.
export const capture = async (page: Page, info: TestInfo, label: string, opts: { element?: Locator } = {}): Promise<string> => {
  const dir = caseDirOf(info);
  mkdirSync(dir, { recursive: true });
  await settle(page);
  const png = path.join(dir, `${label}.png`);
  if (opts.element) await opts.element.screenshot({ path: png });
  else await page.screenshot({ path: png });
  writeFileSync(path.join(dir, `${label}.snapshot.json`), `${JSON.stringify(await snapshot(page, label), null, 1)}\n`);
  return png;
};

// 케이스 끝: events.json(프로브 덤프), console.txt
export const finishCase = async (page: Page, info: TestInfo, since = 0): Promise<string> => {
  const dir = caseDirOf(info);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'events.json'), `${JSON.stringify((await readProbe(page, { since })).events, null, 1)}\n`);
  const st = labStateOf(page);
  writeFileSync(path.join(dir, 'console.txt'), [...(st?.console ?? []).map((c) => `[${c.type}] ${c.text}`), ...(st?.pageErrors ?? []).map((e) => `[pageerror] ${e}`)].join('\n'));
  return dir;
};

export interface Observation {
  run: string; runNo: number; scenario: string; case: string;
  expected: string; predicted: string; observed: string;
  verdict: 'as-ideal' | 'as-predicted' | 'deviates';
  labels: Record<string, string | boolean>;
  lib: { source: string; tree: string; commit: string };
  invariants: InvariantResult[];
  artifacts: string[];
}

export const writeObservation = async (obs: Observation): Promise<string> => {
  const dir = path.join(repoRoot, 'doc', 'qa', obs.run, 'obs');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${obs.case}-run${obs.runNo}.json`);
  writeFileSync(file, `${JSON.stringify(obs, null, 2)}\n`);
  return file;
};

// caseDir에서 고른 파일만 doc/qa/<run>/evidence/<findingId>/로 복사한다. 대상 디렉터리를 비우고 다시 쓴다.
export const promote = async (opts: { run: string; findingId: string; caseDir: string; images: string[] }): Promise<string> => {
  if (opts.images.length > 6) throw harnessError(`promote: ${opts.images.length} images > 6`);
  const dest = path.join(repoRoot, 'doc', 'qa', opts.run, 'evidence', opts.findingId);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  opts.images.forEach((img) => copyFileSync(path.join(opts.caseDir, img), path.join(dest, path.basename(img))));
  const renames: Record<string, string> = { '01-before.snapshot.json': 'tree-before.json', '03-after.snapshot.json': 'tree-after.json', '02-mid.snapshot.json': '02-mid.snapshot.json', 'events.json': 'events.json', 'console.txt': 'console.txt' };
  Object.entries(renames).forEach(([from, to]) => {
    const src = path.join(opts.caseDir, from);
    if (existsSync(src)) copyFileSync(src, path.join(dest, to));
  });
  return dest;
};
