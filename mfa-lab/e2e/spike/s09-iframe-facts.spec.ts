// S9 (B1-05, 기록만): iframe 사실. (1) telemetry-x가 별도 CDP 타깃(OOPIF)인가 (2) 패널 드래그 중 커서가 same-site·cross-site iframe 위에
// 있을 때 dragover가 어느 프레임의 프로브에 찍히는가 (3) cross-site iframe 안에서 sessionStorage를 쓸 수 있는가 (4) 사용한 호스트 이름.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { panelRect } from '../helpers/geometry';
import { readProbe } from '../helpers/probe.init';
import { settle } from '../helpers/settle';
import { frameOfSlot, readFrameMfe } from '../helpers/frames';
import { checkInvariants } from '../helpers/invariants';

test('S9 iframe facts (record only)', async ({ lab, page, browser }) => {
  await lab.open({ layout: 'census', slots: { a: 'telemetry', b: 'telemetry-x', c: 'control-iframe', d: 'bare-3' } });
  await settle(page);

  // (1) OOPIF: 브라우저 CDP의 Target 목록
  const bcdp = await browser.newBrowserCDPSession();
  const { targetInfos } = await bcdp.send('Target.getTargets');
  const iframeTargets = targetInfos.filter((t) => t.type === 'iframe').map((t) => t.url);
  const oopifX = iframeTargets.some((u) => u.startsWith('http://localhost:4304'));
  const oopifSame = iframeTargets.some((u) => u.startsWith('http://127.0.0.1:4304'));

  // (3) cross-site iframe 안 sessionStorage
  const fx = await frameOfSlot(page, 'telemetry-x');
  const ss = fx ? await fx.evaluate(() => { try { sessionStorage.setItem('harbor.s9', '1'); return sessionStorage.getItem('harbor.s9') === '1'; } catch (e) { return String(e); } }) : 'no-frame';
  const fs = await frameOfSlot(page, 'telemetry');
  const ssSame = fs ? await fs.evaluate(() => { try { sessionStorage.setItem('harbor.s9', '1'); return sessionStorage.getItem('harbor.s9') === '1'; } catch (e) { return String(e); } }) : 'no-frame';

  // (2) 드래그 중 dragover가 찍히는 프레임
  const t0 = Date.now();
  const seenBefore = { tele: await readFrameMfe(page, 'telemetry'), x: await readFrameMfe(page, 'telemetry-x'), ctl: await readFrameMfe(page, 'control-iframe') };
  const drag = await begin(page, 'bare-3');
  const center = async (id: string) => { const r = await panelRect(page, id); return { x: r.x + r.width / 2, y: r.y + r.height / 2 + 20 }; };
  const visit = async (label: string, id: string) => {
    const t = Date.now();
    await drag.teleport(await center(id));
    await drag.nudge();
    const ev = (await readProbe(page, { since: t })).events.filter((e) => e.type.startsWith('drag'));
    return { label, events: ev.map((e) => `${e.type}/${e.phase}/${e.top ? 'top' : new URL(e.frame).host}/${e.target.panelId ?? e.target.tag}`) };
  };
  const overSame = await visit('telemetry (same-site)', 'p-a');
  const overCross = await visit('telemetry-x (cross-site)', 'p-b');
  const overCtl = await visit('control-iframe (srcdoc)', 'p-c');
  const rel = await drag.release({ mode: 'overShadow' });
  const seenAfter = { tele: await readFrameMfe(page, 'telemetry'), x: await readFrameMfe(page, 'telemetry-x'), ctl: await readFrameMfe(page, 'control-iframe') };
  const inv = await checkInvariants(page);
  const all = (await readProbe(page, { since: t0 })).events;
  const byFrame = all.filter((e) => e.type === 'dragover').reduce<Record<string, number>>((acc, e) => {
    const k = e.top ? 'top' : new URL(e.frame).host;
    return { ...acc, [k]: (acc[k] ?? 0) + (e.count ?? 1) };
  }, {});

  const obs = {
    browser: browser.version(),
    host: 'localhost',
    iframeTargets, oopifCrossSite: oopifX, oopifSameSite: oopifSame,
    sessionStorageCrossSite: ss, sessionStorageSameSite: ssSame,
    dragoverByFrame: byFrame,
    visits: [overSame, overCross, overCtl],
    seenInFrames: {
      telemetry: { before: seenBefore.tele?.seen, after: seenAfter.tele?.seen, loadsBefore: seenBefore.tele?.loads, loadsAfter: seenAfter.tele?.loads },
      telemetryX: { before: seenBefore.x?.seen, after: seenAfter.x?.seen, loadsBefore: seenBefore.x?.loads, loadsAfter: seenAfter.x?.loads },
      controlIframe: { before: seenBefore.ctl?.seen, after: seenAfter.ctl?.seen },
    },
    release: { under: rel.underCursorAtDrop, sawDrop: rel.sawDrop, dragend: rel.dragendDropEffect, tree: rel.snapshot.treeNotation },
    invariants: inv.map((r) => `${r.id}=${r.pass}${r.pass ? '' : `(${r.detail})`}`).join(' '),
  };
  console.log(`[S9] ${JSON.stringify(obs, null, 1)}`);
  test.info().annotations.push({ type: 'S9', description: JSON.stringify(obs) });
  expect(iframeTargets.length + 1).toBeGreaterThan(0);                     // 기록 전용
});
