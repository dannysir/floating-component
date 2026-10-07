import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const registry = JSON.parse(readFileSync(here('../../registry.json'), 'utf8'));
const me = registry.remotes.billing;
const PORT = Number(new URL(me.origin).port);          // 4303
const stamp = process.env.LAB_BUILD_STAMP ?? 'dev';

export default defineConfig({
  plugins: [react()],                                   // harborMeta 없음: lib 모드는 index.html을 변환하지 않는다. public/index.html에 고정값을 적는다
  resolve: { alias: { '@harbor/contract': here('../../contract/src/index.ts') } },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),   // lib 모드는 process.env.*를 치환하지 않는다. 없으면 브라우저에서 "process is not defined"
    __LAB_BUILD_STAMP__: JSON.stringify(stamp),
  },
  build: {
    target: 'chrome89',
    lib: {
      entry: here('src/remote-entry.tsx'),
      formats: ['es'],
      fileName: () => 'remote-entry.js',                // 함수 형태. 문자열 'remote-entry.js'를 주면 'remote-entry.js.js'가 된다
    },
    // publicDir('public')은 copyPublicDir 기본값 true로 outDir 루트에 복사된다 → dist/index.html = 단독 페이지
  },
  preview: { host: '127.0.0.1', port: PORT, strictPort: true },
});
