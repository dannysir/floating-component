// R13 pair — 터치 ghost(소스 패널 cloneNode 복제)의 부작용. touch 프로젝트. openTouch를 스펙에서 직접 조합(헬퍼 불변).
import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { openTouch } from '../helpers/touch';
import { domTree, dropPoint, handlePoint, treeNotation } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary, eventsSince, baseLabels } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { snapshot } from '../helpers/snapshot';
import { capture, promote } from '../helpers/evidence';

test.beforeEach(({}, testInfo) => {
  if (testInfo.project.name !== 'touch') test.skip(true, 'R13 runs only in the touch project');
});

const EXP = '드래그 시작은 내용에 부작용이 없다. ghost 1개, 끝나면 없음. 커밋 `H[p-b,p-a]`';
const PRED: Record<string, string> = {
  'control-a': '정적 복제. ghost가 `[data-theme]` 토큰을 잃는다(계산된 스타일 `--hb-fg` 등이 비어 있음). 커밋에서 `p-a`(소스) moves +1(D3b). `onMovePanel` 1건',
  orders: '정적 복제, 토큰 유실. content +0',
  billing: 'ghost 안 canvas가 비어 있다(`cloneNode`는 비트맵을 복제하지 않는다). 토큰 유실',
  telemetry: 'ghost의 iframe이 문서를 한 번 더 로드: mirror `loads` +1, 새 `docId`, `:4304` 문서 요청 +1, `dom.ghosts[0].iframeCount === 1`. 프레임 안 sessionStorage `harbor.loads.telemetry`도 +1 돼 다음 재로드 때 숫자가 2 뛴다(카운터 오염. 관찰 기록에 적는다). 커밋에서 소스 재삽입으로 실제 iframe도 재로드(`loads` +1 더. D3b)',
};
const CASES = [
  { name: 'R13-control', slot: 'control-a' },
  { name: 'R13-orders', slot: 'orders' },
  { name: 'R13-billing', slot: 'billing' },
  { name: 'R13-telemetry', slot: 'telemetry' },
  { name: 'R13-ladder-control-iframe', slot: 'control-iframe', ladderOf: 'telemetry' },
] as const;
const GHOST = 'body > [style*="z-index: 9999"]';
const tokens = (page: Page) => page.evaluate((g) => {
  const ghost = document.querySelector(g) as HTMLElement | null;
  const orig = document.querySelector('[data-tree-root] [data-panel-id="p-a"]') as HTMLElement | null;
  const read = (el: HTMLElement | null) => el ? { fg: getComputedStyle(el).getPropertyValue('--hb-fg').trim(), bg: getComputedStyle(el).getPropertyValue('--hb-bg').trim() } : null;
  return { ghost: read(ghost?.firstElementChild as HTMLElement ?? ghost), orig: read(orig?.firstElementChild as HTMLElement ?? orig) };
}, GHOST);
const canvases = (page: Page) => page.evaluate((g) => {
  const blank = (c: HTMLCanvasElement) => { const b = document.createElement('canvas'); b.width = c.width; b.height = c.height; return b.toDataURL(); };
  const gc = document.querySelector(`${g} [data-testid="billing-canvas"]`) as HTMLCanvasElement | null;
  const oc = document.querySelector('[data-tree-root] [data-testid="billing-canvas"]') as HTMLCanvasElement | null;
  return { ghostBlank: gc ? gc.toDataURL() === blank(gc) : null, origBlank: oc ? oc.toDataURL() === blank(oc) : null };
}, GHOST);
const mirror = (page: Page, slot: string) => page.evaluate((s) => (window as unknown as { __fc: { frames: Record<string, { mirror?: { loads: number; docIds: string[] } }> } }).__fc.frames[s]?.mirror ?? null, slot);

