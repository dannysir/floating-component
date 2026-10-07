export interface HarborBus {
  publish: (topic: string, payload: unknown) => void;
  subscribe: (topic: string, fn: (payload: unknown) => void) => () => void;
}
export interface InspectableBus extends HarborBus {
  subscriberCount: (topic: string) => number;
}
export interface PanelProps { slot: string; bus: HarborBus; }                 // kind "same-tree"
export interface MountContext { slot: string; bus: HarborBus; contract: 1; }  // kind "mount"
export type Mount = (el: HTMLElement, ctx: MountContext) => void;
export type Unmount = (el: HTMLElement) => void;
export interface FrameMessage {                                               // kind "iframe"
  harbor: 1;
  slot: string;
  type: 'mfe:loaded';
  payload: { loads: number; docId: string };
}
export type ProbeKind = 'local' | 'same-tree' | 'mount' | 'iframe';
export interface ProbeMeta {
  remote: string;            // 내용 코드를 소유한 쪽: 'shell' | 'orders' | 'board' | 'billing' | 'telemetry'
  kind?: ProbeKind;          // 생략하면 기존 값 유지, 처음이면 'same-tree'
  build: string;             // 이 코드를 번들한 빌드의 스탬프 (define __LAB_BUILD_STAMP__)
  reactVersion?: string;
  reactSame?: boolean | null;
}
export interface Probe {
  readonly state: Record<string, unknown>;        // 현재 window.__mfe[slot]
  mounted: () => number;                          // mounts +1, instanceSeq +1. 새 instanceSeq 반환
  unmounted: () => void;                          // unmounts +1
  bump: (key: string, by?: number) => void;       // 숫자 필드 증감 (mountCalls, unmountCalls, rootsAlive, loads ...)
  set: (patch: Record<string, unknown>) => void;  // 그 밖의 필드 (dnd, seen, docId ...)
}

export { createProbe } from './probe';
export { createBus } from './bus';
export { ensureStyle } from './style';
