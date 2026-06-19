import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { AppData } from '../types';
import { appReducer, type Action } from './reducer';
import { loadData, saveData } from './storage';
import { createSeedData } from './seed';

interface AppContextValue {
  data: AppData;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

function init(): AppData {
  return loadData() ?? createSeedData();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(appReducer, undefined, init);

  // 変更のたび localStorage に保存
  useEffect(() => {
    saveData(data);
  }, [data]);

  return <AppContext.Provider value={{ data, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
