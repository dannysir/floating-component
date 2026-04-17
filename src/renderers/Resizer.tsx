import React, { useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import type { SplitDirection } from "../types";
import {
  RESIZER_CLASS,
  RESIZER_CLASS_HORIZONTAL,
  RESIZER_CLASS_VERTICAL,
  RESIZER_CLASS_HOVER_ONLY,
  RESIZER_COLOR_VAR,
} from "./resizerStyles";

interface ResizerProps {
  direction: SplitDirection;
  onResize: (delta: number) => void;
  thickness?: number | string;
  length?: number | string;
  color?: string;
  hoverOnly?: boolean;
}

export const Resizer = ({
  direction,
  onResize,
  thickness = 4,
  length = "100%",
  color,
  hoverOnly = false,
}: ResizerProps) => {
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

  const style: CSSProperties = isHorizontal
    ? { width: thickness, height: length }
    : { width: length, height: thickness };
  if (color) (style as Record<string, string | number>)[RESIZER_COLOR_VAR] = color;

  const directionClass = isHorizontal ? RESIZER_CLASS_HORIZONTAL : RESIZER_CLASS_VERTICAL;
  const className = hoverOnly
    ? `${RESIZER_CLASS} ${directionClass} ${RESIZER_CLASS_HOVER_ONLY}`
    : `${RESIZER_CLASS} ${directionClass}`;

  return <div onMouseDown={onMouseDown} className={className} style={style} />;
};
