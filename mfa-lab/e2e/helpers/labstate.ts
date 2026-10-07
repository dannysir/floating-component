// 페이지별 lab 상태(로그·open 결과). fixtures가 등록하고 snapshot·invariants가 읽는다. 순환 import를 피하려고 따로 둔다.
import type { Page } from '@playwright/test';

export interface ConsoleEntry { type: string; text: string; url: string }
export interface RequestEntry { url: string; method: string; resourceType: string; frameUrl: string; isNavigation: boolean; t: number }
export interface LabState {
  console: ConsoleEntry[];
  pageErrors: string[];
  requests: RequestEntry[];
  bodyUserSelect: () => string | null;
  lastOpen: () => { url: string; lib: { source: string; tree: string; commit: string }; skipped: string[] } | null;
  cursor: { console: number; pageErrors: number };
}

const states = new WeakMap<Page, LabState>();
export const registerLabState = (page: Page, state: LabState) => { states.set(page, state); };
export const labStateOf = (page: Page): LabState | null => states.get(page) ?? null;
