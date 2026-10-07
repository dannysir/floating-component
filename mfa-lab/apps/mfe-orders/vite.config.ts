import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const registry = JSON.parse(readFileSync(here('../../registry.json'), 'utf8'));

const NAME = 'orders';                                  // mfe-board: 'board'. registry.remotes의 키이자 MF name
const me = registry.remotes[NAME];
const ORIGIN: string = me.origin;                       // http://127.0.0.1:4301
const PORT = Number(new URL(ORIGIN).port);
const stamp = process.env.LAB_BUILD_STAMP ?? 'dev';
const mf = process.env.LAB_MF ?? 'on';

const reactShared = { singleton: true, requiredVersion: `^${registry.pins.react}` };
const shared = { react: reactShared, 'react/': reactShared, 'react-dom': reactShared, 'react-dom/': reactShared };

const harborMeta = (app: string, buildId: string): Plugin => ({
  name: 'harbor-meta',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'harbor-app', content: `${app}@${buildId}` }, injectTo: 'head' }],
});

export default defineConfig({
  base: `${ORIGIN}/`,                                   // 절대 base: remoteEntry가 가리키는 청크 URL이 host origin에서도 풀리게 한다
  plugins: [
    react(),
    harborMeta(me.app, stamp),                          // 'mfe-orders'
    ...(mf === 'on'
      ? [federation({
          name: NAME,
          filename: 'remoteEntry.js',                   // 기본값은 'remoteEntry-[hash]' — 반드시 명시
          manifest: true,                               // 기본값은 없음 — 반드시 명시. /mf-manifest.json 이 준비 확인 URL이다
          dts: false,
          exposes: { './Panel': './src/Panel.tsx' },
          shared,
          shareStrategy: registry.federation.shareStrategy,   // 'loaded-first' (host와 같게)
        })]
      : []),
  ],
  resolve: { alias: { '@harbor/contract': here('../../contract/src/index.ts') } },
  define: { __LAB_BUILD_STAMP__: JSON.stringify(stamp) },
  server: { host: '127.0.0.1', port: PORT, strictPort: true, origin: ORIGIN },
  preview: { host: '127.0.0.1', port: PORT, strictPort: true },
  build: { target: 'chrome89' },                        // 공유 모듈이 top-level await로 로드된다 (Vite 통합 문서)
});
