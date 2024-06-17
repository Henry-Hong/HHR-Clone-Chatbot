import Flex from '@/components/cores/Flex';
import Footer from '@/components/customs/Footer';
import { useOptimistic, useState } from 'react';
import { useChatMutation } from './apis';
import Header from './components/customs/Header';
import Main from './components/customs/Main';
import { TypeAddChat, TypeChat, TypeChatSource, TypeResponseChat } from './components/customs/Main/Chat/types';
import { INITIAL_CHAT } from './consts';
import { AppContext } from './contexts';
import './index.css';
import {
  createMyChatFromResponse,
  createMyChatLoadingMsg,
  createMyChayChatFromError,
  createReqChatFromMessage,
  waitAtLeast,
} from './utils';

function App() {
  const { mutateAsync: sendUserChat } = useChatMutation();

  const [chats, setChats] = useState<TypeChat<TypeChatSource>[]>([INITIAL_CHAT]);
  const [optiChats, addOptiChats] = useOptimistic(chats, (prev, newChat) =>
    prev.concat(newChat as TypeChat<TypeChatSource>)
  );

  const addChat: TypeAddChat = (chat) => {
    setChats((prevChats) => [...prevChats, chat]);
  };

  const onSubmit = async (formData: FormData) => {
    const btnMsg = formData.get('btnMsg') as string;
    if (clickedBtns.includes(btnMsg)) return;

    const inputMsg = formData.get('inputMsg') as string;
    if (inputMsg) addOptiChats(createReqChatFromMessage(inputMsg));
    addOptiChats(createMyChatLoadingMsg());

    const msg = btnMsg || inputMsg;

    try {
      const myChatResponse = await waitAtLeast(1500, sendUserChat(msg)); // TODO: make it Generic
      if (inputMsg) addChat(createReqChatFromMessage(inputMsg));
      addChat(createMyChatFromResponse(myChatResponse as TypeResponseChat));
    } catch (error) {
      if (inputMsg) addChat(createReqChatFromMessage(inputMsg));
      addChat(createMyChayChatFromError(error));
    }
  };

  const [clickedBtns, setClickedBtns] = useState<string[]>([]);
  const addClickedBtn = (btnValue: string) => setClickedBtns((prevBtnValues) => [...prevBtnValues, btnValue]);

  return (
    <AppContext.Provider value={{ clickedBtns, addClickedBtn, addChat }}>
      <Flex as="form" action={onSubmit} variants="verticalCenter" className="bg-white w-screen h-dvh relative">
        <Header />
        <Main chats={optiChats} />
        <Footer />
      </Flex>
    </AppContext.Provider>
  );
}

export default App;
