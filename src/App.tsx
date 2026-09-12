import Flex from '@/components/cores/Flex';
import Footer from '@/components/customs/Footer';
import Header from '@/components/customs/Header';
import Main from '@/components/customs/Main';
import { useOptimistic, useState } from 'react';
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

  const addChat: TypeAddChat = (chat) => setChats((prev) => [...prev, chat]);

  /*
   * form action은 트랜지션 안에서 돈다. 그래서 액션 안에서 부른 setState는
   * 액션이 끝나야(= 응답이 와야) 화면에 반영된다. 그동안 화면은 그대로 멈춰 있다.
   *
   * 기다리는 동안 보여줄 것 — 방금 보낸 말풍선과 답변 자리의 스켈레톤 — 은
   * useOptimistic으로 올린다. 액션이 끝나면 자동으로 걷히고 진짜 상태가 자리를 잡는다.
   *
   * 버튼(btnMsg)으로 보낸 경우에는 사용자 말풍선을 만들지 않으므로 null을 넘긴다.
   */
  const [visibleChats, showPending] = useOptimistic(
    chats,
    (current: TypeChat<TypeChatSource>[], userMessage: string | null) => [
      ...current,
      ...(userMessage ? [createReqChatFromMessage(userMessage)] : []),
      createMyChatLoading(locale),
    ]
  );

  const [clickedBtns, setClickedBtns] = useState<string[]>([]);
  const addClickedBtn = (value: string) => setClickedBtns((prev) => [...prev, value]);

  const onSubmit = async (formData: FormData) => {
    const btnMsg = formData.get('btnMsg') as string | null;
    if (btnMsg && clickedBtns.includes(btnMsg)) return;

    const inputMsg = (formData.get('inputMsg') as string | null)?.trim();
    const text = btnMsg || inputMsg;
    if (!text) return;

    showPending(inputMsg ?? null);
    if (inputMsg) addChat(createReqChatFromMessage(inputMsg));

    try {
      const response = await waitAtLeast(1500, sendUserChat({ text, locale }));
      addChat(createMyChatFromResponse(response));
    } catch (error) {
      addChat(createMyChatFromError(error, locale));
    }
  };

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
