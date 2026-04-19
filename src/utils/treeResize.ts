import { MIN_FLEX_SIZE } from "../constants/tree";

type ResizeChild = {
  size: number;
  minSize?: number;
  maxSize?: number;
};

export const clampSplitResize = (
  left: ResizeChild,
  right: ResizeChild,
  delta: number,
  totalPixels?: number,
): { leftSize: number; rightSize: number } => {
  const totalSize = left.size + right.size;

  const toFlex = (px: number) =>
    totalPixels && totalPixels > 0 ? (px / totalPixels) * totalSize : 0;

  const leftMin = left.minSize !== undefined ? toFlex(left.minSize) : MIN_FLEX_SIZE;
  const leftMax =
    left.maxSize !== undefined ? toFlex(left.maxSize) : totalSize - MIN_FLEX_SIZE;
  const rightMin = right.minSize !== undefined ? toFlex(right.minSize) : MIN_FLEX_SIZE;
  const rightMax =
    right.maxSize !== undefined ? toFlex(right.maxSize) : totalSize - MIN_FLEX_SIZE;

  const clampedLeftMin = Math.max(leftMin, totalSize - rightMax);
  const clampedLeftMax = Math.min(leftMax, totalSize - rightMin);

  const leftSize = Math.max(
    clampedLeftMin,
    Math.min(clampedLeftMax, left.size + delta),
  );
  const rightSize = totalSize - leftSize;

  return { leftSize, rightSize };
};
