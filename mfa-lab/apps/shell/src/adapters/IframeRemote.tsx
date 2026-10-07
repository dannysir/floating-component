// src/adapters/IframeRemote.tsx
import type { FrameMessage } from '@harbor/contract';
import { registry } from '../registry/registry';
import { mirrorLoaded, setFrameState } from '../instrumentation';
import { CONTROL_IFRAME_SRCDOC } from '../local/controlIframe';

const iframeRemotes = Object.entries(registry.remotes).filter(([, r]) => r.kind === 'iframe');
const allowedOrigins = new Set(iframeRemotes.map(([, r]) => r.origin));          // http://127.0.0.1:4304, http://localhost:4304
const knownSlots = new Set([...iframeRemotes.map(([slot]) => slot), 'control-iframe']);

const onMessage = (event: MessageEvent) => {
  // about:srcdoc 문서는 부모 origin을 물려받으므로 location.origin도 허용한다.
  const originOk = allowedOrigins.has(event.origin) || event.origin === window.location.origin;
  const d = event.data as Partial<FrameMessage> | null;
  if (!originOk || !d || d.harbor !== 1 || d.type !== 'mfe:loaded' || typeof d.slot !== 'string' || !knownSlots.has(d.slot)) return;
  if (!d.payload || typeof d.payload.docId !== 'string') return;
  mirrorLoaded(d.slot, d.payload.docId);
  setFrameState(d.slot, 'ready');
};
// wrapper가 리마운트되는 동안 온 메시지를 잃지 않도록 모듈 스코프에서 한 번만 건다.
window.addEventListener('message', onMessage);

const STYLE = { display: 'block', width: '100%', height: '100%', border: 0 } as const;

export const IframeRemote = ({ slot }: { slot: string }) => {
  if (slot === 'control-iframe') {
    return <iframe data-testid="iframe-control-iframe" title={slot} srcDoc={CONTROL_IFRAME_SRCDOC} style={STYLE} />;
  }
  const r = registry.remotes[slot];
  const src = `${r.origin}${r.entry}?slot=${encodeURIComponent(slot)}&parent=${encodeURIComponent(window.location.origin)}`;
  return <iframe data-testid={`iframe-${slot}`} title={slot} src={src} style={STYLE} />;
};
