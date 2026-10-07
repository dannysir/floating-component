// S8 (B1-03f, 기록): rAF 경합 비율. census bare에서 p-d를 (p-a, left, 1)로 hover한 뒤 5칸 × 10회 놓는다. 드롭마다 페이지를 새로 연다.
// 칸: overShadow×source, settled×{source, other-droppable}, immediate×{source, other-droppable}. overShadow×other-droppable은 만들 수 없다.
// stale preview = 릴리스·settle 뒤 I1은 통과하고 I2 또는 I5가 실패 (doc/qa/mfa/HARNESS.md 「stale preview 판정 규칙」).
// immediate의 비율은 하네스가 만든 값이다. 사용자 체감 빈도로 인용하지 않는다.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, handlePoint, panelRect, underCursor } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { checkInvariants } from '../helpers/invariants';

const N = 10;
const CELLS = [
  { mode: 'overShadow', under: 'source' },
  { mode: 'settled', under: 'source' },
  { mode: 'settled', under: 'other-droppable' },
  { mode: 'immediate', under: 'source' },
  { mode: 'immediate', under: 'other-droppable' },
] as const;

const outDir = fileURLToPath(new URL('../.artifacts/s08/', import.meta.url));
const jsonl = `${outDir}results.jsonl`;
const evidence = fileURLToPath(new URL('../../../doc/qa/run00-spike/evidence/s08-ratio.json', import.meta.url));
const runId = process.env.S08_RUN_ID ?? 'default';

CELLS.forEach((cell) => {
  Array.from({ length: N }, (_, i) => i + 1).forEach((n) => {
    test(`S8 ${cell.mode} x ${cell.under} #${n}`, async ({ lab, page }) => {
      await lab.open({ layout: 'census', slots: { a: 'bare-0', b: 'bare-1', c: 'bare-2', d: 'bare-3' } });
      await settle(page);
      const drag = await begin(page, 'bare-3');
      const hover = await drag.teleport(await dropPoint(page, 'p-a', 'left', 1));
      expect(hover.dom.domTree).toBe('H[p-d,p-a,V[p-b,p-c]]');                // 하네스 전제

      // 릴리스 지점: source = 소스 shadow 헤더, other-droppable = 미리보기 안 p-a 중앙(같은 미리보기를 다시 만든다)
      const point = cell.under === 'source'
        ? await handlePoint(page, 'bare-3')
        : await panelRect(page, 'p-a').then((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }));
      let underBefore: string | null = null;
      if (cell.mode === 'overShadow') {
        await drag.release({ mode: 'overShadow' });
      } else if (cell.mode === 'settled') {
        await drag.teleport(point);
        const u = await underCursor(page, point.x, point.y);
        underBefore = u.panelId;
        await drag.release({ mode: 'settled' });
      } else {
        await page.mouse.move(point.x, point.y);                           // 대기 없이
        await drag.release({ mode: 'immediate' });
      }
      await settle(page);
      const inv = await checkInvariants(page);
      const pass = (id: string) => inv.find((r) => r.id === id)?.pass ?? true;
      const stale = pass('I1') && (!pass('I2') || !pass('I5'));
      const lastDragover = await page.evaluate(() => {
        const ev = (window as unknown as { __probe: { events: Array<{ type: string; target: { panelId: string | null } }> } }).__probe.events;
        return [...ev].reverse().find((e) => e.type === 'dragover')?.target.panelId ?? null;
      });
      const calls = await page.evaluate(() => (window as unknown as { __fc: { calls: Array<{ fn: string }> } }).__fc.calls.filter((c) => c.fn === 'onMovePanel').length);
      const rec = { runId, mode: cell.mode, under: cell.under, n, stale, lastDragover, underBefore, onMovePanel: calls, inv: inv.map((r) => `${r.id}=${r.pass}`).join(' ') };
      mkdirSync(outDir, { recursive: true });
      appendFileSync(jsonl, `${JSON.stringify(rec)}\n`);
      console.log(`[S8] ${JSON.stringify(rec)}`);
    });
  });
});

test('S8 aggregate', async () => {
  expect(existsSync(jsonl)).toBe(true);
  const recs = readFileSync(jsonl, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { runId: string; mode: string; under: string; n: number; stale: boolean; lastDragover: string | null })
    .filter((r) => r.runId === runId);
  const table = CELLS.map((c) => {
    const rows = recs.filter((r) => r.mode === c.mode && r.under === c.under).slice(-N);
    return { mode: c.mode, under: c.under, stale: rows.filter((r) => r.stale).length, total: rows.length, lastDragover: [...new Set(rows.map((r) => r.lastDragover))] };
  });
  console.log(`[S8] table ${JSON.stringify(table)}`);
  writeFileSync(evidence, `${JSON.stringify({ runId, table }, null, 2)}\n`);
  table.forEach((r) => expect(r.total).toBe(N));
});
