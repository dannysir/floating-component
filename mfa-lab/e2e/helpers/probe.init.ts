import type { BrowserContext, Page } from '@playwright/test';

export interface ProbeEvent {
  seq: number; eid: number; t: number; wall: number; frame: string; top: boolean; type: string;
  phase: 'capture' | 'bubble' | 'target';
  target: { tag: string; testid: string | null; panelId: string | null; droppable: boolean | null };
  isTrusted: boolean; isConnected: boolean; defaultPrevented: boolean; x: number; y: number;
  pointerType?: string; dropEffect?: string; effectAllowed?: string; types?: string[]; stopped?: boolean;
  count?: number; tLast?: number;
}
export interface ProbeDump { events: ProbeEvent[]; domMoves: Record<string, number>; domLog: Array<{ seq: number; t: number; panelId: string; kind: string; elementSeq: number }> }

// 페이지 안에서 실행된다. 바깥을 참조하지 않는다.
const probeScript = () => {
  const TYPES = ['dragstart', 'dragenter', 'dragover', 'dragleave', 'drop', 'dragend',
    'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture',
    'touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mousemove', 'mouseup', 'contextmenu', 'selectstart'];
  const COALESCE = new Set(['dragover', 'pointermove', 'mousemove', 'touchmove']);
  const events: Record<string, unknown>[] = [];
  const domLog: Record<string, unknown>[] = [];
  const domMoves: Record<string, number> = {};
  let seq = 0; let eid = 0; let elementSeqCounter = 0;
  const eids = new WeakMap<Event, number>();
  const elementSeq = new WeakMap<Element, number>();
  const seenIds = new Set<string>();
  const removedRecently = new Set<Element>();

  const describe = (e: Event) => {
    const path = (e.composedPath?.() ?? []) as Element[];
    const first = (sel: string) => path.find((n) => n instanceof Element && n.matches(sel)) as Element | undefined;
    const panel = first('[data-panel-id]');
    const t = e.target as Element | null;
    return {
      tag: t instanceof Element ? t.tagName : String(t?.constructor?.name ?? ''),
      testid: first('[data-testid]')?.getAttribute('data-testid') ?? null,
      panelId: panel?.getAttribute('data-panel-id') ?? null,
      droppable: panel ? panel.getAttribute('data-panel-droppable') !== 'false' : null,
    };
  };
  const record = (e: Event, phase: string) => {
    if (!eids.has(e)) eids.set(e, ++eid);
    const dt = (e as DragEvent).dataTransfer;
    const touch = (e as TouchEvent).changedTouches?.[0];
    const rec: Record<string, unknown> = {
      seq: ++seq, eid: eids.get(e), t: performance.now(), wall: Date.now(), frame: location.href, top: window === window.top,
      type: e.type, phase, target: describe(e), isTrusted: e.isTrusted,
      isConnected: (e.target as Node | null)?.isConnected ?? false, defaultPrevented: e.defaultPrevented,
      x: (e as MouseEvent).clientX ?? touch?.clientX ?? NaN, y: (e as MouseEvent).clientY ?? touch?.clientY ?? NaN,
      pointerType: (e as PointerEvent).pointerType,
      ...(dt ? { dropEffect: dt.dropEffect, effectAllowed: dt.effectAllowed, types: Array.from(dt.types) } : {}),
    };
    const last = events[events.length - 1];
    if (last && COALESCE.has(e.type) && last.type === e.type && last.phase === phase && last.frame === rec.frame
      && JSON.stringify(last.target) === JSON.stringify(rec.target) && last.defaultPrevented === rec.defaultPrevented && last.dropEffect === rec.dropEffect) {
      last.count = Number(last.count ?? 1) + 1; last.tLast = rec.t; last.xLast = rec.x; last.yLast = rec.y;   // 연속 이동 이벤트는 합친다
      return;
    }
    events.push(rec);
  };
  // 종료 이벤트는 시퀀스를 시작한 원본 요소로 간다. 원본이 분리되면 window까지 오지 않으므로 대상 자체에 건다.
  const attachEnd = (target: EventTarget, types: string[]) => {
    types.forEach((type) => target.addEventListener(type, (e) => record(e, 'target'), { once: true, passive: true }));
  };
  TYPES.forEach((type) => {
    window.addEventListener(type, (e) => {
      record(e, 'capture');
      if (type === 'dragstart' && e.target) attachEnd(e.target, ['dragend']);
      if (type === 'touchstart' && e.target) attachEnd(e.target, ['touchend', 'touchcancel']);
    }, { capture: true, passive: true });
    window.addEventListener(type, (e) => record(e, 'bubble'), { capture: false, passive: true });
  });

  // DOM 이동 로그: 부모가 [data-tree-root] 안인 추가·제거 서브트리의 모든 [data-panel-id] 요소를 요소 동일성으로 추적
  const panelsIn = (node: Node): Element[] => {
    if (!(node instanceof Element)) return [];
    const list = Array.from(node.querySelectorAll('[data-panel-id]'));
    return node.hasAttribute('data-panel-id') ? [node, ...list] : list;
  };
  const idOf = (el: Element) => { if (!elementSeq.has(el)) elementSeq.set(el, ++elementSeqCounter); return elementSeq.get(el)!; };
  const log = (panelId: string, kind: string, el: Element) => domLog.push({ seq: domLog.length + 1, t: performance.now(), panelId, kind, elementSeq: idOf(el) });
  new MutationObserver((muts) => {
    muts.forEach((m) => {
      // 최초 렌더는 트리 루트째 #root에 붙으므로 대상이 루트 밖이어도 받는다. 추가는 [data-tree-root] 안의 패널만(ghost 복제 제외),
      // 제거는 부모가 트리 안이었던 것만 센다.
      const inTree = m.target instanceof Element && m.target.closest('[data-tree-root]') !== null;
      if (inTree) m.removedNodes.forEach((n) => panelsIn(n).forEach((el) => { removedRecently.add(el); log(el.getAttribute('data-panel-id')!, 'removed', el); }));
      m.addedNodes.forEach((n) => panelsIn(n).filter((el) => el.closest('[data-tree-root]') !== null).forEach((el) => {
        const id = el.getAttribute('data-panel-id')!;
        if (removedRecently.has(el)) { removedRecently.delete(el); domMoves[id] = (domMoves[id] ?? 0) + 1; log(id, 'reinserted', el); }   // 같은 요소가 돌아왔다
        else if (seenIds.has(id)) log(id, 'remounted', el);                                                                            // 같은 id, 다른 요소
        else { seenIds.add(id); log(id, 'added', el); }
      }));
    });
  }).observe(document, { childList: true, subtree: true });

  const dump = (since = 0) => {
    const out = events.filter((e) => Number(e.wall) >= since).map((e) => ({ ...e }));
    const bubbleEids = new Set(out.filter((e) => e.phase === 'bubble').map((e) => e.eid));
    out.forEach((e) => { if (e.phase === 'capture' && !bubbleEids.has(e.eid)) e.stopped = true; });   // capture에서 봤는데 bubble이 없다 → 누군가 전파를 멈췄다
    return { events: out, domMoves: { ...domMoves }, domLog: domLog.map((l) => ({ ...l })) };
  };
  (window as unknown as { __probe: unknown }).__probe = { events, domMoves, domLog, dump, seqOf: (el: Element) => idOf(el), reset: () => { events.length = 0; domLog.length = 0; Object.keys(domMoves).forEach((k) => delete domMoves[k]); } };
};

export const installProbe = (context: BrowserContext) => context.addInitScript(probeScript);

export const readProbe = async (page: Page, opts: { since?: number } = {}): Promise<ProbeDump> => {
  const parts = await Promise.all(page.frames().map((f) =>
    f.evaluate((since) => (window as unknown as { __probe?: { dump: (s: number) => ProbeDump } }).__probe?.dump(since) ?? null, opts.since ?? 0).catch(() => null)));
  const dumps = parts.filter((p): p is ProbeDump => p !== null);
  return {
    events: dumps.flatMap((d) => d.events).sort((a, b) => a.wall - b.wall || a.seq - b.seq),
    domMoves: Object.assign({}, ...dumps.map((d) => d.domMoves)),
    domLog: dumps.flatMap((d) => d.domLog),
  };
};

export const resetProbe = (page: Page) => Promise.all(page.frames().map((f) => f.evaluate(() => (window as unknown as { __probe?: { reset: () => void } }).__probe?.reset()).catch(() => undefined)));
