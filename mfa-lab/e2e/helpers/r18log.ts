// R18 탐색 로그(doc/qa/run01-tier1/obs/R18-log.json). 입력별로 항목을 갈아 끼운다(마우스·터치 스펙이 각각 쓴다).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface R18Entry { n: number; input: string; description: string; helper: string; invariants: string[]; diff: string; note: string; result: 'ok' | 'invariant-fail' | 'anomaly' | 'error' }
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'doc', 'qa', 'run01-tier1', 'obs', 'R18-log.json');

export const writeR18 = (input: string, entries: R18Entry[]) => {
  const prev: R18Entry[] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  const merged = [...prev.filter((e) => e.input !== input), ...entries].sort((a, b) => a.n - b.n);
  writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`);
  return file;
};
