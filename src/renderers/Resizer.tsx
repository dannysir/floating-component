import React, { useCallback, useRef } from "react";
import type { SplitDirection } from "../types";

interface ResizerProps {
  direction: SplitDirection;
  onResize: (delta: number) => void;
}

export const Resizer = ({ direction, onResize }: ResizerProps) => {
  const isHorizontal = direction === "horizontal";
  const startPos = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startPos.current = isHorizontal ? e.clientX : e.clientY;

      const onMouseMove = (e: MouseEvent) => {
        const current = isHorizontal ? e.clientX : e.clientY;
        const delta = current - startPos.current;
        if (delta !== 0) {
          onResize(delta);
          startPos.current = current;
        }
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [isHorizontal, onResize]
  );

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        flexShrink: 0,
        width: isHorizontal ? 4 : "100%",
        height: isHorizontal ? "100%" : 4,
        cursor: isHorizontal ? "col-resize" : "row-resize",
        background: "#e0e0e0",
      }}
    />
  );
};
