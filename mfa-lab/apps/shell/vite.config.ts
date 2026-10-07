// mfa-lab/apps/shell/vite.config.ts (1단계)
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 경로는 전부 fileURLToPath로 만든다. 사용자 PC의 저장소 경로에 ASCII가 아닌 문자가 있다.
const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const repoRoot = here('../../../');
const labRoot = here('../../');
const registry = JSON.parse(readFileSync(here('../../registry.json'), 'utf8'));

// ctl build가 넘기는 환경 변수 (ARCHITECTURE.md 「빌드 입력」)
const lib = process.env.LAB_LIB ?? 'src';          // 'src' | 'npm051' | 'dist'
const mf = process.env.LAB_MF ?? 'on';             // 'on' | 'off'
const stamp = process.env.LAB_BUILD_STAMP ?? 'dev';
const git = (cmd: string) => {
  try { return execSync(cmd, { cwd: repoRoot, encoding: 'utf8' }).trim(); } catch { return ''; }
};
const libTree = process.env.LAB_LIB_TREE ?? git('git rev-parse HEAD:src');
const libCommit = process.env.LAB_LIB_COMMIT ?? git('git rev-list -1 HEAD -- src');

const appName = lib === 'npm051' ? 'shell-051' : 'shell';
const port = lib === 'npm051' ? 4390 : 4300;
const outDir = lib === 'npm051' ? 'dist-051' : 'dist';

const libAlias =
  lib === 'src' ? here('../../../src/index.ts')
  : lib === 'dist' ? here('../../../dist/index.js')   // B1-02 대안 3에서만. 루트 npm ci && npm run build가 필요하다
  : 'fc-051';                                        // npm 0.5.1 (bare specifier로 다시 풀린다)

// twin alias: 파일이 생기는 단계에서 켠다. import되지 않는 alias는 있어도 해가 없다.
const twinDirs = { billing: '../mfe-billing/src/App.tsx', orders: '../mfe-orders/src/Panel.tsx', board: '../mfe-board/src/Panel.tsx' };
const twinAliases = Object.fromEntries(
  Object.entries(twinDirs).filter(([, rel]) => existsSync(here(rel))).map(([name, rel]) => [`@twin/${name}`, here(rel)]),
);

// same-tree remote 중 디렉터리가 실제로 있는 것만 host remotes로 만든다 (활성 집합과 같은 규칙).
// 형식은 매니페스트 URL 문자열: { orders: 'http://127.0.0.1:4301/mf-manifest.json' }. 상위 host 예제와 같은 형태다.
type RemoteEntry = { kind: string; dir?: string; origin: string; entry: string };
const sameTree = Object.entries(registry.remotes as Record<string, RemoteEntry>)
  .filter(([, r]) => r.kind === 'same-tree' && r.dir && existsSync(`${labRoot}${r.dir}/package.json`));
const remotes = Object.fromEntries(sameTree.map(([name, r]) => [name, `${r.origin}${r.entry}`]));

// LAB_MF=off: remote 지정자를 remote 소스로 alias (빌드 타임 통합, MF: degraded)
const mfOffAliases = mf === 'off'
  ? Object.fromEntries(sameTree.map(([name, r]) => [`${name}/Panel`, `${labRoot}${r.dir}/src/Panel.tsx`]))
  : {};

// 공유 블록. React 네 키 싱글턴 (mfe-orders·mfe-board와 같게)
const reactShared = { singleton: true, requiredVersion: `^${registry.pins.react}` };
const shared = { react: reactShared, 'react/': reactShared, 'react-dom': reactShared, 'react-dom/': reactShared };

// <meta name="harbor-app" content="<app>@<buildId>"> — ctl.mjs 준비 판정의 본문 검사 (ARCHITECTURE.md 「포트와 origin」)
export const harborMeta = (app: string, buildId: string): Plugin => ({
  name: 'harbor-meta',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { name: 'harbor-app', content: `${app}@${buildId}` }, injectTo: 'head' },
  ],
});

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    harborMeta(appName, stamp),
    ...(mf === 'on'
      ? [federation({
          name: 'shell',
          dts: false,
          remotes,
          shared,
          shareStrategy: registry.federation.shareStrategy,   // 'loaded-first'
          // runtimePlugins: ['./src/mf/fallbackPlugin.ts'],   // B1-06 사다리 (b)-2에서만 켠다
        })]
      : []),
  ],
  resolve: {
    alias: {
      '@dannysir/floating-components': libAlias,
      '@harbor/contract': here('../../contract/src/index.ts'),
      ...twinAliases,
      ...mfOffAliases,
    },
    // alias된 저장소 src/와 twin 소스의 `react` import를 shell의 사본으로 묶는다.
    dedupe: ['react', 'react-dom'],
  },
  define: {
    __LAB_BUILD_STAMP__: JSON.stringify(stamp),
    __LAB_LIB_SOURCE__: JSON.stringify(lib),
    __LAB_LIB_TREE__: JSON.stringify(libTree),
    __LAB_LIB_COMMIT__: JSON.stringify(libCommit),
    __LAB_MF__: JSON.stringify(mf),
    __LAB_MODE__: JSON.stringify(command === 'build' ? 'prod' : 'dev'),
  },
  server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [repoRoot] } },
  preview: { host: '127.0.0.1', port, strictPort: true },
  build: { target: 'chrome89', outDir, sourcemap: false },
}));
