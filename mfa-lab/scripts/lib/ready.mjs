// mfa-lab/scripts/lib/ready.mjs — 준비 판정 (상태 200 + 본문 검사).
// vite preview는 index.html이 있는 빌드에서 없는 경로에도 200과 index.html을 준다. 그래서 본문을 본다.
// 로컬 요청은 Node 내장 fetch로 한다(프록시 변수를 무시하므로 127.0.0.1에 직접 붙는다).
const META_RE = /<meta[^>]*name="harbor-app"[^>]*content="([^"]+)"/;

export const checkReady = async ({ url, kind, expect, buildId }) => {
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(3000) }).catch(() => null);
  if (!res) return { ok: false, why: 'no response' };
  if (res.status !== 200) return { ok: false, why: `status ${res.status}` };
  const body = await res.text();
  if (kind === 'manifest') {
    try {
      const j = JSON.parse(body);
      return j.name === expect ? { ok: true, manifest: j } : { ok: false, why: `manifest name ${j.name}` };
    } catch {
      return { ok: false, why: 'manifest is not JSON (probably index.html fallback)' };
    }
  }
  if (kind === 'module') return body.includes('mount') && body.includes('unmount') ? { ok: true } : { ok: false, why: 'no mount/unmount in body' };
  const m = META_RE.exec(body);
  if (!m) return { ok: false, why: 'no harbor-app meta' };
  const want = buildId ? `${expect}@${buildId}` : `${expect}@`;
  return (buildId ? m[1] === want : m[1].startsWith(want)) ? { ok: true, content: m[1], body } : { ok: false, why: `meta ${m[1]} != ${want}` };
};

export const waitReady = async (target, { timeoutMs = 60000, intervalMs = 250 } = {}) => {
  const t0 = Date.now();
  const loop = async (last) => {
    if (Date.now() - t0 >= timeoutMs) return last;
    const r = await checkReady(target);
    if (r.ok) return r;
    await new Promise((res) => setTimeout(res, intervalMs));
    return loop(r);
  };
  return loop({ ok: false, why: 'not polled' });
};
