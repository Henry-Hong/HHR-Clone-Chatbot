import { useChatMutation } from '@/apis';
import Flex from '@/components/cores/Flex';
import Input from '@/components/cores/Input';
import { useState } from 'react';
import SendButton from './SendButton';
import HomeButton from './HomeButton';

interface IFooterProps {}

export default function Footer({}: IFooterProps) {
  const { data, isPending, mutate: sendUserChat } = useChatMutation();

  const [text, setText] = useState('');

  const handleClickSend = () => {
    if (text) {
      sendUserChat(text);
      setText('');
    }
  };

  return (
    <Flex className="fixed bottom-0 bg-white w-full h-[60px] pl-4 pr-2 py-2 gap-2">
      <HomeButton onClick={() => {}} />
      <Input
        wrapperClassName="w-full h-full p-0 bg-gray-100 focus:outline-blue-300 rounded-full"
        className="rounded-full py-2 px-4"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rightComponent={<SendButton isPending={isPending} onClick={handleClickSend} />}
      ></Input>
    </Flex>
  );
}
