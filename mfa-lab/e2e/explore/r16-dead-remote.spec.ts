// R16 remote 하나(orders, :4301)가 죽은 workbench. blockRemote는 lab.open 전에.
import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { begin } from '../helpers/mouseDrag';
import { domTree, dropPoint, treeNotation } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { resizeBorder } from '../helpers/resize';
import { blockRemote } from '../helpers/faults';
import { deltas, fmtDeltas, observe, shot, invSummary, eventsSince } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import type { AllowList } from '../helpers/invariants';

const ALLOW: AllowList = { I6: [/127\.0\.0\.1:4301/], I7: ['orders'] };
const EXP = {
  load: '에러 카드는 orders 패널에만. 나머지 5슬롯 ready. shell 전체가 비지 않는다',
  others: '다른 패널의 드래그·리사이즈가 동작한다',
  dead: '죽은 패널도 핸들로 끌 수 있다',
};
const PRED = {
  load: '통과(경계는 픽스처가 패널마다 둔다. `shareStrategy \'loaded-first\'`가 전제)',
  others: '통과',
  dead: '통과. 에러 카드가 함께 이동',
};
const SLOTS = ['nav', 'orders', 'board', 'billing', 'telemetry', 'telemetry-x'];
const frameStates = (page: Page) => page.evaluate(() =>
  Object.fromEntries(Object.entries((window as unknown as { __fc?: { frames: Record<string, { state?: string }> } }).__fc?.frames ?? {}).map(([k, v]) => [k, v.state ?? '?'])));
const errorCards = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="error-"]')).map((el) => ({
  testid: el.getAttribute('data-testid'), panel: el.closest('[data-panel-id]')?.getAttribute('data-panel-id') ?? null })));

const openDead = async (lab: Parameters<Parameters<typeof test>[2]>[0]['lab'], page: Page) => {
  await blockRemote(page, 'http://127.0.0.1:4301');
  await lab.open({ layout: 'workbench', expectState: { orders: 'error' } });
  await settle(page);
  expect(await domTree(page)).toBe('H[nav,orders,V[H[board,billing],H[telemetry,telemetry-x]]]');   // 전제
};

