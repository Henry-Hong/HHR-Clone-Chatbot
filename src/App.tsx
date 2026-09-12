import Flex from '@/components/cores/Flex';
import Footer from '@/components/customs/Footer';
import Header from '@/components/customs/Header';
import Main from '@/components/customs/Main';
import { useState } from 'react';
import { useChatMutation } from './apis';
import type { Locale, TypeAddChat, TypeChat, TypeChatSource } from '@/types';
import { getInitialChat } from './consts';
import { AppContext } from './contexts';
import './index.css';
import {
  createMyChatFromError,
  createMyChatFromResponse,
  createMyChatLoading,
  createReqChatFromMessage,
  waitAtLeast,
} from './utils';

const detectLocale = (): Locale => (navigator.language?.startsWith('ko') ? 'ko' : 'en');

function App() {
  const { mutateAsync: sendUserChat } = useChatMutation();

  const [locale, setLocale] = useState<Locale>(detectLocale);
  const [chats, setChats] = useState<TypeChat<TypeChatSource>[]>(() => [getInitialChat(detectLocale())]);
  const [pending, setPending] = useState(false);

  const addChat: TypeAddChat = (chat) => setChats((prev) => [...prev, chat]);

  const [clickedBtns, setClickedBtns] = useState<string[]>([]);
  const addClickedBtn = (value: string) => setClickedBtns((prev) => [...prev, value]);

  const onSubmit = async (formData: FormData) => {
    const btnMsg = formData.get('btnMsg') as string | null;
    if (btnMsg && clickedBtns.includes(btnMsg)) return;

    const inputMsg = (formData.get('inputMsg') as string | null)?.trim();
    const text = btnMsg || inputMsg;
    if (!text) return;

    if (inputMsg) addChat(createReqChatFromMessage(inputMsg));
    setPending(true);

    try {
      const response = await waitAtLeast(1500, sendUserChat({ text, locale }));
      addChat(createMyChatFromResponse(response));
    } catch (error) {
      addChat(createMyChatFromError(error, locale));
    } finally {
      setPending(false);
    }
  };

  const visibleChats = pending ? [...chats, createMyChatLoading(locale)] : chats;

  return (
    <AppContext value={{ clickedBtns, addClickedBtn, addChat, locale, setLocale }}>
      <Flex as="form" action={onSubmit} variants="verticalCenter" className="bg-white w-screen h-dvh relative">
        <button className="hidden" /> {/* implicit submit 방지 */}
        <Header />
        <Main chats={visibleChats} />
        <Footer />
      </Flex>
    </AppContext>
  );
}

export default App;
