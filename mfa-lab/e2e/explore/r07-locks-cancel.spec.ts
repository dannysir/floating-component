// R07 locks — 취소 경로 (Esc, 잠긴 nav, iframe 본문, 여백, iframe 소스). 대조 사다리: R07-iframe을 output=control-iframe으로.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree, handlePoint, panelRect, underCursor } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { deltas, fmtDeltas, observe, seedAll, shot, invSummary, eventsSince } from '../helpers/explore';
import { checkInvariants } from '../helpers/invariants';
import { readFrameMfe } from '../helpers/frames';
import { fmtEvents, dragEvents } from '../helpers/events';

const TXT: Record<string, [string, string]> = {
  'R07-esc': ['I1~I7 통과, 트리 불변, `calls` 비어 있음. 드래그하지 않은 `output`·`editor`는 변화 없음', '통과(I1~I7). `dragend`가 분리된 원본 노드에 간다: `phase \'target\'`, `isConnected false`, 같은 `eid`의 window 레코드 없음. 카운터: `terminal`(소스) frame +2(D3b 하위 관찰), `output` frame +2(D3: FC-QA-001 대상. split이 풀려 부모가 바뀐다), `editor` moves +1(D3a)'],
  'R07-nav': ['놓으면 이동이 취소되고 원래 배치로 돌아간다. `drop` 없음', '`underCursorAtDrop \'locked\'`, `sawDrop false`, `dragendDropEffect \'none\'`, `dragleave` + `dragend`, 트리 불변, I1~I7 통과. 카운터는 `R07-esc`와 같음'],
  'R07-iframe': ['iframe 패널도 다른 패널과 같은 드롭 대상이다. 그 위에서 놓으면 거기로 이동이 커밋된다', '마지막 `dragover`가 `:4304` 프레임에 찍힌다. host `domTree`는 hover 때 그대로(루트 `dragleave`의 `relatedTarget`이 루트 안의 iframe 요소라 미리보기를 지우지 않는다. 추론). `sawDrop false`, `dragend`만 → 취소. 트리 불변. I1~I7 통과. `output`(telemetry) `loads` +2(hover 리마운트 + 취소 복귀)'],
  'R07-padding': ['패널 밖에서 놓으면 취소. 깨끗하게 끝난다', '루트 `dragleave`(`relatedTarget`이 루트 밖) → 미리보기가 먼저 지워져 `domTree`가 원래대로. `drop` 없음(여백은 dragover를 취소하지 않는다), `dragend` → `finishDrag`(멱등). I1~I7 통과. 카운터 `R07-esc`와 같음'],
  'R07-iframe-source': ['소스가 iframe 패널이어도 취소가 깨끗하다. 드래그하지 않은 `output`은 변화 없음', '통과. `terminal`(telemetry) `loads` +2(소스 자신의 재로드. D3b 하위 관찰), `output` frame +2(D3), `editor` moves +1. `dragend`는 분리된 헤더 노드에 `isConnected false`로'],
};

type Variant = { name: string; caseName: string; slots: Record<string, string>; src: string; end: 'esc' | 'nav' | 'iframe' | 'padding'; ladder?: boolean };
const VARIANTS: Variant[] = [
  { name: 'R07-esc', caseName: 'R07-esc', slots: {}, src: 'control-b', end: 'esc' },
  { name: 'R07-nav', caseName: 'R07-nav', slots: {}, src: 'control-b', end: 'nav' },
  { name: 'R07-iframe', caseName: 'R07-iframe', slots: { output: 'telemetry' }, src: 'control-b', end: 'iframe' },
  { name: 'R07-padding', caseName: 'R07-padding', slots: {}, src: 'control-b', end: 'padding' },
  { name: 'R07-iframe-source', caseName: 'R07-iframe-source', slots: { terminal: 'telemetry' }, src: 'telemetry', end: 'esc' },
  { name: 'R07-iframe', caseName: 'R07-ladder-control-iframe', slots: { output: 'control-iframe' }, src: 'control-b', end: 'iframe', ladder: true },
];

const SLOT_OF: Record<string, string> = { editor: 'control-a', terminal: 'control-b', output: 'control-c' };

