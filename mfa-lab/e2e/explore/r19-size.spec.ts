// R19 패널 크기 제약: 주입 트리(row3-size, pair-size, census-vsize)에서 경계선 드래그와 창 크기 변경의 한계 px, 넘침 스크롤.
import { test } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { panelRect } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { resizeBorder } from '../helpers/resize';
import { observe, shot, invSummary } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { promote } from '../helpers/evidence';

const EXP = {
  s1280: '상한 400·하한 200(세로 300·120)이 창 크기 변경(CSS)과 경계선 드래그에서 **같은 px**로 지켜진다(오차 3px)',
  s800: '창 폭 800에서도 하한·상한이 같은 px',
  overflow: '패널보다 큰 내용은 잘리지 않고 스크롤된다',
};
const PRED = {
  s1280: '**`row3-size`(자식 3개): 경계선 드래그의 상한이 설정 px보다 작은 곳에서 멈춘다.** px→flex 환산이 split 전체 px에 인접 두 자식의 flex 합을 곱하므로 비율이 `2/3`이 된다: 400 → 약 267px(루트 폭 1256 기준). 하한: 상태 `size`가 200px에 해당하는 값 아래로 내려가고 화면은 CSS `min-width`에 걸려 200에서 멈춘다. 되돌릴 때(`+50`) 상태가 200px 상당을 넘을 때까지 경계선이 따라오지 않는다(지연). **`pair-size`(자식 2개): 상한 약 397~398px**(Resizer 8px만큼 덜 움직임. 3px 안이 아닐 수 있다. 관찰로 적는다). **`census-vsize`**: `p-b`·`p-c`뿐인 세로 split이므로 pair와 같은 수 px 오차',
  s800: '창 크기 변경(CSS)은 하한 200/150/120을 정확히 지킨다. 경계선 드래그의 상한은 1280 때와 같은 비율로 어긋난다(row3 약 2/3)',
  overflow: '통과. 스크롤은 PanelFrame body(`overflow:auto`) 안에서. 패널 wrapper(`overflow:auto`)와 body가 둘 다 스크롤 컨테이너라 이중 스크롤바가 생길 수 있다(픽스처 CSS 문제면 `fixture-bug`)',
};
type Tree = { type: string; id?: string; children?: Tree[] } & Record<string, unknown>;
const TREES: Record<string, { layout: string; tree: (base: Tree) => Tree; between: [string, string]; axis: 'x' | 'y'; max: number; min: number; deltas: [number, number, number] }> = {
  'row3-size': { layout: 'row3', between: ['p-a', 'p-b'], axis: 'x', max: 400, min: 200, deltas: [400, -600, 50],
    tree: () => ({ type: 'split', direction: 'horizontal', size: 1, children: [{ type: 'panel', id: 'p-a', size: 1, componentKey: 'control-a', minWidth: 200, maxWidth: 400 }, { type: 'panel', id: 'p-b', size: 1, componentKey: 'control-b' }, { type: 'panel', id: 'p-c', size: 1, componentKey: 'control-c', minWidth: 150 }] }) },
  'pair-size': { layout: 'pair', between: ['p-a', 'p-b'], axis: 'x', max: 400, min: 200, deltas: [400, -600, 50],
    tree: () => ({ type: 'split', direction: 'horizontal', size: 1, children: [{ type: 'panel', id: 'p-a', size: 1, componentKey: 'control-a', minWidth: 200, maxWidth: 400 }, { type: 'panel', id: 'p-b', size: 1, componentKey: 'control-b' }] }) },
  'census-vsize': { layout: 'census', between: ['p-b', 'p-c'], axis: 'y', max: 300, min: 120, deltas: [300, -500, 50],
    tree: (base) => { const add = (n: Tree): Tree => (n.type === 'panel' ? (n.id === 'p-b' ? { ...n, minHeight: 120, maxHeight: 300 } : n) : { ...n, children: (n.children ?? []).map(add) }); return add(base); } },
};
const getTree = (page: Page) => page.evaluate(() => (window as unknown as { __fc: { getTree: () => unknown } }).__fc.getTree()) as Promise<Tree>;
const inject = async (lab: { open: (o: Record<string, unknown>) => Promise<unknown> }, page: Page, name: string) => {
  const T = TREES[name];
  await lab.open({ layout: T.layout });
  const base = await getTree(page);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [`harbor.layout.${T.layout}.v1`, JSON.stringify(T.tree(base))] as const);
  await lab.open({ layout: T.layout, flags: { persist: '1' } });
  await settle(page);
};
const sizeOf = async (page: Page, id: string, axis: 'x' | 'y') => { const r = await panelRect(page, id); return Math.round((axis === 'x' ? r.width : r.height) * 10) / 10; };
const flexOf = async (page: Page, ids: string[]) => { const t = await getTree(page); const out: Record<string, number> = {}; const walk = (n: Tree) => { if (n.type === 'panel' && ids.includes(n.id!)) out[n.id!] = Math.round(Number(n.size) * 1000) / 1000; (n.children ?? []).forEach(walk); }; walk(t); return out; };

