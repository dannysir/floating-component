// R12 귀속 사다리 4단계(하네스 점검): OOPIF(telemetry-x, --site-per-process) 위에서 mouse.up 하면 dragend가 오지 않고 드래그 세션이 멈춘다.
// 같은 절차를 사이트 격리 없이 실행하는 대조는 r12c-oopif-release-nospp.spec.ts. 기록만 한다(단언 없음).
import { test } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, handlePoint } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { eventsSince } from '../helpers/explore';
import { dragEvents, fmtEvents } from '../helpers/events';

const run = (label: string) => test(label, async ({ lab, page }) => {
  await lab.open({ layout: 'row3', slots: { a: 'control-a', b: 'telemetry', c: 'telemetry-x' }, flags: { iframeShield: '0' } });
  const t0 = Date.now();
  const a = await begin(page, 'control-a');
  await a.teleport(await dropPoint(page, 'p-c', 'left', 0));
  await a.nudge();
  await page.mouse.up(); await settle(page);
  const attr = () => page.evaluate(() => document.querySelector('[data-tree-root]')?.getAttribute('data-dragging-panel-id') ?? null);
  console.log(`[diag ${label}] targets=${page.frames().length} after up: attr=${await attr()} ev=${fmtEvents(dragEvents(await eventsSince(page, t0)))}`);
  const t1 = Date.now();
  const h = await handlePoint(page, 'control-a');
  await page.mouse.move(h.x, h.y); await page.mouse.move(h.x + 2, h.y); await settle(page);
  console.log(`[diag ${label}] after move back: attr=${await attr()} ev=${fmtEvents(dragEvents(await eventsSince(page, t1)))}`);
  const t2 = Date.now();
  await page.mouse.up(); await settle(page);
  console.log(`[diag ${label}] after 2nd up: attr=${await attr()} ev=${fmtEvents(dragEvents(await eventsSince(page, t2)))}`);
  await page.keyboard.press('Escape'); await settle(page);
  console.log(`[diag ${label}] after Esc: attr=${await attr()}`);
});

run('spp');
