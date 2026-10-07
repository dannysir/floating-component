// 불변식 I1~I7. 제스처가 끝난 뒤 settle을 거쳐 검사한다. 규칙: doc/qa/mfa/HARNESS.md 「불변식」
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { readDomTree, treeNotation } from './geometry';
import { labStateOf } from './labstate';
import { settle } from './settle';

export type InvariantId = 'I1' | 'I2' | 'I3' | 'I4' | 'I5' | 'I6' | 'I7';
export type AllowList = { [id in InvariantId]?: Array<string | RegExp> };
export interface Violation { key: string; message: string }
export interface InvariantResult { id: InvariantId; pass: boolean; detail: string; violations: Violation[]; allowed: Violation[] }

// 페이지 안에서 실행: I1·I2·I3·I5 재료와 I7 재료를 한 번에 읽는다.
const readInvariantState = () => {
  type N = { type: string; componentKey?: string; children?: N[] };
  const w = window as unknown as {
    __fc?: { getTree: () => N; frames: Record<string, { kind: string; frameMounts: number; frameUnmounts: number }> };
    __mfe?: Record<string, { kind?: string; mounts?: number; unmounts?: number; rootsAlive?: number }>;
  };
  const slots = (n: N | undefined): string[] => (!n ? [] : n.type === 'panel' ? [n.componentKey ?? ''] : (n.children ?? []).flatMap(slots));
  const tree = w.__fc?.getTree();
  return {
    dragging: Array.from(document.querySelectorAll('[data-tree-root][data-dragging-panel-id]')).map((el) => (el as HTMLElement).dataset.draggingPanelId ?? '?'),
    shadows: Array.from(document.querySelectorAll('[data-tree-root] [data-panel-id]')).filter((el) => {
      const s = (el as HTMLElement).style;
      return s.opacity === '0.5' && s.outlineStyle === 'dashed';
    }).map((el) => el.getAttribute('data-panel-id') ?? '?'),
    ghosts: Array.from(document.querySelectorAll('body > [style*="z-index: 9999"]')).filter((el) => {
      const s = (el as HTMLElement).style;
      return s.position === 'fixed' && s.pointerEvents === 'none';
    }).length,
    bodyUserSelect: document.body.style.userSelect,
    tree,
    slots: slots(tree),
    frames: w.__fc?.frames ?? {},
    mfe: w.__mfe ?? {},
    iframeCounts: Object.fromEntries(slots(tree).map((s) => [s, document.querySelectorAll(`[data-tree-root] iframe[data-testid="iframe-${s}"]`).length])),
  };
};

const matches = (v: Violation, allow: Array<string | RegExp> = []) =>
  allow.some((a) => (typeof a === 'string' ? v.key === a || v.message.includes(a) : a.test(v.key) || a.test(v.message)));

const result = (id: InvariantId, violations: Violation[], allow: AllowList, okDetail: string): InvariantResult => {
  const allowed = violations.filter((v) => matches(v, allow[id]));
  const real = violations.filter((v) => !matches(v, allow[id]));
  return { id, pass: real.length === 0, detail: violations.length ? violations.map((v) => v.message).join('; ') : okDetail, violations: real, allowed };
};

export const checkInvariants = async (page: Page, opts: { allow?: AllowList; skipSettle?: boolean } = {}): Promise<InvariantResult[]> => {
  const allow = opts.allow ?? {};
  if (!opts.skipSettle) await settle(page);
  const s = await page.evaluate(readInvariantState);
  const dom = await page.evaluate(readDomTree);
  const state = labStateOf(page);
  const baseUserSelect = state?.bodyUserSelect() ?? '';

  // I7: iframe 문서 수 (슬롯별로 읽히는 문서가 정확히 1개)
  const iframeDocs = Object.fromEntries(await Promise.all(Object.entries(s.iframeCounts).filter(([, n]) => n > 0).map(async ([slot]) => {
    const handles = await page.locator(`[data-tree-root] iframe[data-testid="iframe-${slot}"]`).elementHandles();
    const readable = await Promise.all(handles.map(async (h) => {
      const f = await h.contentFrame();
      return f ? f.evaluate((sl) => Boolean((window as unknown as { __mfe?: Record<string, unknown> }).__mfe?.[sl]), slot).catch(() => false) : false;
    }));
    return [slot, readable.filter(Boolean).length] as const;
  })));

  const i7: Violation[] = s.slots.flatMap((slot) => {
    const out: Violation[] = [];
    const f = s.frames[slot];
    if (f && f.frameMounts - f.frameUnmounts !== 1) out.push({ key: slot, message: `${slot}: frame alive ${f.frameMounts - f.frameUnmounts}` });
    const m = s.mfe[slot];
    if (m && m.kind !== 'iframe') {
      const alive = Number(m.mounts ?? 0) - Number(m.unmounts ?? 0);
      if (alive !== 1) out.push({ key: slot, message: `${slot}: content alive ${alive}` });
      if (m.kind === 'mount' && Number(m.rootsAlive ?? 0) !== 1) out.push({ key: slot, message: `${slot}: rootsAlive ${m.rootsAlive}` });
    }
    if (f?.kind === 'iframe') {
      if (s.iframeCounts[slot] !== 1) out.push({ key: slot, message: `${slot}: iframe elements ${s.iframeCounts[slot]}` });
      if ((iframeDocs[slot] ?? 0) !== 1) out.push({ key: slot, message: `${slot}: readable iframe docs ${iframeDocs[slot] ?? 0}` });
    }
    return out;
  });

  const consoleErrors = (state?.console ?? []).filter((c) => c.type === 'error').map((c) => ({ key: c.url, message: `console.error: ${c.text}` }));
  const pageErrors = (state?.pageErrors ?? []).map((e) => ({ key: 'pageerror', message: `pageerror: ${e.split('\n')[0]}` }));
  const notation = treeNotation(s.tree as Parameters<typeof treeNotation>[0]);

  return [
    result('I1', s.dragging.map((id) => ({ key: id, message: `data-dragging-panel-id=${id} remains` })), allow, 'no data-dragging-panel-id'),
    result('I2', s.shadows.map((id) => ({ key: id, message: `shadow style remains on ${id}` })), allow, 'no shadow style'),
    result('I3', s.ghosts > 0 ? [{ key: 'ghost', message: `${s.ghosts} ghost(s) remain` }] : [], allow, 'no ghost'),
    result('I4', s.bodyUserSelect !== baseUserSelect ? [{ key: 'userSelect', message: `body.style.userSelect=${JSON.stringify(s.bodyUserSelect)} != ${JSON.stringify(baseUserSelect)}` }] : [], allow, 'userSelect restored'),
    result('I5', dom !== notation ? [{ key: 'domTree', message: `domTree ${dom} != tree ${notation}` }] : [], allow, `domTree = tree = ${notation}`),
    result('I6', [...consoleErrors, ...pageErrors], allow, 'no console errors'),
    result('I7', i7, allow, `one live instance per slot (${s.slots.join(',')})`),
  ];
};

export const expectInvariants = async (page: Page, opts: { allow?: AllowList } = {}): Promise<InvariantResult[]> => {
  const res = await checkInvariants(page, opts);
  res.forEach((r) => expect(r.pass, `${r.id}: ${r.detail}`).toBe(true));
  return res;
};
