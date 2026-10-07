import React, { useCallback, useEffect, useRef } from "react";
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
  const hasCapture = useRef(false);
  const endSession = useRef<((commit: boolean) => void) | null>(null);
  const schedulerRef = useRef<ReturnType<typeof createRafScheduler> | null>(null);
  if (schedulerRef.current === null) schedulerRef.current = createRafScheduler();

  useEffect(() => () => endSession.current?.(false), []);

  return useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // 캡처가 유효한 세션이 진행 중이면 다른 포인터는 무시한다.
      // 캡처를 얻지 못한 세션은 종료 이벤트를 받을 수 없으므로 정리하고 새로 시작한다.
      if (activePointerId.current !== null) {
        if (hasCapture.current) return;
        endSession.current?.(false);
      }
      e.preventDefault();
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      activePointerId.current = pointerId;
      hasCapture.current = false;
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      pendingDelta.current = 0;
      const scheduler = schedulerRef.current!;

      // userSelect는 캡처가 유효한 동안만 바꾼다. 캡처가 끝나면 lostpointercapture가 반드시 온다.
      let prevUserSelect: string | null = null;

      const onGotCapture = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        hasCapture.current = true;
        if (prevUserSelect !== null) return;
        prevUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = "none";
      };

      const onPointerMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        // 버튼이 떼어진 이동: pointerup을 받지 못하고 끝난 세션
        if (ev.buttons === 0) {
          finish(true);
          return;
        }
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

      const onEnd = (ev: PointerEvent) => {
        if (ev.pointerId === pointerId) finish(true);
      };

      const onBlur = () => finish(true);

      const finish = (commit: boolean) => {
        if (endSession.current !== finish) return;
        if (scheduler.isPending()) {
          scheduler.cancel();
          if (commit && pendingDelta.current !== 0) onResize(pendingDelta.current);
        }
        pendingDelta.current = 0;
        if (prevUserSelect !== null) document.body.style.userSelect = prevUserSelect;
        el.removeEventListener("gotpointercapture", onGotCapture);
        el.removeEventListener("lostpointercapture", onEnd);
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerup", onEnd);
        el.removeEventListener("pointercancel", onEnd);
        window.removeEventListener("blur", onBlur);
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
        activePointerId.current = null;
        hasCapture.current = false;
        endSession.current = null;
      };

      endSession.current = finish;
      el.addEventListener("gotpointercapture", onGotCapture);
      el.addEventListener("lostpointercapture", onEnd);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onEnd);
      el.addEventListener("pointercancel", onEnd);
      window.addEventListener("blur", onBlur);
    },
    [isHorizontal, onResize]
  );
};
