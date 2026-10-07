// R08 대조: (1) stale 없는 새 페이지에서 ext-chip 드롭만(브리프 대조. 예측: calls 비어 있음, drop stopped)
// (2) 대체 유도: R08의 immediate 유도가 부작용 #17로 0/5 → R18-x01 경로(workbench, nudge 4회 뒤 settled 릴리스)로 stale을 만든 뒤 ext-chip 드롭.
import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, handlePoint, panelRect, treeNotation } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { observe, shot, invSummary, eventsSince } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { snapshot } from '../helpers/snapshot';
import { dragEvents } from '../helpers/events';
import { promote } from '../helpers/evidence';

const EXP = '패널 드래그가 아닌 드롭은 패널을 움직이지 않는다';
const chipDrop = async (page: Page, target: string) => {
  const t0 = Date.now();
  const b = (await page.getByTestId('ext-chip').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + 6, b.y + b.height / 2, { steps: 2 }); await settle(page);
  const start = dragEvents(await eventsSince(page, t0)).find((e) => e.type === 'dragstart' && e.phase === 'bubble');
  expect(start?.target.testid).toBe('ext-chip');                                            // 전제
  const dragging = await page.evaluate(() => document.querySelector('[data-tree-root]')?.getAttribute('data-dragging-panel-id') ?? null);
  const c = await panelRect(page, target);
  await page.mouse.move(c.x + c.width / 2, c.y + 40); await page.mouse.move(c.x + c.width / 2, c.y + 40); await settle(page);
  await page.mouse.up(); await settle(page);
  const ev = dragEvents(await eventsSince(page, t0));
  return { start, dragging, drops: ev.filter((e) => e.type === 'drop'), dragend: ev.find((e) => e.type === 'dragend'), t0 };
};

[1, 2].forEach((runNo) => {
  test(`R08-chip-control-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'census', slots: { a: 'bare-0', b: 'bare-1', c: 'bare-2', d: 'bare-3' } });
    const before = await snapshot(page, 'before');
    const r = await chipDrop(page, 'p-c');
    const { snap: after } = await shot(page, info, '03-after');
    const inv = await checkInvariants(page);
    const calls = after.calls.slice(before.calls.length).filter((x) => x.fn === 'onMovePanel');
    await observe(page, info, {
      scenario: 'R08', caseName: 'R08-chip-control', runNo, expected: `(대조: stale 없음) ${EXP}`, predicted: '(대조) `calls` 비어 있음, `drop` 레코드 `stopped: true` — 미리보기가 없으면 패널 `handleDrop`이 전파를 막는다',
      observed: `chip types [${(r.start?.types ?? []).join(',')}], dragging=${r.dragging}; onMovePanel ${calls.length}건, treeVersion ${before.treeVersion}→${after.treeVersion}; drop [${r.drops.map((e) => `${e.phase}/${e.target.panelId}${e.stopped ? '(stopped)' : ''}`).join(', ')}], dragend ${r.dragend?.dropEffect}; ${invSummary(inv)}`,
      verdict: calls.length === 0 && r.drops.some((e) => e.stopped) ? 'as-predicted' : calls.length === 0 ? 'as-ideal' : 'deviates', invariants: inv, since: r.t0,
    });
  });

  test(`R08-chip-alt-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'workbench' });
    const s = await begin(page, 'orders');
    await s.teleport(await dropPoint(page, 'billing', 'top', 0)); await s.release(); await settle(page);
    const d = await begin(page, 'board');
    await d.teleport(await handlePoint(page, 'telemetry'));
    for (let k = 0; k < 4; k++) await d.nudge();
    const rel = await d.release({ mode: 'settled' });
    const inv0 = await checkInvariants(page);
    expect.soft(inv0.find((x) => x.id === 'I2')?.pass, 'precondition: stale (I2 fails)').toBe(false);
    const { snap: before } = await shot(page, info, '01-before');
    const r = await chipDrop(page, 'orders');
    const { snap: after } = await shot(page, info, '03-after');
    const inv = await checkInvariants(page);
    const calls = after.calls.slice(before.calls.length).filter((x) => x.fn === 'onMovePanel');
    await observe(page, info, {
      scenario: 'R08', caseName: 'R08-chip-alt', runNo, expected: `(대체 유도: R18-x01 경로) ${EXP}`, predicted: `(대체 유도) ${'ext-chip 드롭이 패널 `handleDrop`을 `isPreviewActive`로 통과해 루트 `onDrop`에 닿고 **stale 이동이 커밋된다**: `calls`에 `onMovePanel` 1건, `treeVersion` +1, 프로브의 `dragstart` 대상은 `ext-chip`이고 `data-dragging-panel-id` 없음'}`,
      observed: `stale 상태(release under=${rel.underCursorAtDrop}, ${invSummary(inv0)}, 렌더 ${before.dom.domTree} / 커밋 ${before.treeNotation}); chip types [${(r.start?.types ?? []).join(',')}], dragging=${r.dragging}; orders 위에 놓기: onMovePanel ${calls.length}건 ${calls.map((x) => JSON.stringify(x.args)).join(' ')}, treeVersion ${before.treeVersion}→${after.treeVersion}, 커밋 ${treeNotation(after.tree as Parameters<typeof treeNotation>[0])}; drop [${r.drops.map((e) => `${e.phase}/${e.target.panelId}${e.stopped ? '(stopped)' : ''}`).join(', ')}], dragend ${r.dragend?.dropEffect}; 뒤 ${invSummary(inv)}`,
      verdict: calls.length === 0 ? 'as-ideal' : calls.length === 1 && after.treeVersion > before.treeVersion && r.dragging === null ? 'as-predicted' : 'deviates',
      invariants: inv, since: r.t0, labels: { harness_amplified: true, induction: 'R18-x01 경로(nudge emulated)' },
    });
    if (runNo === 1) {
      const caseDir = new URL(`../.artifacts/r08b-chip-control-and-alt/${info.title}/`, import.meta.url).pathname;
      await promote({ run: 'run01-tier1', findingId: 'FC-QA-009', caseDir, images: ['03-after.png'], prefix: 'R08c-' });
    }
  });
});
