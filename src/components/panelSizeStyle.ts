import type { CSSProperties } from "react";
import type { SplitDirection } from "../tree/types";
import { HORIZONTAL, VERTICAL } from "../tree/constants";

type SizeStyle = Pick<CSSProperties, "minWidth" | "minHeight" | "maxWidth" | "maxHeight">;

/**
 * 패널/split wrapper의 크기 제약 스타일.
 * main-axis(부모 split 방향)에만 min/max를 적용하고, cross-axis는 0으로 둔다.
 * 반대 축(cross)의 min/max는 무시 — 컴포넌트가 그 축으로 넘치면 wrapper의 overflow:auto가
 * 스크롤로 무결성을 보장한다.
 *
 * 레이아웃 최소/최대(main-axis)는 윈도우 리사이즈(이 CSS)와 경계선 드래그(clampSplitResize)가
 * 같은 px 값으로 일관되게 보장한다.
 */
export const panelSizeStyle = (
  parentDirection: SplitDirection | undefined,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number,
): SizeStyle => {
  if (parentDirection === HORIZONTAL) return { minWidth: minWidth ?? 0, maxWidth, minHeight: 0 };
  if (parentDirection === VERTICAL) return { minHeight: minHeight ?? 0, maxHeight, minWidth: 0 };
  return { minWidth: 0, minHeight: 0 };
};
