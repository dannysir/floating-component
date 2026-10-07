// src/registry/remotes.d.ts — dts: false 이므로 타입은 손으로 쓴다
declare module 'orders/Panel' {
  import type { ComponentType } from 'react';
  import type { PanelProps } from '@harbor/contract';
  export const Panel: ComponentType<PanelProps>;
}
declare module 'board/Panel' {
  import type { ComponentType } from 'react';
  import type { PanelProps } from '@harbor/contract';
  export const Panel: ComponentType<PanelProps>;
}
