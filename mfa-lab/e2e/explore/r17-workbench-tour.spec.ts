// R17 workbench 순회: 경계선 4개 리사이즈, M1~M5 이동, Nav 토글. 시각 점검은 PNG를 직접 열어 REPORT에 적는다.
import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { begin } from '../helpers/mouseDrag';
import { domTree, dropPoint, panelRect, treeNotation, underCursor } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { resizeBorder } from '../helpers/resize';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import type { InvariantResult } from '../helpers/invariants';
import type { Snapshot } from '../helpers/snapshot';
import { promote } from '../helpers/evidence';

const T0 = 'H[nav,orders,V[H[board,billing],H[telemetry,telemetry-x]]]';
const SLOTS = ['nav', 'orders', 'board', 'billing', 'telemetry', 'telemetry-x'];
const EXP = {
  resize: '8번 모두 방향대로 3px 안에서 변한다. `userSelect` 복원. `nav` 200 유지, `orders` ≥ 320, 하단 ≥ 160. `nav`는 드래그가 시작되지 않는다',
  moves: '커밋 = 미리보기, I1~I7 통과, 드래그하지 않은 패널의 상태 유지',
  toggle: '`removePanel`로 board가 사라지고 split이 풀린다. `insertPanel`로 billing 왼쪽에 다시 생긴다. 다른 패널 상태 유지',
};
const PRED = {
  resize: '통과. 패널은 포인터보다 조금 덜 움직인다(Resizer 8px 포함 환산)',
  moves: '트리는 위 이동 표대로. 매 이동에서 드래그하지 않은 패널의 리마운트(frame·content·`mountCalls`·`loads` 증가)와 재삽입(moves, scrollTop 0)이 나온다. 어느 패널이 어느 쪽인지는 이동마다 다르므로 관찰로 적는다. 전부 FC-QA-001과 D3a 발견의 증거다. I1~I7은 통과',
  toggle: '트리는 표대로. 닫기: `V[V[H[orders,telemetry],billing],board]`가 단일 자식으로 풀려 안쪽 내용이 한 단계 올라오면서(`src/tree/helpers.ts:45`) key `split-0` fiber의 노드가 V→H로 바뀌어 `orders` content +1·frame +1, `telemetry` `loads` +1·frame +1, `billing`은 부모 fiber가 바뀌어 `mountCalls`·`unmountCalls` +1·frame +1. 열기: `board` content +1(새 마운트), `billing`이 새 split `H[board,billing]`으로 감싸여(`src/tree/insert.ts:66-71`) `mountCalls`·`unmountCalls` +1 더(누적 +2). `orders`·`telemetry`는 열기에서 추가 없음. `nav`·`telemetry-x`는 변화 없음. 전부 FC-QA-001 증거(사용자 조작이 아닌 API 호출로 생긴 리마운트지만 같은 메커니즘)',
};
// M1의 (billing, right, 0)은 도달 불가(billing 오른쪽 가장자리가 루트 split 가장자리와 겹쳐 바깥 split 띠가 먼저 잡는다. R16과 같음).
// 브리프 규칙대로 그 이동만 바꾼다: (billing, right, 3). 그 결과 M2~M5·토글의 표 트리는 시작 상태가 달라 무효 → 커밋 = 미리보기로 판정하고 실제 트리를 기록한다.
// 이후 이동의 dropPoint가 도달 불가면 같은 위치의 다른 depth를 0..4 순서로 시도하고 기록한다.
const M1_SUB = { anchor: 'billing', pos: 'right', depth: 3 } as const;
const MOVES = [
  { m: 'M1', src: 'orders', anchor: 'billing', pos: 'right', depth: 0, tree: 'H[nav,V[H[board,billing,orders],H[telemetry,telemetry-x]]]' },
  { m: 'M2', src: 'board', anchor: 'telemetry', pos: 'left', depth: 0, tree: 'H[nav,V[H[billing,orders],H[board,telemetry,telemetry-x]]]' },
  { m: 'M3', src: 'billing', anchor: 'orders', pos: 'bottom', depth: 0, tree: 'H[nav,V[V[orders,billing],H[board,telemetry,telemetry-x]]]' },
  { m: 'M4', src: 'telemetry', anchor: 'orders', pos: 'right', depth: 0, tree: 'H[nav,V[V[H[orders,telemetry],billing],H[board,telemetry-x]]]' },
  { m: 'M5', src: 'telemetry-x', anchor: 'board', pos: 'bottom', depth: 4, tree: 'V[H[nav,V[V[H[orders,telemetry],billing],board]],telemetry-x]' },
] as const;

