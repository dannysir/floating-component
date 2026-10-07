import { defineConfig } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const lane = JSON.parse(readFileSync(here('./lane.json'), 'utf8')) as { lane: string; playwright: string; chromium: string };
const localPath = here('../.run/lane.local.json');
const local = existsSync(localPath) ? (JSON.parse(readFileSync(localPath, 'utf8')) as { executablePath?: string | null }) : {};

// 레인 검사 1: 설치된 @playwright/test 버전이 lane.json과 다르면 멈춘다 (버전을 섞지 않는다).
const installed = (JSON.parse(readFileSync(here('./node_modules/@playwright/test/package.json'), 'utf8')) as { version: string }).version;
if (installed !== lane.playwright) throw new Error(`lane.json playwright=${lane.playwright} but installed ${installed}`);

export default defineConfig({
  testDir: here('.'),
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  outputDir: here('./test-results'),
  reporter: [['line'], ['json', { outputFile: here('./.artifacts/results.json') }]],
  use: {
    baseURL: 'http://127.0.0.1:4300',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    headless: true,
    launchOptions: {
      args: ['--no-proxy-server'],                                   // 클라우드 프록시 변수가 127.0.0.1 요청에 끼지 않게
      ...(local.executablePath ? { executablePath: local.executablePath } : {}),   // 레인 C만
    },
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    { name: 'mouse', use: {} },
    { name: 'touch', use: { hasTouch: true } },
    // S10에서만 추가: { name: 'mouse-full', use: { channel: 'chromium' } },
  ],
});
