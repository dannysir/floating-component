// src/standalone.tsx — 레이아웃 없이 같은 Panel. 버스는 자기 createBus() 인스턴스(stub). window.__fc가 없으므로 reactSame은 null.
import { createRoot } from 'react-dom/client';
import { createBus } from '@harbor/contract';
import { Panel } from './Panel';

createRoot(document.getElementById('root')!).render(<Panel slot="board" bus={createBus()} />);
