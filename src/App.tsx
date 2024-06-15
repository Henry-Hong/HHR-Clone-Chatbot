import Flex from '@/components/cores/Flex';
import Footer from '@/components/customs/Footer';
import { useState } from 'react';
import Header from './components/customs/Header';
import Main from './components/customs/Main';
import { TypeAddChat, TypeChat } from './components/customs/Main/Chat/types';
import { INITIAL_CHAT } from './consts';
import './index.css';
import { AppContext } from './context';

function App() {
  const [chats, setChats] = useState<TypeChat[]>([INITIAL_CHAT]);
  const addChat: TypeAddChat = (chat) => {
    setChats((prevChats) => [...prevChats, chat]);
  };

  const [clickedBtns, setClickedBtns] = useState<string[]>([]);
  const addClickedBtn = (btnValue: string) => {
    setClickedBtns((prevBtnValues) => [...prevBtnValues, btnValue]);
  };

  return (
    <AppContext.Provider value={{ clickedBtns, addClickedBtn, addChat }}>
      <Flex variants="verticalCenter" className="bg-white w-screen h-dvh relative">
        <Header />
        <Main chats={chats} />
        <Footer />
      </Flex>
    </AppContext.Provider>
  );
}

export default App;
