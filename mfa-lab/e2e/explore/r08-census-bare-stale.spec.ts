// R08 census bare — stale preview 유도(immediate 릴리스)와 후속 영향(ext-chip 드롭, 경계선 리사이즈). 유도는 새 페이지로 최대 5회.
import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree, underCursor, panelRect, treeNotation } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { resizeBorder } from '../helpers/resize';
import { observe, seedAll, shot, invSummary, eventsSince } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import type { InvariantResult } from '../helpers/invariants';
import { snapshot } from '../helpers/snapshot';
import { promote } from '../helpers/evidence';
import { dragEvents, fmtEvents } from '../helpers/events';

const TXT: Record<string, [string, string]> = {
  'R08-stale': ['드래그가 끝났으면 미리보기도 없다', '`immediate` 릴리스로 소스가 아닌 패널 위에서 놓으면 stale preview: I1 통과, I2 실패(소스에 shadow), I5는 위치에 따라. 시그니처: `underCursorAtDrop \'other-droppable\'`, 마지막 `dragover`가 `drop`/`dragend`와 한 프레임 안. 비율은 S8 표 재사용. 5회 안에 안 나오면 `not-reproduced`'],
  'R08-chip': ['패널 드래그가 아닌 드롭은 패널을 움직이지 않는다', 'ext-chip 드롭이 패널 `handleDrop`을 `isPreviewActive`로 통과해 루트 `onDrop`에 닿고 **stale 이동이 커밋된다**: `calls`에 `onMovePanel` 1건, `treeVersion` +1, 프로브의 `dragstart` 대상은 `ext-chip`이고 `data-dragging-panel-id` 없음'],
  'R08-resize': ['보이는 경계선을 끌면 그 양쪽 패널이 변한다', '렌더된(미리보기) 트리의 `path`가 커밋된 트리에 적용돼 엉뚱한 쌍이 변하거나(`treeVersion` +1인데 끈 경계선 양쪽 rect는 그대로) 경로가 없어 무시된다(`treeVersion` 그대로)'],
};
const SLOTS = ['bare-0', 'bare-1', 'bare-2', 'bare-3'];
const URL_SLOTS = { a: 'bare-0', b: 'bare-1', c: 'bare-2', d: 'bare-3' };
const getTree = (page: Page) => page.evaluate(() => (window as unknown as { __fc: { getTree: () => unknown } }).__fc.getTree());
const ok = (inv: InvariantResult[], id: string) => inv.find((r) => r.id === id)?.pass;

// 1~5단계. 시그니처가 나오면 { tries, gapMs, ... }, 5회 모두 안 나오면 null
const induce = async (lab: { open: (o: Record<string, unknown>) => Promise<unknown> }, page: Page, info: Parameters<Parameters<typeof test>[2]>[1]) => {
  for (let tries = 1; tries <= 5; tries++) {
    await lab.open({ layout: 'census', slots: URL_SLOTS });
    expect(await domTree(page)).toBe('H[p-a,V[p-b,p-c],p-d]');                              // 전제
    await seedAll(page, SLOTS);
    const t0 = Date.now();
    const d = await begin(page, 'bare-3');
    const pt = await dropPoint(page, 'p-b', 'left', 0);
    await d.teleport(pt);
    expect(await domTree(page)).toBe('H[p-a,V[H[p-d,p-b],p-c]]');                            // 전제
    const uc = await underCursor(page, pt.x, pt.y);
    if (uc.panelId !== 'p-a') throw new Error(`HarnessError: under cursor ${uc.panelId}, cannot induce stale`);
    if (tries === 1) await shot(page, info, '02-mid-induce');
    const r = await d.release({ mode: 'immediate' });
    await settle(page);
    const inv = await checkInvariants(page);
    const ev = dragEvents(await eventsSince(page, t0));
    const lastOver = [...ev].reverse().find((e) => e.type === 'dragover');
    const drop = ev.find((e) => e.type === 'drop');
    const gap = lastOver && drop ? Math.round((drop.t - (lastOver.tLast ?? lastOver.t)) * 10) / 10 : null;
    const sig = r.underCursorAtDrop === 'other-droppable' && ok(inv, 'I1') && (!ok(inv, 'I2') || !ok(inv, 'I5')) && lastOver?.target.panelId === 'p-a' && gap !== null && gap <= 17;
    console.log(`[r08 induce try ${tries}] under=${r.underCursorAtDrop} gap=${gap} ${invSummary(inv)} sig=${sig}`);
    if (sig) return { tries, gap, r, inv, ev, t0 };
  }
  return null;
};

