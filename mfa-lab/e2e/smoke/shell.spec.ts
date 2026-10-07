// B1-02 게이트: shell 대조군 레이아웃 다섯 개가 모두 렌더되고 계측이 맞는가.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test, expect } from '../helpers/fixtures';
import { RESIZER_COUNT, panelsOf, presetWithSlots } from '../helpers/presets';
import type { PresetName } from '../helpers/presets';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const libTree = execSync('git rev-parse HEAD:src', { cwd: repoRoot, encoding: 'utf8' }).trim();

const CASES: { name: string; layout: PresetName; slots?: Record<string, string> }[] = [
  { name: 'census-control', layout: 'census' },
  { name: 'census-bare', layout: 'census', slots: { a: 'bare-0', b: 'bare-1', c: 'bare-2', d: 'bare-3' } },
  { name: 'locks', layout: 'locks' },
  { name: 'row3', layout: 'row3' },
  { name: 'pair', layout: 'pair' },
];

CASES.forEach(({ name, layout, slots }) => {
  test(`smoke shell ${name}`, async ({ lab, page }) => {
    const opened = await lab.open({ layout, slots });
    expect(opened.skipped).toEqual([]);
    const expected = presetWithSlots(layout, slots);

    // 모든 패널이 렌더된다
    await expect(page.locator('[data-tree-root] [data-panel-id]')).toHaveCount(panelsOf(expected).length);

    // getTree()가 프리셋 JSON과 같다
    const tree = await page.evaluate(() => (window as unknown as { __fc: { getTree: () => unknown } }).__fc.getTree());
    expect(tree).toEqual(expected);

    // 리사이저 스타일 태그와 커서
    await expect(page.locator('style[data-ftl-styles]')).toHaveCount(1);
    const cursors = await page.locator('[data-tree-root] .ftl-resizer').evaluateAll((els) => els.map((e) => getComputedStyle(e).cursor));
    expect(cursors.length).toBe(RESIZER_COUNT[layout]);
    cursors.forEach((c) => expect(['col-resize', 'row-resize']).toContain(c));
    if (layout === 'locks') {
      const navNeighbours = await page.locator('[data-tree-root] [data-panel-id="nav"]').evaluate((el) => [
        el.previousElementSibling?.classList.contains('ftl-resizer') ?? false,
        el.nextElementSibling?.classList.contains('ftl-resizer') ?? false,
      ]);
      expect(navNeighbours).toEqual([false, false]);
    }

    // 라이브러리 출처, 트리 해시, React 버전
    const fc = await page.evaluate(() => {
      const w = window as unknown as { __fc: { lib: { source: string; tree: string }; reactVersion: string; env: { mode: string } } };
      return { source: w.__fc.lib.source, tree: w.__fc.lib.tree, reactVersion: w.__fc.reactVersion, mode: w.__fc.env.mode };
    });
    expect(fc.source).toBe('src');
    expect(fc.tree).toBe(libTree);
    expect(fc.reactVersion).toBe('19.2.4');
    expect(fc.mode).toBe('prod');

    // 트리 루트 높이 > 0
    const rootBox = await page.locator('[data-tree-root]').boundingBox();
    expect(rootBox?.height ?? 0).toBeGreaterThan(0);

    // 콘솔 에러와 page error 0건
    expect(lab.consoleErrors()).toEqual([]);
    expect(lab.pageErrors).toEqual([]);
  });
});
