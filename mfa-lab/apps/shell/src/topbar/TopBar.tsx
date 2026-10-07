// 상단 바 (트리 밖, 높이 40px 고정): 레이아웃 이름, 라이브러리 출처·트리 해시, MF, ext-chip.
import type { CSSProperties } from 'react';
import { ExtChip } from './ExtChip';

const BAR: CSSProperties = {
  flex: '0 0 40px', display: 'flex', alignItems: 'center', gap: 16, padding: '0 12px', boxSizing: 'border-box',
  borderBottom: '1px solid var(--hb-border-base, #d0d7de)', fontSize: 13, background: 'var(--hb-topbar-bg, #f6f8fa)',
};

export const TopBar = ({ layout }: { layout: string }) => (
  <header data-testid="topbar" style={BAR}>
    <strong>Harbor Workbench</strong>
    <span data-testid="topbar-layout">layout: {layout}</span>
    <span data-testid="topbar-lib">lib: {__LAB_LIB_SOURCE__}@{__LAB_LIB_TREE__.slice(0, 7)}</span>
    <span data-testid="topbar-mf">MF: {__LAB_MF__}</span>
    <ExtChip />
  </header>
);
