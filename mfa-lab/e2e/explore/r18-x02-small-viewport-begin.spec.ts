// R18 #17 재현: 800x600에서 형제의 최소 크기(nav 200 고정, orders minWidth 320) 때문에 최소 크기가 없는 패널이 폭 0으로 접히면
// 그 패널의 핸들 드래그를 시작할 수 없다. 깨끗한 컨텍스트 2회. 기록만 한다.
import { test } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { resizeBorder } from '../helpers/resize';
import { settle } from '../helpers/settle';
import { capture } from '../helpers/evidence';

[1, 2].forEach((runNo) => {
  test(`r18-x02-run${runNo}`, async ({ lab, page }, info) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await lab.open({ layout: 'workbench' });
    await resizeBorder(page, { between: ['orders', 'board'], delta: 300, steps: 10 });   // orders를 넓혀 V 열(board·billing)을 짜낸다
    await settle(page);
    const widths = await page.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('[data-tree-root] [data-panel-id]')).map((el) => [el.getAttribute('data-panel-id'), Math.round(el.getBoundingClientRect().width)])));
    await capture(page, info, '01-collapsed');
    let started = 'n/a';
    try { const d = await begin(page, 'billing'); started = 'yes'; await d.cancelEsc(); } catch (e) { started = `no: ${(e as Error).message.split('\n')[0]}`; }
    console.log(`[x02 run${runNo}] widths ${JSON.stringify(widths)} billing drag ${started}`);
  });
});
