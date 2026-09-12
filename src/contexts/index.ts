import { createContext, useContext } from 'react';
import type { Locale, TypeAddChat } from '@/types';

interface IAppContext {
  clickedBtns: string[];
  addClickedBtn: (btnValue: string) => void;
  addChat: TypeAddChat;
  /** 화면 언어. URL이 정하고 앱 안에서는 바뀌지 않는다 (utils/locale.ts) */
  locale: Locale;
}

export const AppContext = createContext<IAppContext | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw Error('Custom useAppContext Error : you should use this hook inside <App />');
  return context;
};
