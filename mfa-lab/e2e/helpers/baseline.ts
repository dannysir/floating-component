// 이벤트 로그 기준선: 축소 형식 { type, phase, panelId, isTrusted, top } 배열 (시각·좌표·count는 뺀다).
// 위치: doc/qa/run00-spike/evidence/baseline/<spike>.events.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ProbeEvent } from './probe.init';

export interface BaselineRecord { type: string; phase: string; panelId: string | null; isTrusted: boolean; top: boolean }

export const baselineDir = fileURLToPath(new URL('../../../doc/qa/run00-spike/evidence/baseline/', import.meta.url));

export const reduceEvents = (events: ProbeEvent[]): BaselineRecord[] =>
  events.map((e) => ({ type: e.type, phase: e.phase, panelId: e.target.panelId, isTrusted: e.isTrusted, top: e.top }));

export const writeBaseline = (name: string, events: ProbeEvent[]): string => {
  mkdirSync(baselineDir, { recursive: true });
  const file = `${baselineDir}${name}.events.json`;
  writeFileSync(file, `${JSON.stringify(reduceEvents(events), null, 1)}\n`);
  return file;
};