CASES.forEach((c) => {
  [1, 2].forEach((runNo) => {
    test(`${c.name}-run${runNo}`, async ({ lab, page }, info) => {
      await lab.open({ layout: 'pair', slots: { a: c.slot, b: 'control-b' } });
      expect(await domTree(page)).toBe('H[p-a,p-b]');                                      // 전제
      await seedAll(page, [c.slot, 'control-b']);
      const { snap: s1 } = await shot(page, info, '01-before');
      const docReq = () => lab.requests.filter((r) => r.resourceType === 'document' && r.url.includes(':4304')).length;
      const m0 = await mirror(page, c.slot); const r0 = docReq();
      const t0 = Date.now();
      const t = await openTouch(page);
      const h = await handlePoint(page, c.slot);
      await t.touchStart(h);
      await t.touchMove({ x: h.x + 12, y: h.y });
      let g0 = (await snapshot(page, 'g0')).dom.ghosts;
      if (g0.length === 0) { await t.touchMove({ x: h.x + 24, y: h.y }); g0 = (await snapshot(page, 'g0b')).dom.ghosts; }   // Chromium touch slop(부작용 #18)
      expect(g0.length).toBe(1);                                                          // 전제
      expect(await domTree(page)).toBe('H[p-a,p-b]');                                      // 전제
      const s2 = await snapshot(page, '02-ghost-0');
      await capture(page, info, '02-ghost-0');
      await capture(page, info, '02-ghost-0-el', { element: page.locator(GHOST) });
      const tok = await tokens(page);
      const cv = c.slot === 'billing' ? await canvases(page) : null;
      const m1 = await mirror(page, c.slot); const r1 = docReq();
      await t.hold(500);
      const s3 = await snapshot(page, '02-ghost-500');
      const m2 = await mirror(page, c.slot); const r2 = docReq();
      await t.touchMove(await dropPoint(page, 'p-b', 'right', 0));
      expect(await domTree(page)).toBe('H[p-b,p-a]');                                      // 전제
      const { snap: s4 } = await shot(page, info, '02-mid');
      const m3 = await mirror(page, c.slot); const r3 = docReq();
      await t.touchEnd(); await settle(page);
      const { snap: s5 } = await shot(page, info, '03-after');
      const m4 = await mirror(page, c.slot); const r4 = docReq();
      const inv = await checkInvariants(page);
      const ev = await eventsSince(page, t0);
      const tend = ev.filter((e) => e.type === 'touchend').map((e) => `${e.phase}/${e.target.panelId ?? e.target.tag}/connected=${e.isConnected}`);
      const sawDragstart = ev.some((e) => e.type === 'dragstart' && e.isTrusted);
      const calls = s5.calls.filter((x) => x.fn === 'onMovePanel');
      const d01 = deltas(s2, s3); const dPrev = deltas(s3, s4); const dAll = deltas(s1, s5);
      const A = dAll[c.slot];
      const committed = treeNotation(s5.tree as Parameters<typeof treeNotation>[0]);
      const iframe = c.slot === 'telemetry' || c.slot === 'control-iframe';
      const ghostSide = (m2?.loads ?? 0) - (m1?.loads ?? 0) + ((m1?.loads ?? 0) - (m0?.loads ?? 0));
      const tokenLost = !!tok.orig?.fg && !tok.ghost?.fg;
      const ideal = !tokenLost && ghostSide === 0 && (!cv || cv.ghostBlank === false) && committed === 'H[p-b,p-a]' && inv.every((r) => r.pass);
      const pred = committed === 'H[p-b,p-a]' && calls.length === 1 && s5.dom.ghosts.length === 0 && !sawDragstart
        && (c.slot !== 'billing' || (cv?.ghostBlank === true && cv.origBlank === false))
        && (!iframe || (s2.dom.ghosts[0]?.iframeCount === 1 && ghostSide >= 1));
      const verdict = ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates';
      await observe(page, info, {
        scenario: 'R13', caseName: c.name, runNo,
        expected: 'ladderOf' in c ? `(대조 사다리) ${EXP}` : EXP, predicted: 'ladderOf' in c ? `(대조 사다리 control-iframe) ${PRED.telemetry}` : PRED[c.slot],
        observed: `ghost ${JSON.stringify(s2.dom.ghosts[0])}; 토큰 ghost ${JSON.stringify(tok.ghost)} vs 원본 ${JSON.stringify(tok.orig)}${cv ? `; canvas ghost 빈 캔버스=${cv.ghostBlank}, 원본 빈 캔버스=${cv.origBlank}` : ''}; `
          + `${iframe ? `mirror loads ${m0?.loads}→ghost직후 ${m1?.loads}→500ms ${m2?.loads}→미리보기 ${m3?.loads}→커밋 ${m4?.loads}, 문서 요청 ${r0}→${r1}→${r2}→${r3}→${r4}, docIds ${JSON.stringify(m4?.docIds)}; ` : ''}`
          + `ghost 0→500ms 구간: ${fmtDeltas(d01).replace(/; /g, ' | ') || '변화 없음'}; 미리보기 구간: ${fmtDeltas(dPrev)}; 커밋 ${committed}, onMovePanel ${calls.length}건 ${calls.map((x) => JSON.stringify(x.args)).join(' ')}, ghost 잔존 ${s5.dom.ghosts.length}, 신뢰된 dragstart ${sawDragstart}; touchend [${tend.join(', ')}]; ${invSummary(inv)}. 누적 ${c.slot}: frame+${A.frame} content+${A.content} moves+${A.moves}${A.loads !== null ? ` loads+${A.loads}` : ''}`,
        verdict, invariants: inv, since: t0, labels: baseLabels('touch-cdp-handle'),
        extra: { ghostToContentDeltas: d01, previewDeltas: dPrev, all: dAll },
      });
      if (runNo === 1 && ['R13-telemetry', 'R13-billing'].includes(c.name)) {
        const caseDir = new URL(`../.artifacts/r13-pair-touch-ghost/${info.title}/`, import.meta.url).pathname;
        await promote({ run: 'run01-tier1', findingId: 'FC-QA-011', caseDir, images: ['02-ghost-0-el.png'], prefix: c.name === 'R13-telemetry' ? 'R13t-' : 'R13b-' });
      }
    });
  });
});
