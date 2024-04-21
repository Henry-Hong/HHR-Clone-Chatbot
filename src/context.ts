import { createContext, useContext } from 'react';

interface IAppContext {
  clickedBtns: string[];
  addClickedBtn: (btnValue: string) => void;
}

export const AppContext = createContext<IAppContext | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw Error('Custom useAppContext Error : you should use this hook inside <App />');
  }

  return context;
};
