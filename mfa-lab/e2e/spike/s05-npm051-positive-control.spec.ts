// S5 (B1-03c, 양성 대조): S3과 같은 동작을 npm 0.5.1로 빌드한 shell(:4390)에서 한다.
// 0.5.1은 dragend를 루트의 React onDragEnd로 받으므로, 미리보기가 소스를 리마운트한 뒤 Esc하면 분리된 원본으로 간 dragend가
// 루트에 닿지 않아 I1(남은 data-dragging-panel-id)·I2(남은 shadow)가 실패해야 한다. 둘 다 통과하면 BLOCKED-ORACLE.
// 스펙은 "불변식이 실패함"을 단언한다. 전제(lib.source === 'npm051', 미리보기 중 소스 리마운트)가 깨지면 S5는 무효다.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint } from '../helpers/geometry';
import { readProbe } from '../helpers/probe.init';
import { settle } from '../helpers/settle';
import { writeBaseline } from '../helpers/baseline';
import { checkInvariants } from '../helpers/invariants';
import { dragEvents, fmtEvents } from '../helpers/events';

test('S5 npm 0.5.1 keeps preview after Esc on remounted source (I1/I2 must fail)', async ({ lab, page }) => {
  const opened = await lab.open({ layout: 'locks', origin: 'baseline' });
  expect(opened.lib.source).toBe('npm051');                                     // 전제 1
  await settle(page);
  const t0 = Date.now();

  const drag = await begin(page, 'control-b');
  const hover = await drag.teleport(await dropPoint(page, 'editor', 'left', 0));
  expect(hover.dom.domTree).toBe('H[nav,terminal,editor,output]');               // 전제 2: 소스가 부모를 바꿨다
  const remounted = hover.counters.domLog.some((l) => (l as { panelId: string; kind: string }).panelId === 'terminal' && (l as { kind: string }).kind === 'remounted');
  expect(remounted, 'precondition: preview remounted the source').toBe(true);

  const during = await checkInvariants(page);                                    // 드래그 중에는 I1·I2 선택자가 상태를 잡아야 한다
  expect(during.find((r) => r.id === 'I1')?.pass, 'I1 selector sees drag state at :4390').toBe(false);
  expect(during.find((r) => r.id === 'I2')?.pass, 'I2 selector sees shadow at :4390').toBe(false);

  await drag.cancelEsc();
  const events = (await readProbe(page, { since: t0 })).events;
  const ends = events.filter((e) => e.type === 'dragend');
  console.log(`[S5] dragend: ${fmtEvents(ends)}`);
  expect(ends.some((e) => e.phase === 'target' && e.isConnected === false), 'dragend went to the detached source').toBe(true);

  const res = await checkInvariants(page);
  const i1 = res.find((r) => r.id === 'I1');
  const i2 = res.find((r) => r.id === 'I2');
  console.log(`[S5] after Esc: I1 pass=${i1?.pass} (${i1?.detail}); I2 pass=${i2?.pass} (${i2?.detail})`);
  console.log(`[S5] all: ${res.map((r) => `${r.id}=${r.pass}`).join(' ')}`);
  expect(i1?.pass === false || i2?.pass === false, 'positive control: I1 or I2 must fail on npm 0.5.1').toBe(true);
  test.info().annotations.push({ type: 'S5', description: `I1 fail=${!i1?.pass}, I2 fail=${!i2?.pass}` });

  writeBaseline('s05', events);
  console.log(`[S5] ${fmtEvents(dragEvents(events))}`);
});
