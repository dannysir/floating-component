// R19 직렬화(persist=1): 저장 → 새로고침 → 복원, 미등록 키 → 빈 패널, 복원 뒤 DnD. control 패널만.
import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { begin } from '../helpers/mouseDrag';
import { domTree, dropPoint, treeNotation } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { observe, seedAll, shot, invSummary } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';

const TXT: Record<string, [string, string]> = {
  'R19-persist-roundtrip': ['저장 → 새로고침 → 복원 시 레이아웃과 컴포넌트가 복구된다', '통과. `JSON.parse(localStorage)`가 T1과 같고 복원된 트리가 같은 슬롯을 그린다. 내용 상태는 초기화(store는 직렬화되지 않는다. 결함 아님)'],
  'R19-persist-unregistered': ['미등록 키의 패널은 빈 상태로 렌더되고(dev 모드에서만 경고) 앱은 살아 있다', '통과. `p-b` 요소 존재, 내용 없음, 콘솔 조용(prod)'],
  'R19-persist-dnd': ['복원 뒤·빈 패널이 있어도 DnD가 정상 동작한다', '통과. 빈 패널도 핸들러가 같다'],
};
type Tree = { type: string; id?: string; componentKey?: string; children?: Tree[] } & Record<string, unknown>;
const getTree = (page: Page) => page.evaluate(() => (window as unknown as { __fc: { getTree: () => unknown } }).__fc.getTree()) as Promise<Tree>;
const ls = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
const waitReady = (page: Page) => page.waitForFunction(() => (window as unknown as { __fc?: { ready?: boolean } }).__fc?.ready === true, null, { timeout: 15_000 });
const slotStates = (page: Page) => page.evaluate(() => Object.fromEntries(Object.entries((window as unknown as { __fc: { frames: Record<string, { state?: string }> } }).__fc.frames).map(([k, v]) => [k, v.state])));

