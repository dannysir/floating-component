// iframe 문서 안의 __mfe[slot] 읽기 (cross-origin이라 부모에서 직접 읽을 수 없다 → frame.evaluate)
import type { Frame, Page } from '@playwright/test';

export const frameOfSlot = async (page: Page, slot: string): Promise<Frame | null> => {
  const h = await page.locator(`[data-tree-root] iframe[data-testid="iframe-${slot}"]`).elementHandle();
  return h ? h.contentFrame() : null;
};

export const readFrameMfe = async (page: Page, slot: string) => {
  const f = await frameOfSlot(page, slot);
  if (!f) return null;
  return f.evaluate((s) => (window as unknown as { __mfe?: Record<string, { loads: number; docId: string; kind: string; build: string; seen: Record<string, number> }> }).__mfe?.[s] ?? null, slot);
};
