import Flex from '@/components/cores/Flex';
import Chat from './Chat';
import { TypeChat } from './Chat/types';

export default function Main({ chats }: { chats: TypeChat[] }) {
  return (
    <Flex variants="verticalLeft" as="main" className="w-full h-full">
      {chats.map((chat) => (
        <Chat chat={chat} />
      ))}
    </Flex>
  );
}
