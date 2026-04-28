import { DEFAULT_RESIZER_COLOR, DEFAULT_RESIZER_HOVER_COLOR } from "./resizerConstants";

export const RESIZER_CLASS = "ftl-resizer";
export const RESIZER_CLASS_HORIZONTAL = "ftl-resizer--horizontal";
export const RESIZER_CLASS_VERTICAL = "ftl-resizer--vertical";
export const RESIZER_CLASS_HOVER_ONLY = "ftl-resizer--hover-only";
export const RESIZER_COLOR_VAR = "--ftl-resizer-color";
export const RESIZER_HOVER_COLOR_VAR = "--ftl-resizer-hover-color";

const STYLE_MARKER = "data-ftl-styles";

const FADE_MASK_HORIZONTAL = "linear-gradient(to bottom, transparent, #000 50%, transparent)";
const FADE_MASK_VERTICAL = "linear-gradient(to right, transparent, #000 50%, transparent)";

const CSS = `
.${RESIZER_CLASS} { flex-shrink: 0; box-sizing: border-box; background: var(${RESIZER_COLOR_VAR}, ${DEFAULT_RESIZER_COLOR}); background-clip: content-box; -webkit-background-clip: content-box; opacity: 1; transition: opacity 200ms ease, background-color 150ms ease; }
.${RESIZER_CLASS_HORIZONTAL} { cursor: col-resize; padding: 0 2px; -webkit-mask-image: ${FADE_MASK_HORIZONTAL}; mask-image: ${FADE_MASK_HORIZONTAL}; }
.${RESIZER_CLASS_VERTICAL} { cursor: row-resize; padding: 2px 0; -webkit-mask-image: ${FADE_MASK_VERTICAL}; mask-image: ${FADE_MASK_VERTICAL}; }
.${RESIZER_CLASS}.${RESIZER_CLASS_HOVER_ONLY} { opacity: 0; }
.${RESIZER_CLASS}.${RESIZER_CLASS_HOVER_ONLY}:hover { opacity: 1; }
.${RESIZER_CLASS}:hover { background-color: var(${RESIZER_HOVER_COLOR_VAR}, var(${RESIZER_COLOR_VAR}, ${DEFAULT_RESIZER_HOVER_COLOR})); }
`;

if (typeof document !== "undefined") {
  if (!document.head.querySelector(`[${STYLE_MARKER}]`)) {
    const style = document.createElement("style");
    style.setAttribute(STYLE_MARKER, "");
    style.textContent = CSS;
    document.head.prepend(style);
  }
}
