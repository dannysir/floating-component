// B2-P1 (마우스): H-HANDLE-STALE, ?drag=panel 상호작용, H-SIZING 크기·넘침 조합, workbench glide churn. 기록 위주.
import { test } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { begin } from '../helpers/mouseDrag';
import { domTree, dropPoint, handlePoint } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary, eventsSince } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { snapshot } from '../helpers/snapshot';
import { dragEvents } from '../helpers/events';

const rootDragging = (page: Page) => page.evaluate(() => document.querySelector('[data-tree-root]')?.getAttribute('data-dragging-panel-id') ?? null);
const contentDrag = async (page: Page, testid: string, dx = 30) => {
  const t0 = Date.now();
  const b = (await page.locator(`[data-tree-root] [data-testid="${testid}"]`).boundingBox())!;
  const p = { x: b.x + Math.min(40, b.width / 2), y: b.y + b.height / 2 };
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 6, p.y, { steps: 2 }); await page.mouse.move(p.x + dx, p.y, { steps: 3 }); await settle(page);
  const dragging = await rootDragging(page);
  const ds = dragEvents(await eventsSince(page, t0)).filter((e) => e.type === 'dragstart');
  await page.keyboard.press('Escape'); await page.mouse.up(); await settle(page);
  return { dragging, dragstart: ds.map((e) => `${e.phase}/${e.target.testid}/trusted=${e.isTrusted}`).join(' ') || '없음' };
};

