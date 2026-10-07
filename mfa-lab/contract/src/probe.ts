import type { Probe, ProbeMeta } from './index';

type MfeWindow = Window & { __mfe?: Record<string, Record<string, unknown>> };

// 번들(모듈 인스턴스)마다 하나. 같은 번들 안에서 슬롯당 프로브는 하나다.
const probes = new Map<string, Probe>();

const definedOnly = (meta: ProbeMeta): Record<string, unknown> =>
  Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined));

export const createProbe = (slot: string, meta: ProbeMeta): Probe => {
  const existing = probes.get(slot);
  if (existing) {
    existing.set(definedOnly(meta));   // 뒤에 온 meta는 정의된 필드만 덮어쓴다
    return existing;
  }
  const win = window as MfeWindow;
  const read = (): Record<string, unknown> => win.__mfe?.[slot] ?? {};
  const write = (next: Record<string, unknown>) => {
    // 불변 갱신: 객체를 새로 만들어 전역에 다시 대입한다.
    win.__mfe = { ...(win.__mfe ?? {}), [slot]: next };
    win.dispatchEvent(new CustomEvent('harbor:probe', { detail: { slot } }));
  };
  // 다른 번들이 같은 슬롯을 먼저 만들었으면(있을 수 없어야 한다) 카운터를 이어받는다.
  write({
    slot, kind: 'same-tree', mounts: 0, unmounts: 0, instanceSeq: 0, reactVersion: null, reactSame: null,
    ...read(),
    ...definedOnly(meta),
  });
  const probe: Probe = {
    get state() {
      return read();
    },
    mounted: () => {
      const s = read();
      const seq = Number(s.instanceSeq ?? 0) + 1;
      write({ ...s, mounts: Number(s.mounts ?? 0) + 1, instanceSeq: seq });
      return seq;
    },
    unmounted: () => {
      const s = read();
      write({ ...s, unmounts: Number(s.unmounts ?? 0) + 1 });
    },
    bump: (key, by = 1) => {
      const s = read();
      write({ ...s, [key]: Number(s[key] ?? 0) + by });
    },
    set: (patch) => {
      write({ ...read(), ...patch });
    },
  };
  probes.set(slot, probe);
  return probe;
};
