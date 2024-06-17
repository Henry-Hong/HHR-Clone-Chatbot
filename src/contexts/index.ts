import { createContext, useContext } from 'react';
import { TypeAddChat } from '../components/customs/Main/Chat/types';

interface IAppContext {
  clickedBtns: string[];
  addClickedBtn: (btnValue: string) => void;
  addChat: TypeAddChat;
}

export const AppContext = createContext<IAppContext | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw Error('Custom useAppContext Error : you should use this hook inside <App />');
  }

  return context;
};
