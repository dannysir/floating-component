import { useLayoutEffect, useRef } from "react";
import type { PanelNode, SplitDirection } from "../tree/types";
import type { RegisterElement } from "../hooks/usePanelPlacement";
import { panelSizeStyle } from "./panelSizeStyle";

interface PanelSlotProps {
  node: PanelNode;
  parentDirection?: SplitDirection;
  registerSlot: RegisterElement;
}

// 골격 안에서 패널 자리만 잡는 빈 요소. 실제 패널은 TreeLayout이 루트 바로 아래에 렌더하고
// 이 요소의 위치·크기로 배치한다. 비어 있으므로 트리 모양이 바뀌어 리마운트돼도 잃는 것이 없다.
export const PanelSlot = ({ node, parentDirection, registerSlot }: PanelSlotProps) => {
  const slotRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!slotRef.current) return;
    return registerSlot(node.id, slotRef.current);
  }, [node.id, registerSlot]);

  return (
    <div
      ref={slotRef}
      data-panel-slot={node.id}
      style={{
        flex: node.size,
        ...panelSizeStyle(parentDirection, node.minWidth, node.minHeight, node.maxWidth, node.maxHeight),
      }}
    />
  );
};
