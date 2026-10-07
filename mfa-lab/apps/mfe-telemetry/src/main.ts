import registry from '../../../registry.json';

declare const __LAB_BUILD_STAMP__: string;
type Seen = { dragenter: number; dragover: number; drop: number; pointermove: number; touchstart: number };
type MfeWindow = Window & { __mfe?: Record<string, Record<string, unknown>> };

const params = new URLSearchParams(location.search);
const slot = params.get('slot') ?? 'telemetry';
const parent = params.get('parent') ?? '';
// postMessage 허용 목록: shell과 baseline의 origin (registry.json에서 만든다)
const allowedParents = new Set<string>([registry.shell.origin, ...Object.values(registry.baseline).map((b) => b.origin)]);

// 로드 수: 문서가 다시 로드되면 모듈 상태가 사라지므로 sessionStorage에 둔다. cross-site 프레임에서는 막힐 수 있다 → try/catch.
const key = `harbor.loads.${slot}`;
const readLoads = (): number => { try { return Number(sessionStorage.getItem(key) ?? '0'); } catch { return 0; } };
const writeLoads = (n: number) => { try { sessionStorage.setItem(key, String(n)); } catch { /* 저장 불가: mirror와 요청 로그가 대신 센다 */ } };
const loads = readLoads() + 1;
writeLoads(loads);
const docId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let seen: Seen = { dragenter: 0, dragover: 0, drop: 0, pointermove: 0, touchstart: 0 };
const publish = () => {
  const w = window as MfeWindow;
  w.__mfe = { ...(w.__mfe ?? {}), [slot]: { slot, kind: 'iframe', build: __LAB_BUILD_STAMP__, loads, docId, loadedAt: Date.now(), seen: { ...seen } } };
  document.getElementById('seen')!.textContent = `de${seen.dragenter} do${seen.dragover} dr${seen.drop} pm${seen.pointermove} ts${seen.touchstart}`;
};
const bump = (k: keyof Seen) => { seen = { ...seen, [k]: seen[k] + 1 }; publish(); };

// 수동 카운터. preventDefault를 절대 부르지 않는다 (부르면 iframe이 드롭 대상이 되어 R07·R12의 뜻이 바뀐다).
(['dragenter', 'dragover', 'drop'] as const).forEach((t) => window.addEventListener(t, () => bump(t), { capture: true, passive: true }));
window.addEventListener('pointermove', () => bump('pointermove'), { passive: true });
window.addEventListener('touchstart', () => bump('touchstart'), { passive: true });

document.querySelector('[data-testid="tele-loads"]')!.textContent = String(loads);
document.getElementById('doc')!.textContent = docId.slice(0, 8);
const scroll = document.getElementById('scroll')!;
Array.from({ length: 100 }, (_, i) => i).forEach((i) => {
  const row = document.createElement('div'); row.textContent = `metric ${i}`; row.style.height = '20px'; scroll.appendChild(row);
});
const ctx = (document.querySelector('[data-testid="tele-canvas"]') as HTMLCanvasElement).getContext('2d');
let t = 0;
const frame = () => { if (ctx) { ctx.clearRect(0, 0, 160, 40); ctx.fillStyle = '#0078d4'; ctx.fillRect((t * 2) % 160, 10, 8, 20); } t += 1; requestAnimationFrame(frame); };
requestAnimationFrame(frame);
publish();

if (window.parent !== window && allowedParents.has(parent)) {
  window.parent.postMessage({ harbor: 1, slot, type: 'mfe:loaded', payload: { loads, docId } }, parent);
}
