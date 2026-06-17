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
  const activePointerId = useRef<number | null>(null);
  const schedulerRef = useRef<ReturnType<typeof createRafScheduler> | null>(null);
  if (schedulerRef.current === null) schedulerRef.current = createRafScheduler();

  return useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (activePointerId.current !== null) return;
      e.preventDefault();
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      activePointerId.current = pointerId;
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      pendingDelta.current = 0;
      const scheduler = schedulerRef.current!;

      const prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";

      const onPointerMove = (ev: PointerEvent) => {
        if (ev.pointerId !== activePointerId.current) return;
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

      const finish = (ev: PointerEvent) => {
        if (ev.pointerId !== activePointerId.current) return;
        if (scheduler.isPending()) {
          scheduler.cancel();
          if (pendingDelta.current !== 0) onResize(pendingDelta.current);
          pendingDelta.current = 0;
        }
        document.body.style.userSelect = prevUserSelect;
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerup", finish);
        el.removeEventListener("pointercancel", finish);
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
        activePointerId.current = null;
      };

      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", finish);
      el.addEventListener("pointercancel", finish);
    },
    [isHorizontal, onResize]
  );
};
