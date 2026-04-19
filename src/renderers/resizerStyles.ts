export const RESIZER_CLASS = "ftl-resizer";
export const RESIZER_CLASS_HORIZONTAL = "ftl-resizer--horizontal";
export const RESIZER_CLASS_VERTICAL = "ftl-resizer--vertical";
export const RESIZER_CLASS_HOVER_ONLY = "ftl-resizer--hover-only";
export const RESIZER_COLOR_VAR = "--ftl-resizer-color";

const STYLE_MARKER = "data-ftl-styles";

const CSS = `
.${RESIZER_CLASS} { flex-shrink: 0; background: var(${RESIZER_COLOR_VAR}, #e0e0e0); }
.${RESIZER_CLASS_HORIZONTAL} { cursor: col-resize; }
.${RESIZER_CLASS_VERTICAL} { cursor: row-resize; }
.${RESIZER_CLASS}.${RESIZER_CLASS_HOVER_ONLY} { background: transparent; }
.${RESIZER_CLASS}.${RESIZER_CLASS_HOVER_ONLY}:hover { background: var(${RESIZER_COLOR_VAR}, #e0e0e0); }
`;

if (typeof document !== "undefined") {
  if (!document.head.querySelector(`[${STYLE_MARKER}]`)) {
    const style = document.createElement("style");
    style.setAttribute(STYLE_MARKER, "");
    style.textContent = CSS;
    document.head.prepend(style);
  }
}
