import { useCallback, useRef, useState } from "react";
import type { DropPreview } from "../renderers/LayoutNodeRenderer";

const areDropPreviewsEqual = (
  a: DropPreview | null,
  b: DropPreview | null,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.sourcePanelId === b.sourcePanelId &&
    a.anchorPanelId === b.anchorPanelId &&
    a.position === b.position &&
    a.depth === b.depth
  );
};

export const useDropPreview = () => {
  const [preview, setPreviewState] = useState<DropPreview | null>(null);
  const latestRef = useRef<DropPreview | null>(null);

  const setPreview = useCallback((next: DropPreview | null) => {
    if (areDropPreviewsEqual(latestRef.current, next)) return;
    latestRef.current = next;
    setPreviewState(next);
  }, []);

  const clear = useCallback(() => {
    if (latestRef.current === null) return;
    latestRef.current = null;
    setPreviewState(null);
  }, []);

  return { preview, setPreview, clear, latestRef };
};
