import Flex from '@/components/cores/Flex';
import Footer from '@/components/customs/Footer';
import { useState } from 'react';
import Header from './components/customs/Header';
import Main from './components/customs/Main';
import { TypeAddChat, TypeChat } from './components/customs/Main/Chat/types';
import { INITIAL_CHAT } from './consts';
import './index.css';

function App() {
  const [chats, setChats] = useState<TypeChat[]>([INITIAL_CHAT]);

  const addChat: TypeAddChat = (chat: TypeChat) => {
    setChats((prevChats) => [...prevChats, chat]);
  };

  return (
    <Flex variants="verticalCenter" className="bg-white w-screen h-dvh relative">
      <Header />
      <Main chats={chats} />
      <Footer addChat={addChat} />
    </Flex>
  );
}

export default App;