[1, 2].forEach((runNo) => {
  test(`R16-load-run${runNo}`, async ({ lab, page }, info) => {
    await openDead(lab, page);
    const t0 = Date.now();
    await shot(page, info, '01-before');
    const inv = await checkInvariants(page, { allow: ALLOW });
    const st = await frameStates(page);
    const cards = await errorCards(page);
    const retry = await page.locator('[data-testid="retry-orders"]').count();
    const shellError = await page.locator('[data-testid="shell-error"]').count();
    const errs = lab.consoleErrors().map((c) => c.text);
    const others = SLOTS.filter((s) => s !== 'orders').every((s) => st[s] === 'ready');
    const errsOnly4301 = errs.every((e) => /4301|Failed to load|ERR_FAILED|net::/.test(e));
    const ok = st.orders === 'error' && others && cards.length === 1 && cards[0].panel === 'orders' && retry === 1 && shellError === 0 && inv.every((r) => r.pass);
    await observe(page, info, {
      scenario: 'R16', caseName: 'R16-load', runNo, expected: EXP.load, predicted: PRED.load,
      observed: `frames ${JSON.stringify(st)}; 에러 카드 ${JSON.stringify(cards)}, retry-orders ${retry}, shell-error ${shellError}; 콘솔 에러 ${errs.length}건(:4301 관련만=${errsOnly4301}) ${JSON.stringify(errs.slice(0, 3))}; ${invSummary(inv)}`,
      verdict: ok ? 'as-ideal' : 'deviates', invariants: inv, since: t0, allow: ALLOW,
      extra: { consoleErrors: errs },
    });
  });

  test(`R16-others-run${runNo}`, async ({ lab, page }, info) => {
    await openDead(lab, page);
    const { snap: before } = await shot(page, info, '01-before');
    const t0 = Date.now();
    const b = await begin(page, 'billing');
    await b.teleport(await dropPoint(page, 'board', 'left', 0));
    const hover = await domTree(page);
    expect(hover).toBe('H[nav,orders,V[H[billing,board],H[telemetry,telemetry-x]]]');   // 전제
    await shot(page, info, '02-mid');
    const rel = await b.release();
    const inv1 = await checkInvariants(page, { allow: ALLOW });
    const afterDrag = await domTree(page);
    const rz = await resizeBorder(page, { between: ['orders', 'billing'], delta: 120, steps: 10 });
    const inv2 = await checkInvariants(page, { allow: ALLOW });
    const { snap: after } = await shot(page, info, '03-after');
    const calls = after.calls.map((c) => c.fn);
    const cards = await errorCards(page);
    const dA = rz.after.a - rz.before.a; const dB = rz.after.b - rz.before.b;
    const dirOk = dA > 0 && dB < 0;
    const good = afterDrag === hover && calls.filter((c) => c === 'onMovePanel').length === 1 && dirOk && inv1.every((r) => r.pass) && inv2.every((r) => r.pass) && cards.length === 1 && cards[0].panel === 'orders';
    await observe(page, info, {
      scenario: 'R16', caseName: 'R16-others', runNo, expected: EXP.others, predicted: PRED.others,
      observed: `drag: hover ${hover}, under=${rel.underCursorAtDrop}, 커밋 ${afterDrag} (${treeNotation(after.tree as Parameters<typeof treeNotation>[0])}); 불변식(드래그 뒤) ${invSummary(inv1)}; `
        + `resize ${rz.axis} pointer ${rz.pointerDelta}px: orders ${rz.before.a.toFixed(1)}→${rz.after.a.toFixed(1)} (${dA.toFixed(1)}), billing ${rz.before.b.toFixed(1)}→${rz.after.b.toFixed(1)} (${dB.toFixed(1)}), capture ${rz.gotPointerCapture}/${rz.lostPointerCapture}, userSelect ${JSON.stringify(rz.bodyUserSelectDuring)}→${JSON.stringify(rz.bodyUserSelectAfter)}; `
        + `calls [${calls.join(',')}]; 에러 카드 ${JSON.stringify(cards)}; 불변식(리사이즈 뒤) ${invSummary(inv2)}. 누적: ${fmtDeltas(deltas(before, after))}`,
      verdict: good ? 'as-ideal' : 'deviates', invariants: inv2, since: t0, allow: ALLOW,
    });
  });

  test(`R16-dead-drag-run${runNo}`, async ({ lab, page }, info) => {
    await openDead(lab, page);
    const { snap: before } = await shot(page, info, '01-before');
    const errsBefore = lab.consoleErrors().length;
    const t0 = Date.now();
    const o = await begin(page, 'orders');
    // 브리프 좌표 (billing, right, 0)은 도달 불가: billing 오른쪽 가장자리가 루트 split 가장자리와 겹쳐 바깥 split(15%)이 먼저 잡는다
    // (dropTarget 우선순위, src/components/... getDropTarget). 도달 가능한 right 깊이는 3·4뿐 → 3(루트 split 끝)으로 대체. REPORT 10절
    await o.teleport(await dropPoint(page, 'billing', 'right', 3));
    const hover = await domTree(page);
    await shot(page, info, '02-mid');
    const rel = await o.release();
    const { snap: after } = await shot(page, info, '03-after');
    const inv = await checkInvariants(page, { allow: ALLOW });
    const committed = treeNotation(after.tree as Parameters<typeof treeNotation>[0]);
    const cards = await errorCards(page);
    const ev = (await eventsSince(page, t0)).filter((e) => e.type === 'dragstart');
    const newErrs = lab.consoleErrors().slice(errsBefore).map((c) => c.text);
    const ok = committed === 'H[nav,V[H[board,billing],H[telemetry,telemetry-x]],orders]' && cards.length === 1 && cards[0].panel === 'orders' && newErrs.length === 0 && inv.every((r) => r.pass);
    await observe(page, info, {
      scenario: 'R16', caseName: 'R16-dead-drag', runNo, expected: EXP.dead, predicted: PRED.dead,
      observed: `dragstart ${ev.map((e) => `${e.phase}/${e.target.testid}/trusted=${e.isTrusted}`).join(' ')}; hover ${hover}; under=${rel.underCursorAtDrop}; 커밋 ${committed}; 에러 카드 ${JSON.stringify(cards)}; 새 콘솔 에러 ${newErrs.length}; ${invSummary(inv)}. 누적: ${fmtDeltas(deltas(before, after))}`,
      verdict: ok ? 'as-ideal' : 'deviates', invariants: inv, since: t0, allow: ALLOW,
    });
  });
});
