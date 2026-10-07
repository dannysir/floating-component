import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const registry = JSON.parse(readFileSync(here('../../registry.json'), 'utf8'));
const PORT = Number(new URL(registry.remotes.telemetry.origin).port);   // 4304
const stamp = process.env.LAB_BUILD_STAMP ?? 'dev';

const harborMeta = (app: string, buildId: string): Plugin => ({
  name: 'harbor-meta',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'harbor-app', content: `${app}@${buildId}` }, injectTo: 'head' }],
});

export default defineConfig({
  plugins: [harborMeta('mfe-telemetry', stamp)],
  define: { __LAB_BUILD_STAMP__: JSON.stringify(stamp) },
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
  preview: { host: '127.0.0.1', port: PORT, strictPort: true },
  // localhost 대신 crosssite.test를 쓰는 대안(B1-05 사다리)에서만: preview: { ..., allowedHosts: ['crosssite.test'] }
});
