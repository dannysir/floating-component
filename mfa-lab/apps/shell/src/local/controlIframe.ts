// src/local/controlIframe.ts — telemetry와 같은 프로브를 인라인 스크립트로 가진 srcdoc 문서. targetOrigin은 '*' (about:srcdoc은 이름 붙일 origin이 없다).
export const CONTROL_IFRAME_SRCDOC = `<!doctype html>
<html><head><meta charset="utf-8"><style>body{margin:0;font:12px sans-serif}#scroll{height:60vh;overflow:auto}</style></head>
<body>
  <div>control-iframe · loads <output data-testid="tele-loads">?</output></div>
  <input data-testid="tele-input" />
  <div id="scroll" data-testid="tele-scroll"></div>
  <script>
    (() => {
      const slot = 'control-iframe';
      const key = 'harbor.loads.' + slot;
      const read = () => { try { return Number(sessionStorage.getItem(key) || '0'); } catch (e) { return 0; } };
      const loads = read() + 1;
      try { sessionStorage.setItem(key, String(loads)); } catch (e) {}
      const docId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2, 8));
      window.__mfe = Object.assign({}, window.__mfe || {}, { [slot]: { slot, kind: 'iframe', build: 'srcdoc', loads, docId, loadedAt: Date.now(), seen: { dragenter: 0, dragover: 0, drop: 0, pointermove: 0, touchstart: 0 } } });
      document.querySelector('[data-testid="tele-loads"]').textContent = String(loads);
      const scroll = document.getElementById('scroll');
      for (let i = 0; i < 100; i++) { const d = document.createElement('div'); d.textContent = 'row ' + i; d.style.height = '20px'; scroll.appendChild(d); }
      window.parent.postMessage({ harbor: 1, slot, type: 'mfe:loaded', payload: { loads, docId } }, '*');
    })();
  </script>
</body></html>`;
