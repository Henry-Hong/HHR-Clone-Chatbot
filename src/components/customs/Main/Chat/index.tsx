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
    <Flex variants="verticalLeft" className="gap-2">
      {myChat.messages.map((msg, i) => (
        <>
          {msg.contentType === 'PlainText' && <PlainText key={`res-${i}`} msg={msg.content} />}
          {msg.contentType === 'ImageResponseCard' && (
            <ImageResponseCard key={`res-${i}`} msg={msg.imageResponseCard} />
          )}
        </>
      ))}
    </Flex>
  );
};

Chat.UserChat = function ({ chat }: { chat: TypeChat }) {
  const userChat = chat.chat as TypeRequestChat;
  return (
    <Flex
      variants="verticalRight"
      className="text-left break-words rounded ml-auto rounded-l-2xl rounded-br-2xl bg-blue-400  py-2 px-3 text-white max-w-[90%]"
    >
      {userChat.message}
    </Flex>
  );
};