[1, 2].forEach((runNo) => {
  test(`R19-persist-roundtrip-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'census', flags: { persist: '1' } });
    await page.evaluate(() => localStorage.clear());
    await lab.open({ layout: 'census', flags: { persist: '1' } });
    await seedAll(page, ['control-a', 'control-b', 'control-c', 'control-d']);
    await shot(page, info, '01-before');
    const t0 = Date.now();
    const d = await begin(page, 'control-d');
    await d.teleport(await dropPoint(page, 'p-a', 'left', 1));
    await d.release(); await settle(page);
    const T1 = await getTree(page);
    const saved = await ls(page, 'harbor.layout.census.v1');
    const savedEq = saved !== null && JSON.stringify(JSON.parse(saved)) === JSON.stringify(T1);
    const errsBefore = lab.consoleErrors().length;
    await page.reload(); await waitReady(page); await settle(page);
    const T2 = await getTree(page);
    const restoredEq = JSON.stringify(T2) === JSON.stringify(T1);
    const dom = await domTree(page);
    const states = await slotStates(page);
    const inv = await checkInvariants(page);
    const { snap } = await shot(page, info, '03-after');
    const content = Object.fromEntries(Object.entries(snap.content).map(([k, v]) => [k, `${v.input}/${v.counter}/${v.scrollTop}`]));
    const newErrs = lab.consoleErrors().slice(errsBefore).length;
    const ok = savedEq && restoredEq && dom === treeNotation(T1 as Parameters<typeof treeNotation>[0]) && Object.values(states).every((s) => s === 'ready') && newErrs === 0 && inv.every((r) => r.pass);
    await observe(page, info, {
      scenario: 'R19', caseName: 'R19-persist-roundtrip', runNo, expected: TXT['R19-persist-roundtrip'][0], predicted: TXT['R19-persist-roundtrip'][1],
      observed: `T1 ${treeNotation(T1 as Parameters<typeof treeNotation>[0])}; 저장 JSON = T1: ${savedEq}; reload 뒤 getTree = T1(깊은 비교): ${restoredEq}; domTree ${dom}; 슬롯 ${JSON.stringify(states)}; 내용 ${JSON.stringify(content)}; 새 콘솔 에러 ${newErrs}; ${invSummary(inv)}`,
      verdict: ok ? 'as-ideal' : 'deviates', invariants: inv, since: t0,
    });

    // R19-persist-dnd (2): 복원 뒤 페이지에서 control-b → p-c 아래
    const t1 = Date.now();
    const b = await begin(page, 'control-b');
    await b.teleport(await dropPoint(page, 'p-c', 'bottom', 0));
    const hover = await domTree(page);
    await b.release(); await settle(page);
    const inv2 = await checkInvariants(page);
    const T3 = await getTree(page);
    const saved3 = await ls(page, 'harbor.layout.census.v1');
    const calls = (await page.evaluate(() => (window as unknown as { __fc: { calls: Array<{ fn: string; args: unknown[] }> } }).__fc.calls)).filter((c) => c.fn === 'onMovePanel');
    const ok2 = hover === treeNotation(T3 as Parameters<typeof treeNotation>[0]) && saved3 !== null && JSON.stringify(JSON.parse(saved3)) === JSON.stringify(T3) && inv2.every((r) => r.pass);
    await observe(page, info, {
      scenario: 'R19', caseName: 'R19-persist-dnd-restored', runNo, expected: TXT['R19-persist-dnd'][0], predicted: TXT['R19-persist-dnd'][1],
      observed: `복원 뒤 control-b → (p-c,bottom,0): hover ${hover}, 커밋 ${treeNotation(T3 as Parameters<typeof treeNotation>[0])}, onMovePanel(reload 뒤) ${calls.length}건 ${calls.map((c) => JSON.stringify(c.args)).join(' ')}; localStorage 갱신 = 커밋 트리: ${saved3 !== null && JSON.stringify(JSON.parse(saved3)) === JSON.stringify(T3)}; ${invSummary(inv2)}`,
      verdict: ok2 ? 'as-ideal' : 'deviates', invariants: inv2, since: t1,
    });
  });

  test(`R19-persist-unregistered-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'pair' });
    const base = await getTree(page);
    const tree = { ...base, children: (base.children ?? []).map((c) => (c.id === 'p-b' ? { ...c, componentKey: 'nope-slot' } : c)) };
    await page.evaluate((t) => { localStorage.clear(); localStorage.setItem('harbor.layout.pair.v1', JSON.stringify(t)); }, tree);
    const errsBefore = lab.consoleErrors().length;
    await lab.open({ layout: 'pair', flags: { persist: '1' }, expectState: { 'control-a': 'ready' } });
    await settle(page);
    const t0 = Date.now();
    await shot(page, info, '01-before');
    const pb = await page.evaluate(() => { const el = document.querySelector('[data-tree-root] [data-panel-id="p-b"]'); return el ? { exists: true, children: el.children.length, html: el.innerHTML.length, text: (el.textContent ?? '').trim().slice(0, 40) } : { exists: false }; });
    const shellError = await page.locator('[data-testid="shell-error"]').count();
    const errs = lab.consoleErrors().slice(errsBefore).map((c) => c.text);
    const tr = await getTree(page);
    const inv = await checkInvariants(page, { allow: { I7: ['nope-slot'] } });
    const ok = pb.exists && shellError === 0 && errs.length === 0 && JSON.stringify(tr).includes('nope-slot') && inv.every((r) => r.pass);
    await observe(page, info, {
      scenario: 'R19', caseName: 'R19-persist-unregistered', runNo, expected: TXT['R19-persist-unregistered'][0], predicted: TXT['R19-persist-unregistered'][1],
      observed: `p-b ${JSON.stringify(pb)}; shell-error ${shellError}; 콘솔 에러 ${errs.length} ${JSON.stringify(errs.slice(0, 2))}; 트리 ${treeNotation(tr as Parameters<typeof treeNotation>[0])}(nope-slot 유지 ${JSON.stringify(tr).includes('nope-slot')}); ${invSummary(inv)}`,
      verdict: ok ? 'as-ideal' : 'deviates', invariants: inv, since: t0, allow: { I7: ['nope-slot'] },
    });

    // R19-persist-dnd (1): 빈 패널을 앵커로
    const t1 = Date.now();
    const a = await begin(page, 'control-a');
    await a.teleport(await dropPoint(page, 'p-b', 'right', 0));
    const hover = await domTree(page);
    expect(hover).toBe('H[p-b,p-a]');                                                      // 전제
    await shot(page, info, '02-mid');
    await a.release(); await settle(page);
    const inv2 = await checkInvariants(page, { allow: { I7: ['nope-slot'] } });
    const T = await getTree(page);
    const saved = await page.evaluate(() => localStorage.getItem('harbor.layout.pair.v1'));
    const ok2 = treeNotation(T as Parameters<typeof treeNotation>[0]) === 'H[p-b,p-a]' && saved !== null && JSON.stringify(JSON.parse(saved)) === JSON.stringify(T) && inv2.every((r) => r.pass);
    await shot(page, info, '03-after');
    await observe(page, info, {
      scenario: 'R19', caseName: 'R19-persist-dnd-empty', runNo, expected: TXT['R19-persist-dnd'][0], predicted: TXT['R19-persist-dnd'][1],
      observed: `빈 패널 p-b를 앵커로 control-a → (p-b,right,0): hover ${hover}, 커밋 ${treeNotation(T as Parameters<typeof treeNotation>[0])}; localStorage 갱신 = 커밋 트리: ${saved !== null && JSON.stringify(JSON.parse(saved)) === JSON.stringify(T)}; ${invSummary(inv2)}`,
      verdict: ok2 ? 'as-ideal' : 'deviates', invariants: inv2, since: t1, allow: { I7: ['nope-slot'] },
    });
  });
});
