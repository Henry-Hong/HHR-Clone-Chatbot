import Flex from '@/components/cores/Flex';
import Footer from '@/components/customs/Footer';
import { useState } from 'react';
import Main from './components/customs/Main';
import './index.css';
import { TypeChat, TypeAddChat } from './components/customs/Main/Chat/types';
import Header from './components/customs/Header';

function App() {
  const [chats, setChats] = useState<TypeChat[]>([]);

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
