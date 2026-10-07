// 장애 주입: lab.open 전에 부른다. 서버를 끄지 않고 네트워크 계층에서만 막는다.
import type { Page } from '@playwright/test';

export const blockRemote = async (page: Page, origin: string): Promise<() => Promise<void>> => {
  const pattern = `${origin}/**`;
  await page.route(pattern, (route) => route.abort());
  return () => page.unroute(pattern);
};
