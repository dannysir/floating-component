// FC-QA-002 회귀 스펙: 드래그하지 않은 패널은 미리보기 때문에 DOM에서 떼였다 다시 붙지 않는다(스크롤 위치 유지). 버그가 있는 동안 test.fail().
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree } from '../helpers/geometry';
import { settle } from '../helpers/settle';
import { seedContent, snapshot } from '../helpers/snapshot';

test('FC-QA-002 census hover p-d -> (p-a, left, 1): p-a keeps its DOM node and scrollTop', { annotation: { type: 'issue', description: 'FC-QA-002' } }, async ({ lab, page }) => {
  test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
  await lab.open({ layout: 'census' });
  await seedContent(page, 'control-a');
  await settle(page);
  const before = await snapshot(page, 'before');
  const d = await begin(page, 'control-d');
  await d.teleport(await dropPoint(page, 'p-a', 'left', 1));
  expect.soft(await domTree(page), 'precondition: preview tree').toBe('H[p-d,p-a,V[p-b,p-c]]');
  const mid = await snapshot(page, 'mid');
  await d.cancelEsc();
  expect(Number(mid.counters.domMoves['p-a'] ?? 0) - Number(before.counters.domMoves['p-a'] ?? 0), 'p-a domMoves').toBe(0);
  expect(mid.content['control-a'].scrollTop, 'control-a scrollTop').toBe(120);
});