VARIANTS.forEach((v) => {
  [1, 2].forEach((runNo) => {
    test(`${v.caseName}-run${runNo}`, async ({ lab, page }, info) => {
      await lab.open({ layout: 'locks', slots: v.slots });
      const slotOf = { ...SLOT_OF, ...v.slots };
      await seedAll(page, Object.values(slotOf));
      const { snap: before } = await shot(page, info, '01-before');
      const iframeSlot = Object.values(v.slots).find((s) => s.includes('iframe') || s.startsWith('telemetry'));
      const innerBefore = iframeSlot ? await readFrameMfe(page, iframeSlot) : null;
      const t0 = Date.now();
      const t = await begin(page, v.src);
      await t.teleport(await dropPoint(page, 'editor', 'left', 0));
      expect(await domTree(page)).toBe('H[nav,terminal,editor,output]');                     // 전제
      const hoverTree = await domTree(page);
      let underAtRelease: Awaited<ReturnType<typeof underCursor>> | null = null;
      let res;
      if (v.end === 'esc') {
        await shot(page, info, '02-mid');
        res = await t.cancelEsc();
      } else {
        const pt = v.end === 'nav' ? await handlePoint(page, 'nav')
          : v.end === 'iframe' ? await panelRect(page, 'output').then((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }))
          : await page.locator('[data-testid="workspace"]').boundingBox().then((b) => ({ x: (b?.x ?? 0) + 6, y: (b?.y ?? 0) + 6 }));
        await t.teleport(pt);
        await settle(page);
        underAtRelease = await underCursor(page, pt.x, pt.y);
        await shot(page, info, '02-mid');
        res = await t.release({ mode: 'settled' });
      }
      const midTree = res ? hoverTree : hoverTree;
      const { snap: after } = await shot(page, info, '03-after');
      const inv = await checkInvariants(page);
      const ds = deltas(before, after);
      const events = await eventsSince(page, t0);
      const drags = dragEvents(events);
      const lastOver = [...drags].reverse().find((e) => e.type === 'dragover');
      const dragendRecs = drags.filter((e) => e.type === 'dragend').map((e) => `${e.phase}/${e.target.panelId}/connected=${e.isConnected}`);
      const sawDragleave = drags.some((e) => e.type === 'dragleave');
      const midSnapTree = (await import('node:fs')).readFileSync(new URL(`../.artifacts/r07-locks-cancel/${info.title}/02-mid.snapshot.json`, import.meta.url), 'utf8');
      const midDom = JSON.parse(midSnapTree).dom.domTree as string;
      const innerAfter = iframeSlot ? await readFrameMfe(page, iframeSlot) : null;
      const treeSame = JSON.stringify(after.tree) === JSON.stringify(before.tree);
      const calls = after.calls.filter((c) => c.fn === 'onMovePanel').length;
      const out = ds[slotOf.output];
      const ed = ds[slotOf.editor];
      const term = ds[slotOf.terminal];
      const ideal = v.end === 'iframe' ? calls === 1 : treeSame && calls === 0 && inv.every((r) => r.pass) && out.cls === 'untouched' && ed.cls === 'untouched';
      const remountedOut = out.frame === 2;
      const pred = treeSame && calls === 0 && inv.every((r) => r.pass) && remountedOut && ed.moves === 1 && (v.end !== 'nav' || (res.underCursorAtDrop === 'locked' && res.dragendDropEffect === 'none' && !res.sawDrop))
        && (v.end !== 'esc' || v.src !== 'control-b' || dragendRecs.some((r) => r.startsWith('target') && r.endsWith('connected=false')));
      const [expected, predicted] = v.ladder ? [`(대조 사다리) ${TXT['R07-iframe'][0]}`, `(대조 사다리 control-iframe) ${TXT['R07-iframe'][1]}`] : TXT[v.name];
      await observe(page, info, {
        scenario: 'R07', caseName: v.caseName, runNo, expected, predicted,
        observed: `hover ${hoverTree}; 릴리스 직전 domTree ${midDom}${underAtRelease ? `, underCursor ${JSON.stringify(underAtRelease)}` : ''}; under(프로브)=${res.underCursorAtDrop}, sawDrop=${res.sawDrop}, dragendDropEffect=${res.dragendDropEffect}, dragleave=${sawDragleave}, 마지막 dragover=${lastOver ? `${lastOver.top ? 'top' : lastOver.frame}/${lastOver.target.panelId}` : '없음'}; dragend [${dragendRecs.join(', ')}]; 트리 불변=${treeSame}, onMovePanel ${calls}건; ${iframeSlot ? `${iframeSlot} loads ${innerBefore?.loads}→${innerAfter?.loads}; ` : ''}${invSummary(inv)}. 누적: ${fmtDeltas(ds)}`,
        verdict: ideal ? 'as-ideal' : pred ? 'as-predicted' : 'deviates', invariants: inv, since: t0,
        labels: iframeSlot === 'telemetry' ? { harness_fidelity: 'cross-origin iframe 위 CDP 마우스 드래그 이벤트 미전달(S9, HARNESS 부작용 #7)' } : {},
        extra: { deltas: ds, events: fmtEvents(drags), midTree, term },
      });
    });
  });
});
