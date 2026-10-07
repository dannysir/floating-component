// src/topbar/ExtChip.tsx — 트리 밖의 유일한 비패널 드래그 소스 (R08(b)). effectAllowed는 건드리지 않는다(기본 'uninitialized').
export const ExtChip = () => (
  <span
    draggable
    data-testid="ext-chip"
    onDragStart={(e) => { e.dataTransfer.setData('application/x-harbor-chip', '1'); }}   // 값 '1'은 ARCHITECTURE 「앱 목록」 ext-chip 행의 정의
    style={{ padding: '2px 8px', border: '1px solid #999', borderRadius: 10, cursor: 'grab', userSelect: 'none' }}
  >
    chip
  </span>
);
