// 이벤트 로그 보조: 드래그 이벤트만 고르기, 한 줄 요약.
import type { ProbeEvent } from './probe.init';

export const DRAG_TYPES = new Set(['dragstart', 'dragenter', 'dragover', 'dragleave', 'drop', 'dragend']);
export const dragEvents = (events: ProbeEvent[]) => events.filter((e) => DRAG_TYPES.has(e.type));
export const fmtEvents = (events: ProbeEvent[]) => events.map((e) =>
  `${e.type}/${e.phase}/${e.target.panelId ?? e.target.tag}${e.count ? `x${e.count}` : ''}${e.dropEffect !== undefined ? `[${e.dropEffect}]` : ''}${e.phase === 'target' ? `(connected=${e.isConnected})` : ''}`).join(' ');
