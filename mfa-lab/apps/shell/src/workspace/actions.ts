// NavPanel에 레이아웃 조작을 넘기는 shell 내부 context.
import { createContext, useContext } from 'react';
import type { InsertAt, InsertPanelInit } from '@dannysir/floating-components';

export interface WorkspaceActions {
  layout: string;
  panelIds: string[];
  removePanel: (id: string) => void;
  insertPanel: (o: { panel: InsertPanelInit; at?: InsertAt }) => unknown;
}

export const ActionsContext = createContext<WorkspaceActions | null>(null);
export const useWorkspaceActions = () => useContext(ActionsContext);