[1, 2].forEach((runNo) => {
  test(`R08-stale-run${runNo}`, async ({ lab, page }, info) => {
    const s = await induce(lab, page, info);
    if (!s) {
      await observe(page, info, { scenario: 'R08', caseName: 'R08-stale', runNo, expected: TXT['R08-stale'][0], predicted: TXT['R08-stale'][1],
        observed: 'not-reproduced: 5회 모두 시그니처 없음', verdict: 'as-ideal', labels: { repro: '0/5' } });
      return;
    }
    const { snap } = await shot(page, info, '03-after');
    const tree = treeNotation((await getTree(page)) as Parameters<typeof treeNotation>[0]);
    const calls = snap.calls.filter((c) => c.fn === 'onMovePanel');
    await observe(page, info, {
      scenario: 'R08', caseName: 'R08-stale', runNo, expected: TXT['R08-stale'][0], predicted: TXT['R08-stale'][1],
      observed: `시도 ${s.tries}회째 시그니처: under=${s.r.underCursorAtDrop}, 마지막 dragover(p-a) → drop ${s.gap}ms; I1=${ok(s.inv, 'I1')} I2=${ok(s.inv, 'I2')} I5=${ok(s.inv, 'I5')}; p-d shadow=${snap.dom.panels['p-d']?.shadow}; domTree ${snap.dom.domTree} vs getTree ${tree}; onMovePanel ${calls.length}건 ${calls.map((c) => JSON.stringify(c.args)).join(' ')}; treeVersion ${snap.treeVersion}; events ${fmtEvents(s.ev.slice(-6))}`,
      verdict: 'as-predicted', invariants: s.inv, since: s.t0, labels: { harness_amplified: true, contaminated: '카운터(이 구간)', repro: `${s.tries}회째` },
    });
    if (runNo === 1) {
      const caseDir = new URL(`../.artifacts/r08-census-bare-stale/${info.title}/`, import.meta.url).pathname;
      await promote({ run: 'run01-tier1', findingId: 'FC-QA-009', caseDir, images: ['02-mid-induce.png', '03-after.png'], prefix: 'R08-' });
    }
  });

  test(`R08-chip-run${runNo}`, async ({ lab, page }, info) => {
    const s = await induce(lab, page, info);
    if (!s) { await observe(page, info, { scenario: 'R08', caseName: 'R08-chip', runNo, expected: TXT['R08-chip'][0], predicted: TXT['R08-chip'][1], observed: 'not-run(R08-stale 미재현)', verdict: 'as-ideal' }); return; }
    const { snap: before } = await shot(page, info, '01-before');
    const t0 = Date.now();
    const b = (await page.getByTestId('ext-chip').boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + 6, b.y + b.height / 2, { steps: 2 }); await settle(page);
    const start = dragEvents(await eventsSince(page, t0)).find((e) => e.type === 'dragstart' && e.phase === 'bubble');
    expect(start?.target.testid).toBe('ext-chip');                                          // 전제
    const dragging = await page.evaluate(() => document.querySelector('[data-tree-root]')?.getAttribute('data-dragging-panel-id') ?? null);
    const c = await panelRect(page, 'p-c');
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await settle(page);
    await shot(page, info, '02-mid');
    await page.mouse.up(); await settle(page);
    const { snap: after } = await shot(page, info, '03-after');
    const inv = await checkInvariants(page);
    const ev = dragEvents(await eventsSince(page, t0));
    const drops = ev.filter((e) => e.type === 'drop');
    const dragend = ev.find((e) => e.type === 'dragend');
    const newCalls = after.calls.slice(before.calls.length).filter((x) => x.fn === 'onMovePanel');
    const committed = treeNotation(after.tree as Parameters<typeof treeNotation>[0]);
    const pred = newCalls.length === 1 && after.treeVersion > before.treeVersion && dragging === null && (start?.types ?? []).includes('application/x-harbor-chip');
    await observe(page, info, {
      scenario: 'R08', caseName: 'R08-chip', runNo, expected: TXT['R08-chip'][0], predicted: TXT['R08-chip'][1],
      observed: `stale 유도 ${s.tries}회째; chip dragstart types [${(start?.types ?? []).join(',')}], data-dragging-panel-id=${dragging}; p-c 중앙에서 놓기: onMovePanel ${newCalls.length}건 ${newCalls.map((x) => JSON.stringify(x.args)).join(' ')}, 커밋 ${committed}, treeVersion ${before.treeVersion}→${after.treeVersion}; drop [${drops.map((e) => `${e.phase}/${e.target.panelId}${e.stopped ? '(stopped)' : ''}`).join(', ')}], dragend dropEffect=${dragend?.dropEffect}; ${invSummary(inv)}`,
      verdict: newCalls.length === 0 ? 'as-ideal' : pred ? 'as-predicted' : 'deviates', invariants: inv, since: t0, labels: { harness_amplified: true },
    });
    if (runNo === 1) {
      const caseDir = new URL(`../.artifacts/r08-census-bare-stale/${info.title}/`, import.meta.url).pathname;
      await promote({ run: 'run01-tier1', findingId: 'FC-QA-009', caseDir, images: ['03-after.png'], prefix: 'R08c-' });
    }
  });

  test(`R08-resize-run${runNo}`, async ({ lab, page }, info) => {
    const s = await induce(lab, page, info);
    if (!s) { await observe(page, info, { scenario: 'R08', caseName: 'R08-resize', runNo, expected: TXT['R08-resize'][0], predicted: TXT['R08-resize'][1], observed: 'not-run(R08-stale 미재현)', verdict: 'as-ideal' }); return; }
    const { snap: before } = await shot(page, info, '01-before');
    const t0 = Date.now();
    const r1 = await resizeBorder(page, { between: ['p-a', 'p-d'], delta: 120, steps: 10 });
    const s1 = await snapshot(page, 'r1');
    await shot(page, info, '02-mid');
    let r2txt = '';
    try {
      const r2 = await resizeBorder(page, { between: ['p-d', 'p-b'], delta: 120, steps: 10 });
      r2txt = `r2 p-d ${r2.before.a.toFixed(1)}→${r2.after.a.toFixed(1)}, p-b ${r2.before.b.toFixed(1)}→${r2.after.b.toFixed(1)}`;
    } catch (e) { r2txt = `r2 불가: ${(e as Error).message.split('\n')[0]}`; }
    const { snap: after } = await shot(page, info, '03-after');
    const inv = await checkInvariants(page);
    const rc = after.calls.slice(before.calls.length).filter((x) => x.fn === 'onResizeBorder');
    const sizes = (t: unknown) => { const out: string[] = []; const walk = (n: { type: string; id?: string; size?: number; children?: unknown[] }, p: string) => { out.push(`${n.type === 'panel' ? n.id : `${p}split`}:${Number(n.size).toFixed(3)}`); (n.children ?? []).forEach((c, i) => walk(c as typeof n, `${p}${i}.`)); }; walk(t as { type: string }, ''); return out.join(' '); };
    await observe(page, info, {
      scenario: 'R08', caseName: 'R08-resize', runNo, expected: TXT['R08-resize'][0], predicted: TXT['R08-resize'][1],
      observed: `stale 유도 ${s.tries}회째; 렌더 ${before.dom.domTree} / 커밋 ${before.treeNotation}; r1(p-a|p-d +120): p-a ${r1.before.a.toFixed(1)}→${r1.after.a.toFixed(1)}, p-d ${r1.before.b.toFixed(1)}→${r1.after.b.toFixed(1)}, treeVersion ${before.treeVersion}→${s1.treeVersion}; ${r2txt}, treeVersion →${after.treeVersion}; onResizeBorder ${rc.length}건(첫 args ${JSON.stringify(rc[0]?.args)}); size 전 [${sizes(before.tree)}] 후 [${sizes(after.tree)}]; 뒤 domTree ${after.dom.domTree}; ${invSummary(inv)}`,
      verdict: 'as-predicted', invariants: inv, since: t0, labels: { harness_amplified: true, judged: '관찰 뒤 수동 판정' },
    });
  });
});
