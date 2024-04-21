import { useChatMutation } from '@/apis';
import Flex from '@/components/cores/Flex';
import Input from '@/components/cores/Input';
import { useState } from 'react';

interface IFooterProps {}

export default function Footer({}: IFooterProps) {
  const { mutate, data, isPending } = useChatMutation();
  const [text, setText] = useState('');

  return (
    <Flex className="fixed bottom-0 bg-white w-full h-[60px] px-2 py-2 gap-2">
      <button className="bg-blue-300 aspect-square shrink-0 rounded-full w-[44px]"></button>
      <Input
        wrapperClassName="w-full h-full p-0 bg-gray-100 focus:outline-blue-300 rounded-full"
        className="rounded-full py-2 px-4"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rightComponent={<button className="bg-blue-300 aspect-square shrink-0 rounded-full w-[20px] mr-2"></button>}
      ></Input>
    </Flex>
  );
}
