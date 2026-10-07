export const ensureStyle = (id: string, css: string): void => {
  if (typeof document === 'undefined') return;
  if (document.head.querySelector(`style[data-harbor-style="${id}"]`)) return;
  const el = document.createElement('style');
  el.setAttribute('data-harbor-style', id);
  el.textContent = css;
  document.head.appendChild(el);
};
