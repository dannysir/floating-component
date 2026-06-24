import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { LayoutDirection, DropPosition } from "../tree/types";
import type { DropPreview } from "../components/LayoutNodeRenderer";
import { getDropTarget } from "../dnd/dropTarget";
import { createRafScheduler } from "../utils/rafScheduler";

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 8;

interface DragSession {
  el: HTMLElement;
  nodeId: string;
  direction: LayoutDirection;
  onDropPreviewChange?: (preview: DropPreview | null) => void;
  onMovePanel?: (
    sourcePanelId: string,
    anchorPanelId: string,
    position: DropPosition,
    depth: number
  ) => void;
  touchId: number;
  startX: number;
  startY: number;
  armed: boolean;
  dragging: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  ghost: HTMLElement | null;
  grabOffsetX: number;
  grabOffsetY: number;
  lastDrop: { anchorPanelId: string; position: DropPosition; depth: number } | null;
}

// 드래그 세션을 컴포넌트 생명주기와 분리: 드래그 중 소스 패널이 preview 리렌더로
// 언마운트돼도, document 리스너와 모듈 레벨 세션이 살아남아 드래그가 끊기지 않는다.
// 동시 단일 터치 드래그만 허용한다.
let session: DragSession | null = null;
const scheduler = createRafScheduler();

const findTouch = (e: TouchEvent, id: number): Touch | null => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === id) return e.changedTouches[i];
  }
  return null;
};

const createGhost = (x: number, y: number) => {
  if (!session) return;
  const rect = session.el.getBoundingClientRect();
  session.grabOffsetX = x - rect.left;
  session.grabOffsetY = y - rect.top;
  const ghost = session.el.cloneNode(true) as HTMLElement;
  ghost.removeAttribute("data-panel-id");
  const s = ghost.style;
  s.position = "fixed";
  s.left = "0";
  s.top = "0";
  s.margin = "0";
  s.width = `${rect.width}px`;
  s.height = `${rect.height}px`;
  s.boxSizing = "border-box";
  s.pointerEvents = "none";
  s.opacity = "0.7";
  s.zIndex = "9999";
  s.transform = `translate(${x - session.grabOffsetX}px, ${y - session.grabOffsetY}px)`;
  document.body.appendChild(ghost);
  session.ghost = ghost;
};

const moveGhost = (x: number, y: number) => {
  if (session?.ghost) {
    session.ghost.style.transform = `translate(${x - session.grabOffsetX}px, ${y - session.grabOffsetY}px)`;
  }
};

const updateDrag = (x: number, y: number) => {
  if (!session) return;
  moveGhost(x, y);
  scheduler.schedule(() => {
    if (!session) return;
    const { nodeId, direction, onDropPreviewChange } = session;
    const hit = document.elementFromPoint(x, y);
    const anchorEl = hit?.closest("[data-panel-id]") as HTMLElement | null;
    if (!anchorEl) return;
    const anchorId = anchorEl.dataset.panelId;
    if (!anchorId || anchorId === nodeId) return;
    const { position, depth } = getDropTarget(x, y, anchorEl, direction);
    session.lastDrop = { anchorPanelId: anchorId, position, depth };
    onDropPreviewChange?.({ sourcePanelId: nodeId, anchorPanelId: anchorId, position, depth });
  });
};

const startDrag = (x: number, y: number) => {
  if (!session) return;
  session.dragging = true;
  if (session.longPressTimer) {
    clearTimeout(session.longPressTimer);
    session.longPressTimer = null;
  }
  createGhost(x, y);
  updateDrag(x, y);
};

const onDocMove = (e: TouchEvent) => {
  if (!session) return;
  const touch = findTouch(e, session.touchId);
  if (!touch) return;
  const dx = touch.clientX - session.startX;
  const dy = touch.clientY - session.startY;

  if (!session.dragging) {
    const dist = Math.hypot(dx, dy);
    if (!session.armed) {
      // 비핸들 모드: 롱프레스 만료 전 큰 이동 → 스크롤로 간주, 세션 종료
      if (dist > MOVE_THRESHOLD) endSession(false);
      return;
    }
    // 핸들 모드: threshold 넘으면 드래그 시작
    if (dist > MOVE_THRESHOLD) {
      startDrag(touch.clientX, touch.clientY);
      e.preventDefault();
    }
    return;
  }

  e.preventDefault();
  updateDrag(touch.clientX, touch.clientY);
};

const onDocEnd = (e: TouchEvent) => {
  if (!session) return;
  if (!findTouch(e, session.touchId)) return;
  endSession(session.dragging);
};

const onDocCancel = (e: TouchEvent) => {
  if (!session) return;
  if (!findTouch(e, session.touchId)) return;
  endSession(false);
};

const endSession = (commit: boolean) => {
  if (!session) return;
  const s = session;
  session = null;

  if (s.longPressTimer) clearTimeout(s.longPressTimer);
  scheduler.cancel();
  if (s.ghost) s.ghost.remove();
  document.removeEventListener("touchmove", onDocMove);
  document.removeEventListener("touchend", onDocEnd);
  document.removeEventListener("touchcancel", onDocCancel);

  if (s.dragging) {
    s.onDropPreviewChange?.(null);
    if (commit && s.lastDrop && s.onMovePanel) {
      s.onMovePanel(s.nodeId, s.lastDrop.anchorPanelId, s.lastDrop.position, s.lastDrop.depth);
    }
  }
};

interface UseTouchDragOptions {
  panelRef: RefObject<HTMLDivElement | null>;
  nodeId: string;
  direction: LayoutDirection;
  dragHandleSelector?: string;
  onDropPreviewChange?: (preview: DropPreview | null) => void;
  onMovePanel?: (
    sourcePanelId: string,
    anchorPanelId: string,
    position: DropPosition,
    depth: number
  ) => void;
}

export const useTouchDrag = (options: UseTouchDragOptions) => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const el = optionsRef.current.panelRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (session) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const { nodeId, direction, dragHandleSelector, onDropPreviewChange, onMovePanel } =
        optionsRef.current;
      if (dragHandleSelector) {
        const target = e.target as HTMLElement | null;
        if (!target || !target.closest(dragHandleSelector)) return;
      }
      session = {
        el,
        nodeId,
        direction,
        onDropPreviewChange,
        onMovePanel,
        touchId: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        armed: !!dragHandleSelector,
        dragging: false,
        longPressTimer: null,
        ghost: null,
        grabOffsetX: 0,
        grabOffsetY: 0,
        lastDrop: null,
      };
      document.addEventListener("touchmove", onDocMove, { passive: false });
      document.addEventListener("touchend", onDocEnd);
      document.addEventListener("touchcancel", onDocCancel);
      if (!dragHandleSelector) {
        session.longPressTimer = setTimeout(() => {
          if (session) startDrag(session.startX, session.startY);
        }, LONG_PRESS_MS);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      // 진행 중 세션은 document 리스너가 독립적으로 관리하므로 건드리지 않는다.
      // (소스 패널이 드래그 중 언마운트돼도 드래그가 끊기지 않게 하기 위함)
    };
  }, []);
};
