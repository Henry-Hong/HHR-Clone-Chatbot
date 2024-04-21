import { useChatMutation } from '@/apis';
import Flex from '@/components/cores/Flex';
import Input from '@/components/cores/Input';
import { useState } from 'react';
import SendButton from './SendButton';
import HomeButton from './HomeButton';
import { TypeAddChat, TypeChat, TypeResponseChat } from '../Main/Chat/types';

export default function Footer({ addChat }: { addChat: TypeAddChat }) {
  const { isPending, mutateAsync: sendUserChat } = useChatMutation();

  const [text, setText] = useState('');
  const clearText = () => setText('');

  const createReqChatFromMessage = (message: string): TypeChat => {
    return {
      type: 'user',
      chat: { message },
    };
  };

  const createMyChatFromResponse = (response: TypeResponseChat): TypeChat => {
    return {
      type: 'me',
      chat: response,
    };
  };

  const createMyChayChatFromError = (): TypeChat => {
    return {
      type: 'me',
      chat: {
        messages: [
          {
            contentType: 'PlainText',
            content: '다시 한번 말씀해주세요.',
          },
        ],
      },
    };
  };

  const handleClickSendBtn = () => {
    if (text) {
      addChat(createReqChatFromMessage(text));
      sendUserChat(text)
        .then((myChatResponse) => addChat(createMyChatFromResponse(myChatResponse)))
        .catch(() => addChat(createMyChayChatFromError()));
      clearText();
    }
  };

  return (
    <Flex className="fixed bottom-0 bg-white w-full h-[60px] pl-4 pr-2 py-2 gap-2">
      <HomeButton onClick={() => {}} />
      <Input
        wrapperClassName="w-full h-full p-0 bg-gray-100 focus:outline-blue-400 rounded-full"
        className="rounded-full py-2 px-4"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rightComponent={<SendButton isPending={isPending} onClick={handleClickSendBtn} />}
      />
    </Flex>
  );
}
