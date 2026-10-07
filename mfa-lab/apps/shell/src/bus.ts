// src/bus.ts — shell이 소유한 버스 하나. 어댑터와 twin이 직접 import한다.
import { createBus } from '@harbor/contract';
export const bus = createBus();
