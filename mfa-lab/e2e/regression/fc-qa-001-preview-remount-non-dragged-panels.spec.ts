// FC-QA-001 회귀 스펙: 이상적 동작(드래그하지 않은 패널은 hover·Esc에서 리마운트되지 않는다)을 단언한다. 버그가 있는 동안 test.fail().
// 두 제스처를 따로 둔다: (a) 형제 인덱스 이동, (b) 부모 변경(루트 감싸기). 둘 다 "예상과 달리 통과"해야 수정 완료다.
import { test, expect } from '../helpers/fixtures';
import { begin } from '../helpers/mouseDrag';
import { dropPoint, domTree } from '../helpers/geometry';
import { settle } from '../helpers/settle';

type Frames = Record<string, { frameMounts: number; frameUnmounts: number }>;
type Mfe = Record<string, { mounts?: number; unmounts?: number }>;
const read = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const w = window as unknown as { __fc: { frames: Frames }; __mfe: Mfe };
  return { frames: w.__fc.frames, mfe: w.__mfe };
});

const CASES = [
  { name: '(a) sibling index shift: p-d -> (p-a, left, 1)', anchor: 'p-a', pos: 'left' as const, depth: 1, preview: 'H[p-d,p-a,V[p-b,p-c]]', watch: ['control-b', 'control-c'] },
  { name: '(b) parent change, root wrap: p-d -> (p-a, top, 2)', anchor: 'p-a', pos: 'top' as const, depth: 2, preview: 'V[p-d,H[p-a,V[p-b,p-c]]]', watch: ['control-a', 'control-b', 'control-c'] },
];

CASES.forEach((c) => {
  test(`FC-QA-001 ${c.name}: non-dragged panels are not remounted on hover + Esc`, { annotation: { type: 'issue', description: 'FC-QA-001' } }, async ({ lab, page }) => {
    test.fail();   // 버그가 있는 동안 이 테스트는 실패해야 한다
    await lab.open({ layout: 'census' });
    await settle(page);
    const before = await read(page);
    const d = await begin(page, 'control-d');
    await d.teleport(await dropPoint(page, c.anchor, c.pos, c.depth));
    const preview = await domTree(page);
    await d.cancelEsc();
    await settle(page);
    const after = await read(page);
    expect.soft(preview, 'precondition: preview tree').toBe(c.preview);
    c.watch.forEach((slot) => {
      expect(after.frames[slot].frameMounts - before.frames[slot].frameMounts, `${slot} frameMounts`).toBe(0);
      expect(after.frames[slot].frameUnmounts - before.frames[slot].frameUnmounts, `${slot} frameUnmounts`).toBe(0);
      expect(Number(after.mfe[slot]?.mounts ?? 0) - Number(before.mfe[slot]?.mounts ?? 0), `${slot} mounts`).toBe(0);
    });
  });
});
