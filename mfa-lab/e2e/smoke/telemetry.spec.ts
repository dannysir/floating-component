// B1-05 게이트: iframe 어댑터와 mfe-telemetry (컨테이너 유형 iframe). telemetry = 127.0.0.1:4304(same-site), telemetry-x = localhost:4304(cross-site).
import { test, expect } from '../helpers/fixtures';
import { settle } from '../helpers/settle';
import { readFrameMfe } from '../helpers/frames';

type Frames = Record<string, { kind: string; state: string; frameMounts: number; mirror?: { loads: number; docIds: string[] } }>;

const SLOTS = [
  { slot: 'telemetry', origin: 'http://127.0.0.1:4304' },
  { slot: 'telemetry-x', origin: 'http://localhost:4304' },
];

test('smoke telemetry: both iframe slots and control-iframe load exactly once', async ({ lab, page }) => {
  await lab.open({ layout: 'census', slots: { a: 'telemetry', b: 'telemetry-x', c: 'control-iframe' } });
  await settle(page);
  const frames = await page.evaluate(() => (window as unknown as { __fc: { frames: Frames } }).__fc.frames);
  await Promise.all(SLOTS.map(async ({ slot, origin }) => {
    const inner = await readFrameMfe(page, slot);
    expect(inner, `${slot} frame __mfe`).not.toBeNull();
    expect(inner?.loads).toBe(1);
    expect(inner?.kind).toBe('iframe');
    expect(frames[slot]).toMatchObject({ kind: 'iframe', state: 'ready', frameMounts: 1 });
    expect(frames[slot].mirror?.loads).toBe(1);
    expect(frames[slot].mirror?.docIds).toHaveLength(1);
    expect(frames[slot].mirror?.docIds[0]).toBe(inner?.docId);
    const docReqs = lab.requests.filter((r) => r.isNavigation && r.url.startsWith(`${origin}/?slot=${slot}&`));
    expect(docReqs, `${slot} document requests`).toHaveLength(1);
  }));
  const ctl = await readFrameMfe(page, 'control-iframe');
  expect(ctl?.loads).toBe(1);
  expect(frames['control-iframe']).toMatchObject({ kind: 'iframe', state: 'ready' });
  expect(frames['control-iframe'].mirror?.loads).toBe(1);
  expect(lab.consoleErrors()).toEqual([]);
  expect(lab.pageErrors).toEqual([]);
});
