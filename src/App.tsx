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
import { detectLocale, localeFromPath } from './utils/locale';

function App() {
  const { mutateAsync: sendUserChat } = useChatMutation();

  /*
   * 화면 언어는 URL이 정한다 (/ = 한국어, /en = 영어).
   * 인사말과 안내 문구에만 쓰이고, 답변의 언어는 아래에서 질문마다 따로 정한다.
   * 그래서 "영어 화면에서 한국어로 물어도 한국어로 답하는" 게 자연스럽게 된다.
   */
  const uiLocale = localeFromPath(window.location.pathname);
  const [chats, setChats] = useState<TypeChat<TypeChatSource>[]>(() => [getInitialChat(uiLocale)]);

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
    (current: TypeChat<TypeChatSource>[], pending: { userMessage: string | null; locale: Locale }) => [
      ...current,
      ...(pending.userMessage ? [createReqChatFromMessage(pending.userMessage)] : []),
      createMyChatLoading(pending.locale),
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

    /*
     * 답변의 언어는 이 질문의 언어로 정한다. 화면 언어(uiLocale)는 보지 않는다.
     * 언어 토글을 쓰면 "영어로 켜둔 채 한국어로 묻는" 상태가 생기고,
     * 그러면 Lex가 엉뚱한 로케일에서 분류해 인텐트를 못 찾는다.
     */
    const askLocale = detectLocale(text, uiLocale);

    showPending({ userMessage: inputMsg ?? null, locale: askLocale });
    if (inputMsg) addChat(createReqChatFromMessage(inputMsg));

    try {
      const response = await waitAtLeast(1500, sendUserChat({ text, locale: askLocale }));
      addChat(createMyChatFromResponse(response));
    } catch (error) {
      addChat(createMyChatFromError(error, askLocale));
    }
  };

  return (
    <AppContext value={{ clickedBtns, addClickedBtn, addChat, locale: uiLocale }}>
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
