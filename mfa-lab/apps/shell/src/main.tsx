import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installInstrumentation, markError } from './instrumentation';
import { Workspace, ShellError } from './workspace/Workspace';
import { components } from './workspace/store';
import { parseFlags } from './workspace/flags';
import './tokens.css';

installInstrumentation();                        // window.__fc 뼈대를 먼저 만든다
const parsed = parseFlags(window.location.search, components.has);
const root = createRoot(document.getElementById('root')!);
if (!parsed.ok) {
  markError(parsed.error);
  root.render(<ShellError message={parsed.error} />);
} else if (parsed.flags.strict) {
  root.render(<StrictMode><Workspace flags={parsed.flags} /></StrictMode>);   // strict=1은 P1 전용
} else {
  root.render(<Workspace flags={parsed.flags} />);   // StrictMode 없음 (effect 이중 실행이 카운터를 두 배로 만든다)
}
