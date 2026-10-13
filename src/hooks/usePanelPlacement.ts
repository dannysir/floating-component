import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

export type RegisterElement = (id: string, el: HTMLElement) => () => void;
export type GetSlot = (id: string) => HTMLElement | null;

// 패널은 루트 바로 아래에 평평하게 렌더해 트리 모양이 바뀌어도 리마운트·DOM 이동이 없게 하고,
// 위치·크기는 골격(LayoutNodeRenderer)이 flex로 배치한 같은 id의 slot에서 가져온다.
export const usePanelPlacement = (rootRef: RefObject<HTMLDivElement | null>) => {
  const slotsRef = useRef(new Map<string, HTMLElement>());
  const panelsRef = useRef(new Map<string, HTMLElement>());
  const observerRef = useRef<ResizeObserver | null>(null);

  const place = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    // 조상에 transform: scale이 있으면 rect는 화면 px이므로 루트 기준 CSS px로 되돌린다.
    const scaleX = root.offsetWidth > 0 && rootRect.width > 0 ? rootRect.width / root.offsetWidth : 1;
    const scaleY = root.offsetHeight > 0 && rootRect.height > 0 ? rootRect.height / root.offsetHeight : 1;
    panelsRef.current.forEach((panel, id) => {
      const slot = slotsRef.current.get(id);
      if (!slot) return;
      const rect = slot.getBoundingClientRect();
      const s = panel.style;
      s.left = `${(rect.left - rootRect.left) / scaleX - root.clientLeft}px`;
      s.top = `${(rect.top - rootRect.top) / scaleY - root.clientTop}px`;
      s.width = `${rect.width / scaleX}px`;
      s.height = `${rect.height / scaleY}px`;
    });
  }, [rootRef]);

  // 렌더 없이 slot 크기가 바뀌는 경우(창·컨테이너 리사이즈)를 잡는다. slot이 처음 등록될 때 만든다.
  const getObserver = useCallback(() => {
    if (observerRef.current || typeof ResizeObserver === "undefined") return observerRef.current;
    const observer = new ResizeObserver(() => place());
    if (rootRef.current) observer.observe(rootRef.current);
    observerRef.current = observer;
    return observer;
  }, [place, rootRef]);

  const registerSlot = useCallback<RegisterElement>(
    (id, el) => {
      slotsRef.current.set(id, el);
      getObserver()?.observe(el);
      return () => {
        if (slotsRef.current.get(id) === el) slotsRef.current.delete(id);
        observerRef.current?.unobserve(el);
      };
    },
    [getObserver],
  );

  const registerPanel = useCallback<RegisterElement>((id, el) => {
    panelsRef.current.set(id, el);
    return () => {
      if (panelsRef.current.get(id) === el) panelsRef.current.delete(id);
    };
  }, []);

  const getSlot = useCallback<GetSlot>((id) => slotsRef.current.get(id) ?? null, []);

  // 자식(slot·패널)의 등록 layout effect가 먼저 실행되므로, 같은 커밋 안에서 페인트 전에 배치된다.
  useLayoutEffect(() => {
    place();
  });

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    },
    [],
  );

  return { registerSlot, registerPanel, getSlot };
};
