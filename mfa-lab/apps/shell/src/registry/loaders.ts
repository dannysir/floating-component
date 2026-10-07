// src/registry/loaders.ts — 항목은 remote가 생기는 단계에서 추가한다. remotes(vite.config.ts 2단계)와 같은 단계에 함께 늘린다.
import type { ComponentType } from 'react';
import type { PanelProps } from '@harbor/contract';
export type PanelModule = { Panel: ComponentType<PanelProps> };
export const loaders: Record<string, () => Promise<PanelModule>> = {
  orders: () => import('orders/Panel'),      // B1-06
  board: () => import('board/Panel'),       // B1-07
};
