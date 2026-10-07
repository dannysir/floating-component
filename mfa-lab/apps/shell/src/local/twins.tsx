// src/local/twins.tsx — import 줄은 그 remote가 생기는 단계에서 푼다 (store.tsx와 같은 규칙. 미리 풀면 alias 대상 파일이 없어 빌드가 실패한다).
import * as React from 'react';
import { useState } from 'react';
import type { PanelProps } from '@harbor/contract';
import { createProbe } from '@harbor/contract';
import { App as BillingApp } from '@twin/billing';          // B1-04
import { Panel as OrdersPanel } from '@twin/orders';        // B1-06
// import { Panel as BoardPanel } from '@twin/board';       // B1-07

// 부모(래퍼)의 useState 초기화가 자식의 것보다 먼저 실행된다. 같은 번들(shell) 안이므로 contract의 probes Map도 하나다.
// 뒤에 오는 Panel의 createProbe는 kind를 넘기지 않으므로 'local'이 유지되고, reactVersion·reactSame은 Panel이 스스로 계산한 값(twin에서는 true)으로 덮인다.
const localMeta = (remote: string) => ({ remote, kind: 'local' as const, build: __LAB_BUILD_STAMP__ });

export const BillingTwin = (p: PanelProps) => {
  // App은 reactSame·reactVersion을 계산하지 않는다(5.4절). twin은 shell이 번들하므로 host의 React와 같다 → 여기서 true로 적는다 (B1-04 게이트: billing-local reactSame === true).
  useState(() => createProbe(p.slot, { ...localMeta('billing'), reactVersion: React.version, reactSame: true }));
  return <BillingApp {...p} kind="local" />;   // App의 선택 prop kind를 'local'로 넘긴다 (ARCHITECTURE 「앱 목록」 mfe-billing 「소스 구조」)
};

// B1-06
export const OrdersTwin = (p: PanelProps) => {
  useState(() => createProbe(p.slot, localMeta('orders')));
  return <OrdersPanel {...p} />;
};

// B1-07
// export const BoardTwin = (p: PanelProps) => {
//   useState(() => createProbe(p.slot, localMeta('board')));
//   return <BoardPanel {...p} />;
// };