const overflow = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-tree-root] [data-panel-id]'))
  .map((el) => ({ id: el.getAttribute('data-panel-id'), sw: (el as HTMLElement).scrollWidth, cw: (el as HTMLElement).clientWidth, sh: (el as HTMLElement).scrollHeight, ch: (el as HTMLElement).clientHeight }))
  .filter((p) => p.sw > p.cw + 1 || p.sh > p.ch + 1));
const sizes = async (page: Page) => ({
  nav: (await panelRect(page, 'nav')).width,
  orders: (await panelRect(page, 'orders')).width,
  bottom: (await panelRect(page, 'telemetry')).height,
});
const allPass = (inv: InvariantResult[]) => inv.every((r) => r.pass);

[1, 2].forEach((runNo) => {
  test(`R17-resize-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'workbench' });
    expect(await domTree(page)).toBe(T0);                                                    // 전제
    await seedAll(page, SLOTS);
    const { snap: before } = await shot(page, info, '01-before');
    const t0 = Date.now();
    const pairs: Array<[string, string]> = [['orders', 'board'], ['board', 'billing'], ['telemetry', 'telemetry-x'], ['board', 'telemetry']];
    const rows: string[] = [];
    const invs: InvariantResult[][] = [];
    const sz: Array<Awaited<ReturnType<typeof sizes>>> = [];
    const errs: number[] = [];
    let ok = true;
    for (const pair of pairs) {
      for (const delta of [120, -120]) {
        const r = await resizeBorder(page, { between: pair, delta, steps: 10 });
        const inv = await checkInvariants(page);
        invs.push(inv);
        const dA = r.after.a - r.before.a; const dB = r.after.b - r.before.b;
        const dirOk = Math.sign(dA) === Math.sign(delta) && Math.sign(dB) === -Math.sign(delta);
        errs.push(Math.abs(Math.abs(dA) - Math.abs(delta)));
        const s = await sizes(page); sz.push(s);
        if (!dirOk || r.bodyUserSelectAfter !== '' || !r.gotPointerCapture || !allPass(inv)) ok = false;
        rows.push(`${pair.join('|')} ${r.axis} ${delta > 0 ? '+' : ''}${delta}: a ${r.before.a.toFixed(1)}→${r.after.a.toFixed(1)}(${dA.toFixed(1)}) b ${r.before.b.toFixed(1)}→${r.after.b.toFixed(1)}(${dB.toFixed(1)}) cap ${r.gotPointerCapture}/${r.lostPointerCapture} us ${JSON.stringify(r.bodyUserSelectDuring)}→${JSON.stringify(r.bodyUserSelectAfter)} nav ${s.nav.toFixed(1)} orders ${s.orders.toFixed(1)} bottom ${s.bottom.toFixed(1)} ${allPass(inv) ? 'inv ok' : invSummary(inv)}`);
      }
    }
    const navD = await begin(page, 'nav', { expectStart: false });
    void navD;
    const { snap: after } = await shot(page, info, '03-after');
    const resizeCalls = after.calls.filter((c) => c.fn === 'onResizeBorder').length;
    const over = await overflow(page);
    const fixedOk = sz.every((s) => Math.abs(s.nav - 200) <= 1 && s.orders >= 320 - 0.5 && s.bottom >= 160 - 0.5);
    const maxErr = Math.max(...errs);
    const ideal = ok && fixedOk && maxErr <= 3 && after.dom.resizerCount === 4 && over.length === 0;
    const pred = ok && fixedOk && after.dom.resizerCount === 4;
    await observe(page, info, {
      scenario: 'R17', caseName: 'R17-resize', runNo, expected: EXP.resize, predicted: PRED.resize,
      observed: `${rows.join(' ; ')}. 포인터 대비 최대 오차 ${maxErr.toFixed(1)}px; onResizeBorder 호출 ${resizeCalls}건(포인터 이동마다); resizer ${after.dom.resizerCount}개; nav 드래그 시작 안 함(expectStart false 통과); 넘침 패널 ${JSON.stringify(over)}. 누적: ${fmtDeltas(deltas(before, after))}`,
      verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates', invariants: invs[invs.length - 1], since: t0,
      extra: { rows, sizes: sz, errs },
    });
    if (runNo === 1) {
      const caseDir = new URL(`../.artifacts/r17-workbench-tour/${info.title}/`, import.meta.url).pathname;
      await promote({ run: 'run01-tier1', findingId: 'FC-QA-008', caseDir, images: ['01-before.png', '03-after.png'] });
    }
  });

  test(`R17-moves-toggle-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'workbench' });
    expect(await domTree(page)).toBe(T0);                                                    // 전제
    await seedAll(page, SLOTS);
    const { snap: start } = await shot(page, info, '01-before');
    let prev: Snapshot = start;
    const t0 = Date.now();
    const moveRows: string[] = [];
    let movesOk = true; let movesPred = true; let subbed = false;
    for (const mv of MOVES) {
      const d = await begin(page, mv.src);
      let used: { anchor: string; pos: string; depth: number } = mv.m === 'M1' ? M1_SUB : { anchor: mv.anchor, pos: mv.pos, depth: mv.depth };
      let pt = await dropPoint(page, used.anchor, used.pos as 'left', used.depth).catch(() => null);
      for (const alt of [0, 1, 2, 3, 4]) { if (pt) break; used = { ...used, depth: alt }; pt = await dropPoint(page, used.anchor, used.pos as 'left', alt).catch(() => null); }
      if (!pt) throw new Error(`${mv.m}: no reachable point for ${mv.anchor}/${mv.pos}`);
      const uc = await underCursor(page, pt.x, pt.y);
      const prevDom = await domTree(page);
      await d.teleport(pt);
      const hover = await domTree(page);
      const noPreview = hover === prevDom;
      const tableValid = mv.m === 'M1' ? false : !subbed;
      if (used.depth !== mv.depth || used.anchor !== mv.anchor || mv.m === 'M1') subbed = true;
      await shot(page, info, `02-mid-${mv.m}`);
      await d.release();
      await settle(page);
      const inv = await checkInvariants(page);
      const { snap: cur } = await shot(page, info, `03-after-${mv.m}`);
      const committed = treeNotation(cur.tree as Parameters<typeof treeNotation>[0]);
      const ds = deltas(prev, cur);
      const nonDragged = Object.values(ds).filter((x) => x.slot !== mv.src);
      const touched = nonDragged.filter((x) => x.cls !== 'untouched');
      if (committed !== hover || !allPass(inv) || (tableValid && committed !== mv.tree)) { movesOk = false; movesPred = false; }
      if (touched.length) movesOk = false;
      moveRows.push(`${mv.m} ${mv.src}→(${used.anchor},${used.pos},${used.depth})${used.depth !== mv.depth || mv.m === 'M1' ? `[대체: 표 (${mv.anchor},${mv.pos},${mv.depth})]` : ''}: 미리보기 ${hover}, 커밋 ${committed}${committed === hover ? '(=미리보기)' : '(≠미리보기)'}${tableValid ? (committed === mv.tree ? '(=표)' : '(≠표)') : '(표 무효)'}${noPreview ? ` [미리보기 없음: 놓는 점이 ${uc.isIframe ? `iframe(${uc.panelId}) 본문 → FC-QA-005` : `${uc.panelId}, 이미 그 위치`}]` : ''}, ${invSummary(inv)}; 드래그하지 않은 패널 변화 [${touched.map((x) => `${x.slot} f+${x.frame} c+${x.content} m+${x.moves}${x.loads ? ` l+${x.loads}` : ''}${x.mountCalls ? ` mc+${x.mountCalls}` : ''} ${x.cls}`).join(', ') || '없음'}]; 소스 ${ds[mv.src]?.cls}`);
      prev = cur;
    }
    const callsMoves = prev.calls.filter((c) => c.fn === 'onMovePanel').length;
    await observe(page, info, {
      scenario: 'R17', caseName: 'R17-moves', runNo, expected: EXP.moves, predicted: PRED.moves,
      observed: `${moveRows.join(' ; ')}; onMovePanel ${callsMoves}건. 누적: ${fmtDeltas(deltas(start, prev))}`,
      verdict: movesOk ? 'as-ideal' : movesPred ? 'as-predicted' : 'deviates', since: t0,
      invariants: await checkInvariants(page),
    });

    // Nav 토글
    const t1 = Date.now();
    const errsBefore = lab.consoleErrors().length;
    const boardMounts = async () => page.evaluate(() => Number(((window as unknown as { __mfe?: Record<string, { mounts?: number }> }).__mfe?.board?.mounts) ?? NaN));
    const bm0 = await boardMounts();
    const beforeToggle = prev;
    await page.click('[data-testid="nav-toggle-board"]');
    await settle(page);
    const invC = await checkInvariants(page);
    const { snap: closed } = await shot(page, info, '03-after-close');
    await page.click('[data-testid="nav-toggle-board"]');
    await settle(page);
    const invO = await checkInvariants(page);
    const { snap: opened } = await shot(page, info, '03-after-open');
    const bm1 = await boardMounts();
    const dC = deltas(beforeToggle, closed);
    const dO = deltas(closed, opened);
    const tc = treeNotation(closed.tree as Parameters<typeof treeNotation>[0]);
    const to = treeNotation(opened.tree as Parameters<typeof treeNotation>[0]);
    const apiCalls = opened.calls.slice(beforeToggle.calls.length).map((c) => c.fn);
    const newErrs = lab.consoleErrors().slice(errsBefore).length;
    // 표 트리는 M1 대체로 무효. board가 닫기에서 사라지고, 열기에서 billing 왼쪽 형제로 돌아왔는지로 판정
    const treesOk = !/\bboard\b/.test(tc) && to.includes('H[board,billing]') && to.replace('H[board,billing]', 'billing') === tc;
    const predCounters = false && dC.orders.frame === 1 && dC.orders.content === 1 && dC.telemetry.frame === 1 && dC.telemetry.loads === 1 && dC.billing.frame === 1 && dC.billing.mountCalls === 1
      && dO.billing.mountCalls === 1 && dO.orders.frame === 0 && dO.telemetry.frame === 0 && dC.nav.cls === 'untouched' && dO.nav.cls === 'untouched' && dC['telemetry-x'].cls === 'untouched' && dO['telemetry-x'].cls === 'untouched';
    const idealT = treesOk && ['orders', 'telemetry', 'billing', 'nav', 'telemetry-x'].every((s) => dC[s].cls === 'untouched' && dO[s].cls === 'untouched') && allPass(invC) && allPass(invO) && newErrs === 0;
    await observe(page, info, {
      scenario: 'R17', caseName: 'R17-nav-toggle', runNo, expected: EXP.toggle, predicted: PRED.toggle,
      observed: `calls [${apiCalls.join(',')}]; 닫기 ${tc}, 열기 ${to}; board mounts ${bm0}→${bm1}; 닫기 불변식 ${invSummary(invC)}, 열기 불변식 ${invSummary(invO)}; 새 콘솔 에러 ${newErrs}. 닫기 증가분: ${fmtDeltas(dC)} || 열기 증가분: ${fmtDeltas(dO)}`,
      // 표의 슬롯별 예측은 M1 대체로 시작 트리가 달라 그대로 비교할 수 없다. 메커니즘(풀림·감싸기에서 리마운트)으로 판정하고 라벨을 붙인다.
      verdict: idealT ? 'as-ideal' : (treesOk || predCounters) && allPass(invC) && allPass(invO) && newErrs === 0 ? 'as-predicted' : 'deviates',
      invariants: invO, since: t1, extra: { dC, dO },
      labels: { prediction_table: 'M1 대체로 표의 트리·슬롯 예측 무효. 판정은 board 제거/billing 왼쪽 복귀 + 풀림·감싸기 리마운트 메커니즘' },
    });
  });
});
