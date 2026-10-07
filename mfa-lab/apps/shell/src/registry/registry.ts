// src/registry/registry.ts — Vite가 JSON을 모듈로 준다 (https://vite.dev/guide/features#json)
import raw from '../../../../registry.json';
export interface RemoteInfo { app: string; team: string; kind: 'same-tree' | 'mount' | 'iframe'; dir?: string; sameServerAs?: string; origin: string; entry: string; expose?: string; twin?: string }
export interface Registry {
  contract: number; pins: Record<string, string>; federation: { shareStrategy: string };
  shell: { app: string; team: string; dir: string; origin: string; ready: string };
  baseline: Record<string, { app: string; dir: string; outDir: string; origin: string; ready: string; alias: string; spec: string }>;
  remotes: Record<string, RemoteInfo>; reservedPorts: number[]; deadOrigin: string;
}
export const registry = raw as Registry;