[1, 2].forEach((runNo) => {
  Object.keys(TREES).forEach((name) => {
    test(`R19-size-1280-${name}-run${runNo}`, async ({ lab, page }, info) => {
      const T = TREES[name]; const [a, b] = T.between;
      await inject(lab, page, name);
      await shot(page, info, '01-before');
      const t0 = Date.now();
      const rows: string[] = [];
      const px: number[] = [];
      const start = await sizeOf(page, a, T.axis);
      for (const delta of T.deltas) {
        await resizeBorder(page, { between: T.between, delta, steps: 20 });
        const v = await sizeOf(page, a, T.axis); px.push(v);
        rows.push(`${delta > 0 ? '+' : ''}${delta} → ${a} ${v}px flex ${JSON.stringify(await flexOf(page, [a, b, 'p-c']))}`);
      }
      const inv = await checkInvariants(page);
      await shot(page, info, '03-after');
      const [up, down, back] = px;
      const ideal = Math.abs(up - T.max) <= 3 && Math.abs(down - T.min) <= 3 && Math.abs(back - (T.min + 50)) <= 3 && inv.every((r) => r.pass);
      const predOk = name === 'row3-size' ? up < T.max - 50 && Math.abs(down - T.min) <= 3 && back < T.min + 50 - 3
        : name === 'pair-size' ? up >= 390 && up <= 400 : Math.abs(up - T.max) <= 10;
      await observe(page, info, {
        scenario: 'R19', caseName: `R19-size-1280-${name}`, runNo, expected: EXP.s1280, predicted: PRED.s1280,
        observed: `${name}: 시작 ${a} ${start}px; ${rows.join('; ')}. 상한 오차 ${(up - T.max).toFixed(1)}px, 하한 오차 ${(down - T.min).toFixed(1)}px, +50 되돌림 ${(back - down).toFixed(1)}px 이동; ${invSummary(inv)}`,
        verdict: ideal ? 'as-ideal' : predOk ? 'as-predicted' : 'deviates', invariants: inv, since: t0,
        extra: { px, rows },
      });
      if (runNo === 1 && name === 'row3-size') {
        const caseDir = new URL(`../.artifacts/r19-size/${info.title}/`, import.meta.url).pathname;
        await promote({ run: 'run01-tier1', findingId: 'FC-QA-010', caseDir, images: ['01-before.png', '03-after.png'] });
      }
    });

    test(`R19-size-800-${name}-run${runNo}`, async ({ lab, page }, info) => {
      const T = TREES[name]; const [a] = T.between;
      await inject(lab, page, name);
      const t0 = Date.now();
      await resizeBorder(page, { between: T.between, delta: T.deltas[1], steps: 20 });           // 하한까지
      const atMin1280 = await sizeOf(page, a, T.axis);
      await page.setViewportSize({ width: 800, height: 600 }); await settle(page);
      const at800 = await sizeOf(page, a, T.axis);
      const pc800 = name === 'row3-size' ? await sizeOf(page, 'p-c', 'x') : null;
      await resizeBorder(page, { between: T.between, delta: 300, steps: 20 });
      const up800 = await sizeOf(page, a, T.axis);
      await page.setViewportSize({ width: 1280, height: 800 }); await settle(page);
      const back1280 = await sizeOf(page, a, T.axis);
      const inv = await checkInvariants(page);
      await shot(page, info, '03-after');
      const ideal = Math.abs(at800 - T.min) <= 3 && Math.abs(Math.min(up800, T.max) - up800) <= 3 && Math.abs(up800 - T.max) <= 3 && inv.every((r) => r.pass);
      const predOk = Math.abs(at800 - T.min) <= 1 && (pc800 === null || pc800 >= 150 - 1);
      await observe(page, info, {
        scenario: 'R19', caseName: `R19-size-800-${name}`, runNo, expected: EXP.s800, predicted: PRED.s800,
        observed: `${name}: 1280 하한 ${a} ${atMin1280}px → 800x600 ${at800}px${pc800 !== null ? ` (p-c ${pc800}px)` : ''} → 800에서 +300 ${up800}px(상한 ${T.max} 대비 ${(up800 - T.max).toFixed(1)}) → 1280 복귀 ${back1280}px; ${invSummary(inv)}`,
        verdict: ideal ? 'as-ideal' : predOk ? 'as-predicted' : 'deviates', invariants: inv, since: t0,
      });
    });
  });

  test(`R19-overflow-run${runNo}`, async ({ lab, page }, info) => {
    await inject(lab, page, 'row3-size');
    await resizeBorder(page, { between: ['p-a', 'p-b'], delta: -600, steps: 20 });
    const t0 = Date.now();
    const m = await page.evaluate(() => {
      const q = (sel: string) => { const el = document.querySelector(sel) as HTMLElement | null; if (!el) return null; const cs = getComputedStyle(el); return { sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, ox: cs.overflowX, oy: cs.overflowY }; };
      return { panel: q('[data-tree-root] [data-panel-id="p-a"]'), body: q('[data-tree-root] [data-testid="body-control-a"]'), scroll: q('[data-tree-root] [data-testid="control-a-scroll"]') };
    });
    await page.locator('[data-tree-root] [data-panel-id="p-a"]').screenshot({ path: info.outputPath('p-a.png') });
    await shot(page, info, '03-after');
    const scrollers = Object.entries(m).filter(([, v]) => v && (((v.oy === 'auto' || v.oy === 'scroll') && v.sh > v.ch + 1) || ((v.ox === 'auto' || v.ox === 'scroll') && v.sw > v.cw + 1))).map(([k]) => k);
    const ok = !!m.scroll && m.scroll.sh > m.scroll.ch && scrollers.length >= 1 && !(m.panel && m.panel.sh > m.panel.ch + 1);
    await observe(page, info, {
      scenario: 'R19', caseName: 'R19-overflow', runNo, expected: EXP.overflow, predicted: PRED.overflow,
      observed: `p-a 하한 상태: panel ${JSON.stringify(m.panel)}, body ${JSON.stringify(m.body)}, control-a-scroll ${JSON.stringify(m.scroll)}; 실제로 스크롤 가능한 요소 [${scrollers.join(', ')}](이중 스크롤바 ${scrollers.length > 1 ? '가능' : '없음'})`,
      verdict: ok ? (scrollers.length === 1 ? 'as-ideal' : 'as-predicted') : 'deviates', since: t0,
      invariants: await checkInvariants(page),
    });
  });
});
