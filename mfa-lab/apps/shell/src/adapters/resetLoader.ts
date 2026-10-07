// src/adapters/resetLoader.ts — 슬롯별 "캐시 비우기" 콜백 레지스트리. 어댑터가 모듈 스코프에서 등록한다.
const resetters = new Map<string, () => void>();
export const registerResetter = (slot: string, fn: () => void) => { resetters.set(slot, fn); };
export const resetLoader = (slot: string) => { resetters.get(slot)?.(); };
