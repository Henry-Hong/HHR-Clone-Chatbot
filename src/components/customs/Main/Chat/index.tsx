import Flex from '@/components/cores/Flex';
import ImageResponseCard from './ImageResponseCard';
import PlainText from './PlainText';
import { TypeChat, TypeRequestChat, TypeResponseChat } from './types';

export default function Chat({ chat }: { chat: TypeChat }) {
  const Component = chat.type === 'me' ? Chat.MyChat : Chat.UserChat;
  return <Component chat={chat} />;
}

Chat.MyChat = function ({ chat }: { chat: TypeChat }) {
  const myChat = chat.chat as TypeResponseChat;
  return (
    <Flex variants="verticalLeft" className="w-full bg-gray-100">
      {myChat.messages.map((msg) => (
        <>
          {msg.contentType === 'PlainText' && <PlainText msg={msg.content} />}
          {msg.contentType === 'ImageResponseCard' && <ImageResponseCard msg={msg.imageResponseCard} />}
        </>
      ))}
    </Flex>
  );
};

Chat.UserChat = function ({ chat }: { chat: TypeChat }) {
  const userChat = chat.chat as TypeRequestChat;
  return (
    <Flex variants="verticalRight" className="w-full">
      {userChat.message}
    </Flex>
  );
};
