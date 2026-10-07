import { test, expect } from '@playwright/test';

test('S0 browser gate', async ({ page, browser, browserName }, testInfo) => {
  expect(browserName).toBe('chromium');
  await page.setContent('<main style="font:24px sans-serif;padding:40px"><h1 id="t">Harbor S0</h1><div id="box" style="width:200px;height:200px;background:#0078d4"></div></main>');
  const png = testInfo.outputPath('s00-page.png');
  await page.screenshot({ path: png });                         // Read 도구로 직접 열어 글자가 보이는지 확인한다

  const rafPerSecond = await page.evaluate(() => new Promise<number>((resolve) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n += 1; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else resolve(n); };
    requestAnimationFrame(tick);
  }));
  expect(rafPerSecond).toBeGreaterThan(30);                     // 기대 약 60. 실측값을 SPIKE.md에 적는다

  const cdp = await page.context().newCDPSession(page);
  const version = await cdp.send('Browser.getVersion');
  expect(version.product).toContain('Chrome');                  // 예: "HeadlessChrome/153.0.8010.12"
  console.log(`[S0] ${version.product} raf/s=${rafPerSecond}`);

  // CDP touchStart가 trusted touchstart를 만드는가. touch 프로젝트에서는 단언, mouse 프로젝트에서는 기록만 (BRIEF-1 S0 행).
  // 터치 에뮬레이션이 꺼진 타깃(mouse 프로젝트)에서 Chromium이 Input.dispatchTouchEvent를 거부할 수 있다(미확인, 7.7절 함정).
  // 거부되면 예외가 나므로 try/catch로 감싼다. 감싸지 않으면 B1-01의 `--project mouse` 실행이 먼저 실패해 S0 게이트가 레인마다 헛되이 실패한다.
  await page.evaluate(() => { (window as unknown as { __ts: unknown[] }).__ts = []; window.addEventListener('touchstart', (e) => (window as unknown as { __ts: unknown[] }).__ts.push(e.isTrusted), { passive: true }); });
  let trusted: unknown = null;
  let cdpError: string | null = null;
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 140, y: 200, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    trusted = await page.evaluate(() => (window as unknown as { __ts: boolean[] }).__ts);
  } catch (e) {
    cdpError = String(e);
  }
  console.log(`[S0] touchstart trusted: ${JSON.stringify(trusted)} cdpError: ${cdpError ?? 'none'} (project ${testInfo.project.name}, browser ${browser.version()})`);
  if (testInfo.project.name === 'touch') {
    expect(cdpError).toBeNull();
    expect(trusted).toEqual([true]);
  }
});
