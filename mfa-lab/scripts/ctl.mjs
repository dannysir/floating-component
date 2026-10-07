#!/usr/bin/env node
// mfa-lab/scripts/ctl.mjs — 의존성 없는 랩 CLI. 명령 분기만 한다. 명세: doc/qa/mfa/ARCHITECTURE.md 「실행 모델」
import { doctor } from './lib/doctor.mjs';

// 값을 갖는 플래그만 여기 적는다. 나머지(--baseline, --foreground, --json, --fresh, --force)는 boolean이다.
const VALUE_FLAGS = new Set(['only', 'lib', 'mf', 'stamp', 'project', 'write']);
const parseArgs = (argv) => argv.reduce((acc, arg) => {
  if (acc.pendingKey) return { ...acc, flags: { ...acc.flags, [acc.pendingKey]: arg }, pendingKey: null };
  if (!arg.startsWith('--')) return { ...acc, positional: [...acc.positional, arg] };
  const key = arg.slice(2);
  return VALUE_FLAGS.has(key) ? { ...acc, pendingKey: key } : { ...acc, flags: { ...acc.flags, [key]: true } };
}, { flags: {}, positional: [], pendingKey: null });

const [cmd, ...rest] = process.argv.slice(2);
const { flags, positional } = parseArgs(rest);

const commands = { doctor };
const run = commands[cmd];
if (!run) {
  console.error(`usage: node mfa-lab/scripts/ctl.mjs <${Object.keys(commands).join('|')}> [...]`);
  process.exit(2);
}
run({ flags, positional }).then((code) => process.exit(code ?? 0), (err) => { console.error(err?.stack ?? err); process.exit(1); });
