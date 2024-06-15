import Flex from '@/components/cores/Flex';
import ImageResponseCard from './ImageResponseCard';
import PlainText from './PlainText';
import { TypeChat, TypeRequestChat, TypeResponseChat } from './types';
import React from 'react';
import FallbackIntent from './FallbackIntent';
import Avatar from '@/components/cores/Avatar';

export default function Chat({ chat, ...rest }: { chat: TypeChat; isLast: boolean }) {
  const Component = chat.type === 'me' ? Chat.MyChat : Chat.UserChat;
  return <Component chat={chat} {...rest} />;
}

Chat.MyChat = function ({ chat, isLast }: { chat: TypeChat; isLast: boolean }) {
  const myChat = chat.chat as TypeResponseChat;
  const isEmpty = myChat.messages.length === 0 ? true : false;
  const confidence = myChat.metadatas?.confidence;

  return (
    <Flex className="md:flex-row flex-col items-start md:justify-start max-w-[90%] gap-3">
      <Avatar />
      <Flex variants="verticalLeft" className="gap-2 group shrink-0 w-full">
        {isEmpty && <FallbackIntent isLast={isLast} />}
        {!isEmpty &&
          myChat.messages.map((msg, i) => (
            <React.Fragment key={`res-${i}`}>
              {msg.contentType === 'PlainText' && <PlainText key={`res-text-${i}`} isLast={isLast} msg={msg.content} />}
              {msg.contentType === 'ImageResponseCard' && (
                <ImageResponseCard isLast={isLast} key={`res-image-${i}`} msg={msg.imageResponseCard} />
              )}
            </React.Fragment>
          ))}
        <Flex as="p" className="group-hover:opacity-100 opacity-0 transition-all text-xs text-gray-400">
          {!!confidence && `이해도: ${confidence}`}
        </Flex>
      </Flex>
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