[1, 2].forEach((runNo) => {
  test(`P1-handle-stale-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'pair', slots: { a: 'billing', b: 'control-b' } });
    const t0 = Date.now();
    const s0 = await snapshot(page, 's0');
    const d = await begin(page, 'billing'); await d.cancelEsc(); await settle(page);
    const s1 = await snapshot(page, 's1');
    const drag1 = await contentDrag(page, 'billing-scroll');
    const s2 = await snapshot(page, 's2');
    const inv = await checkInvariants(page);
    await shot(page, info, '03-after');
    const stale = s1.dom.panels['p-a'].draggable === true;
    await observe(page, info, {
      scenario: 'B2-P1', caseName: 'P1-handle-stale', runNo, expected: '핸들 드래그가 끝나면 패널 `draggable`이 `false`로 돌아가 내용 드래그가 패널 드래그를 시작하지 않는다', predicted: '(H-HANDLE-STALE, 미실행 예측 없음 — 기록)',
      observed: `draggable: 처음 ${s0.dom.panels['p-a'].draggable} → 핸들 드래그+Esc 뒤 ${s1.dom.panels['p-a'].draggable} → 내용 드래그 뒤 ${s2.dom.panels['p-a'].draggable}; billing-scroll(핸들 밖)에서 mouse 드래그: dragstart [${drag1.dragstart}], data-dragging-panel-id=${drag1.dragging}; ${invSummary(inv)}`,
      verdict: !stale && drag1.dragging === null ? 'as-ideal' : 'deviates', invariants: inv, since: t0,
    });
  });

  test(`P1-panel-mode-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'pair', slots: { a: 'billing', b: 'control-b' }, flags: { drag: 'panel' } });
    const t0 = Date.now();
    const range = page.locator('[data-tree-root] [data-testid="billing-range"]');
    const v0 = await range.inputValue();
    const rb = (await range.boundingBox())!;
    await page.mouse.move(rb.x + rb.width * 0.4, rb.y + rb.height / 2); await page.mouse.down(); await page.mouse.move(rb.x + rb.width * 0.8, rb.y + rb.height / 2, { steps: 8 }); await settle(page);
    const dragR = await rootDragging(page); const dsR = dragEvents(await eventsSince(page, t0)).filter((e) => e.type === 'dragstart').length;
    await page.mouse.up(); await page.keyboard.press('Escape'); await settle(page);
    const v1 = await range.inputValue();
    const t1 = Date.now();
    const inp = page.locator('[data-tree-root] [data-testid="billing-input"]');
    await inp.fill('select me please');
    const ib = (await inp.boundingBox())!;
    await page.mouse.move(ib.x + 4, ib.y + ib.height / 2); await page.mouse.down(); await page.mouse.move(ib.x + ib.width - 10, ib.y + ib.height / 2, { steps: 8 }); await settle(page);
    const dragT = await rootDragging(page); const dsT = dragEvents(await eventsSince(page, t1)).filter((e) => e.type === 'dragstart').length;
    await page.mouse.up(); await page.keyboard.press('Escape'); await settle(page);
    const sel = await inp.evaluate((el: HTMLInputElement) => (el.selectionEnd ?? 0) - (el.selectionStart ?? 0));
    const inv = await checkInvariants(page);
    await shot(page, info, '03-after');
    await observe(page, info, {
      scenario: 'B2-P1', caseName: 'P1-panel-mode', runNo, expected: '`?drag=panel`에서도 슬라이더 조작·텍스트 선택은 패널 드래그와 충돌하지 않는다', predicted: '(H-HANDLE-STALE 관련, 기록)',
      observed: `슬라이더: 값 ${v0}→${v1}, dragstart ${dsR}건, dragging=${dragR}; 입력 텍스트 드래그 선택: 선택 길이 ${sel}, dragstart ${dsT}건, dragging=${dragT}; tree ${await domTree(page)}; ${invSummary(inv)}`,
      verdict: v1 !== v0 && dsR === 0 && sel > 0 && dsT === 0 ? 'as-ideal' : 'deviates', invariants: inv, since: t0,
    });
  });

  test(`P1-glide-churn-run${runNo}`, async ({ lab, page }, info) => {
    await lab.open({ layout: 'workbench' });
    await seedAll(page, ['orders', 'board', 'billing', 'telemetry', 'telemetry-x']);
    const { snap: before } = await shot(page, info, '01-before');
    const t0 = Date.now();
    const d = await begin(page, 'billing');
    const target = await dropPoint(page, 'telemetry-x', 'right', 0).catch(async () => handlePoint(page, 'telemetry-x'));
    const previews: string[] = [];
    const start = d.current; const steps = 40;
    for (let i = 1; i <= steps; i += 1) { const p = { x: start.x + ((target.x - start.x) * i) / steps, y: start.y + ((target.y - start.y) * i) / steps }; await page.mouse.move(p.x, p.y); if (i % 4 === 0) { await settle(page); const t = await domTree(page); if (previews[previews.length - 1] !== t) previews.push(t); } }
    await settle(page);
    const res = await d.release();
    const { snap: after } = await shot(page, info, '03-after');
    const inv = await checkInvariants(page);
    const ds = deltas(before, after);
    await observe(page, info, {
      scenario: 'B2-P1', caseName: 'P1-glide-churn', runNo, expected: '드래그하지 않은 패널은 미리보기 변화 횟수와 무관하게 리마운트되지 않는다(D3)', predicted: '슬롯별 카운터 증가분이 미리보기 변화 횟수에 비례할 것',
      observed: `glide 40단계 billing → telemetry-x 오른쪽(마지막 점은 iframe 본문 → FC-QA-005); 서로 다른 미리보기 ${previews.length}개 [${previews.join(' → ')}]; under=${res.underCursorAtDrop}; 커밋 ${after.treeNotation}; ${invSummary(inv)}. 누적: ${fmtDeltas(ds)}`,
      verdict: Object.values(ds).filter((x) => x.slot !== 'billing').every((x) => x.cls === 'untouched') ? 'as-ideal' : 'as-predicted', invariants: inv, since: t0,
      extra: { previews, deltas: ds },
    });
  });

  (['1280x800', '800x600'] as const).forEach((vp) => {
    test(`P1-sizing-${vp}-run${runNo}`, async ({ lab, page }, info) => {
      const [w, h] = vp.split('x').map(Number);
      await page.setViewportSize({ width: w, height: h });
      const rows: string[] = [];
      for (const slot of ['orders', 'billing', 'telemetry', 'control-iframe', 'control-mount']) {
        await lab.open({ layout: 'census', slots: { b: slot } });
        await settle(page);
        const m = await page.evaluate((s) => {
          const dims = (el: Element | null) => { if (!el) return null; const e = el as HTMLElement; const cs = getComputedStyle(e); return `${e.scrollWidth}/${e.clientWidth}x${e.scrollHeight}/${e.clientHeight}${(cs.overflowX === 'auto' || cs.overflowY === 'auto') ? '(auto)' : ''}`; };
          const panel = document.querySelector('[data-tree-root] [data-panel-id="p-b"]');
          const body = document.querySelector(`[data-tree-root] [data-testid="body-${s}"]`);
          const iframe = body?.querySelector('iframe') as HTMLElement | null;
          const scrollers = [panel, body, ...(body ? Array.from(body.querySelectorAll('*')) : [])].filter((el) => { if (!el) return false; const e = el as HTMLElement; const cs = getComputedStyle(e); return ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 1) || ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1); }).map((el) => (el as HTMLElement).dataset.testid ?? (el as HTMLElement).dataset.panelId ?? el!.tagName.toLowerCase());
          const ib = iframe?.getBoundingClientRect(); const bb = body?.getBoundingClientRect();
          return { panel: dims(panel), body: dims(body), scrollers, iframeEqBody: ib && bb ? Math.abs(ib.width - bb.width) < 1 && Math.abs(ib.height - bb.height) < 1 : null };
        }, slot);
        rows.push(`${slot}: panel ${m.panel}, body ${m.body}, 스크롤 가능 [${m.scrollers.join(',')}]${m.iframeEqBody !== null ? `, iframe=body ${m.iframeEqBody}` : ''}`);
      }
      await shot(page, info, '03-after');
      await observe(page, info, {
        scenario: 'B2-P1', caseName: `P1-sizing-${vp}`, runNo, expected: '패널보다 큰 내용은 한 곳에서만 스크롤되고(이중 스크롤바 없음) iframe 요소는 body 크기와 같다', predicted: '(H-SIZING, 기록)',
        observed: rows.join(' ; '), verdict: rows.every((r) => !/패널.*p-b.*body-/.test(r)) ? 'as-ideal' : 'deviates', invariants: await checkInvariants(page),
      });
    });
  });
});
