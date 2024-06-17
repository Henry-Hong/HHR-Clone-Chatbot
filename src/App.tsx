import Flex from '@/components/cores/Flex';
import Footer from '@/components/customs/Footer';
import { useOptimistic, useState } from 'react';
import Header from './components/customs/Header';
import Main from './components/customs/Main';
import { TypeAddChat, TypeChat } from './components/customs/Main/Chat/types';
import { INITIAL_CHAT } from './consts';
import './index.css';
import { AppContext } from './context';
import { useChatMutation } from './apis';
import { createMyChatFromResponse, createMyChayChatFromError } from './utils';

function App() {
  const { mutateAsync: sendUserChat } = useChatMutation();

  const [chats, setChats] = useState<TypeChat[]>([INITIAL_CHAT]);
  const [optChats, addOptChats] = useOptimistic(chats, (prev, newChat) => prev.concat(newChat as TypeChat));

  const addChat: TypeAddChat = (chat) => {
    setChats((prevChats) => [...prevChats, chat]);
  };

  const [clickedBtns, setClickedBtns] = useState<string[]>([]);
  const addClickedBtn = (btnValue: string) => {
    setClickedBtns((prevBtnValues) => [...prevBtnValues, btnValue]);
  };

  const onSubmit = async (formData: FormData) => {
    const message = formData.get('message') as string;
    if (clickedBtns.includes(message)) return;

    const chat: TypeChat = {
      type: 'me',
      chat: {
        messages: [
          {
            contentType: 'PlainText',
            content: '..',
          },
        ],
      },
    };

    addOptChats(chat);
    const delay = (ms: number = 5000) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      const [myChatResponse] = await Promise.all([sendUserChat(message), delay(1500)]);
      addChat(createMyChatFromResponse(myChatResponse));
    } catch {
      addChat(createMyChayChatFromError());
    }
  };

  return (
    <AppContext.Provider value={{ clickedBtns, addClickedBtn, addChat }}>
      <Flex as="form" action={onSubmit} variants="verticalCenter" className="bg-white w-screen h-dvh relative">
        <Header />
        <Main chats={optChats} />
        <Footer />
      </Flex>
    </AppContext.Provider>
  );
}

export default App;
