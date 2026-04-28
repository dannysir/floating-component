import React, { useCallback, useRef } from "react";
import type { SplitDirection } from "../tree/types";
import { createRafScheduler } from "../utils/rafScheduler";
import { HORIZONTAL } from "../tree/constants";

export const useDragResize = (
  direction: SplitDirection,
  onResize: (delta: number) => void
) => {
  const isHorizontal = direction === HORIZONTAL;
  const startPos = useRef(0);
  const pendingDelta = useRef(0);
  const schedulerRef = useRef<ReturnType<typeof createRafScheduler> | null>(null);
  if (schedulerRef.current === null) schedulerRef.current = createRafScheduler();

  return useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      pendingDelta.current = 0;
      const scheduler = schedulerRef.current!;

      const onMouseMove = (ev: MouseEvent) => {
        const current = isHorizontal ? ev.clientX : ev.clientY;
        const delta = current - startPos.current;
        if (delta === 0) return;
        startPos.current = current;
        pendingDelta.current += delta;
        scheduler.schedule(() => {
          onResize(pendingDelta.current);
          pendingDelta.current = 0;
        });
      };

      const onMouseUp = () => {
        if (scheduler.isPending()) {
          scheduler.cancel();
          if (pendingDelta.current !== 0) onResize(pendingDelta.current);
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
};
