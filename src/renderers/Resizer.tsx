import React, { useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import type { SplitDirection } from "../types";

interface ResizerProps {
  direction: SplitDirection;
  onResize: (delta: number) => void;
  className?: string;
  style?: CSSProperties;
}

export const Resizer = ({ direction, onResize, className, style }: ResizerProps) => {
  const isHorizontal = direction === "horizontal";
  const startPos = useRef(0);
  const rafId = useRef(0);
  const pendingDelta = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      pendingDelta.current = 0;

      const onMouseMove = (e: MouseEvent) => {
        const current = isHorizontal ? e.clientX : e.clientY;
        const delta = current - startPos.current;
        if (delta !== 0) {
          startPos.current = current;
          pendingDelta.current += delta;
          if (!rafId.current) {
            rafId.current = requestAnimationFrame(() => {
              onResize(pendingDelta.current);
              pendingDelta.current = 0;
              rafId.current = 0;
            });
          }
        }
      };

      const onMouseUp = () => {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          if (pendingDelta.current !== 0) onResize(pendingDelta.current);
          rafId.current = 0;
          pendingDelta.current = 0;
        }
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [isHorizontal, onResize]
  );

  const defaultSizeStyle: CSSProperties = className
    ? {}
    : {
        width: isHorizontal ? 4 : "100%",
        height: isHorizontal ? "100%" : 4,
        background: "#e0e0e0",
      };

  return (
    <div
      onMouseDown={onMouseDown}
      className={className}
      style={{
        flexShrink: 0,
        cursor: isHorizontal ? "col-resize" : "row-resize",
        ...defaultSizeStyle,
        ...style,
      }}
    />
  );
};
