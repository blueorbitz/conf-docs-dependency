import { createContext } from 'react';

export interface AppContextType {
  toggleSpinner: (show: boolean) => void;
  spinner: boolean;
  moduleKey: string;
  siteUrl: string;
}

export const AppContext = createContext<AppContextType>(null);
