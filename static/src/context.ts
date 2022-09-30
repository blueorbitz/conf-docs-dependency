import { createContext } from 'react';

export interface AppContextType {
  toggleSpinner: (show: boolean) => void;
  accountId: string;
  cloudId: string;
  appId: string;
  envId: string;
  session?: string;
}

export const AppContext = createContext<AppContextType>(null);
