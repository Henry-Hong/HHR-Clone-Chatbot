import Flex from '@/components/cores/Flex';
import ImageResponseCard from './ImageResponseCard';
import PlainText from './PlainText';
import { TypeChat, TypeRequestChat, TypeResponseChat } from './types';
import React from 'react';
import Fallback from './Fallback';

export default function Chat({ chat }: { chat: TypeChat }) {
  const Component = chat.type === 'me' ? Chat.MyChat : Chat.UserChat;
  return <Component chat={chat} />;
}

Chat.MyChat = function ({ chat }: { chat: TypeChat }) {
  const myChat = chat.chat as TypeResponseChat;
  const isEmpty = myChat.messages.length === 0 ? true : false;
  return (
    <Flex variants="verticalLeft" className="gap-2">
      {isEmpty && <Fallback />}
      {!isEmpty &&
        myChat.messages.map((msg, i) => (
          <React.Fragment key={`res-${i}`}>
            {msg.contentType === 'PlainText' && <PlainText key={`res-text-${i}`} msg={msg.content} />}
            {msg.contentType === 'ImageResponseCard' && (
              <ImageResponseCard key={`res-image-${i}`} msg={msg.imageResponseCard} />
            )}
          </React.Fragment>
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
