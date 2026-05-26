import type { ReactNode } from "react";

export interface ComponentStore {
  register: (key: string, node: ReactNode) => void;
  unregister: (key: string) => void;
  get: (key: string) => ReactNode | undefined;
  has: (key: string) => boolean;
}

export const createComponentStore = (initial?: Record<string, ReactNode>): ComponentStore => {
  const map = new Map<string, ReactNode>(initial ? Object.entries(initial) : undefined);
  return {
    register: (key, node) => {
      map.set(key, node);
    },
    unregister: (key) => {
      map.delete(key);
    },
    get: (key) => map.get(key),
    has: (key) => map.has(key),
  };
};
