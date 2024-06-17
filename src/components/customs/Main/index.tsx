import Flex from '@/components/cores/Flex';
import Chat from './Chat';
import { TypeChat, TypeChatSource } from './Chat/types';
import { useEffect, useRef } from 'react';

export default function Main({ chats }: { chats: TypeChat<TypeChatSource>[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  return (
    <Flex
      variants="verticalLeft"
      as="main"
      className="w-full h-full p-5 mt-[64px] pt-[26px] pb-[64px] overflow-y-scroll gap-4 z-0"
    >
      {chats.map((chat, i) => (
        <Chat key={`chat-${i}`} isLast={i === chats.length - 1} chat={chat} />
      ))}
      <div ref={bottomRef} />
    </Flex>
  );
}
