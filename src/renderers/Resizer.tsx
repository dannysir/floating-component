import type { CSSProperties } from "react";
import type { SplitDirection } from "../types";
import {
  RESIZER_CLASS,
  RESIZER_CLASS_HORIZONTAL,
  RESIZER_CLASS_VERTICAL,
  RESIZER_CLASS_HOVER_ONLY,
  RESIZER_COLOR_VAR,
  RESIZER_HOVER_COLOR_VAR,
} from "./resizerStyles";
import {
  DEFAULT_RESIZER_THICKNESS,
  DEFAULT_RESIZER_LENGTH,
  DEFAULT_RESIZER_HOVER_ONLY,
} from "../constants/resizer";
import { HORIZONTAL } from "../constants/layout";
import { useDragResize } from "../hooks/useDragResize";

interface ResizerProps {
  direction: SplitDirection;
  onResize: (delta: number) => void;
  thickness?: number | string;
  length?: number | string;
  color?: string;
  hoverColor?: string;
  hoverOnly?: boolean;
}

const setCssVar = (style: CSSProperties, name: string, value: string) => {
  (style as Record<string, string | number>)[name] = value;
};

export const Resizer = ({
  direction,
  onResize,
  thickness = DEFAULT_RESIZER_THICKNESS,
  length = DEFAULT_RESIZER_LENGTH,
  color,
  hoverColor,
  hoverOnly = DEFAULT_RESIZER_HOVER_ONLY,
}: ResizerProps) => {
  const isHorizontal = direction === HORIZONTAL;
  const onMouseDown = useDragResize(direction, onResize);

  const style: CSSProperties = isHorizontal
    ? { width: thickness, height: length }
    : { width: length, height: thickness };
  if (color) setCssVar(style, RESIZER_COLOR_VAR, color);
  if (hoverColor) setCssVar(style, RESIZER_HOVER_COLOR_VAR, hoverColor);

  const directionClass = isHorizontal ? RESIZER_CLASS_HORIZONTAL : RESIZER_CLASS_VERTICAL;
  const className = hoverOnly
    ? `${RESIZER_CLASS} ${directionClass} ${RESIZER_CLASS_HOVER_ONLY}`
    : `${RESIZER_CLASS} ${directionClass}`;

  return <div onMouseDown={onMouseDown} className={className} style={style} />;
};
