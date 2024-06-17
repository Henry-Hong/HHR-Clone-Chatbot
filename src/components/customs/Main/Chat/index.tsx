import Flex from '@/components/cores/Flex';
import ImageResponseCard from './ImageResponseCard';
import PlainText from './PlainText';
import { TypeChat, TypeChatSource } from './types';
import React from 'react';
import FallbackIntent from './FallbackIntent';
import Avatar from '@/components/cores/Avatar';
import { motion } from 'framer-motion';
import LoadingMsg from './LoadingMsg';

export default function Chat({ chat, ...rest }: { chat: TypeChat<TypeChatSource>; isLast: boolean }) {
  let Component: React.ElementType = Chat.MyChat;
  if (chat.type === 'user') Component = Chat.UserChat;
  return <Component chat={chat} {...rest} />;
}

Chat.MyChat = function ({ chat, isLast }: { chat: TypeChat<'me'>; isLast: boolean }) {
  const myChat = chat.chat;

  const isEmpty = myChat.messages?.length === 0 ? true : false;
  const confidence = myChat.metadatas?.confidence;

  return (
    <Flex className="md:flex-row flex-col items-start md:justify-start max-w-[90%] gap-3">
      <Avatar />
      <Flex variants="verticalLeft" className="gap-2 group shrink-0 w-full">
        {isEmpty && <FallbackIntent isLast={isLast} />}
        {!isEmpty &&
          myChat.messages?.map((msg, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={`res-${i}`}
            >
              {msg.contentType === 'LoadingMsg' && <LoadingMsg key={`res-loading-${i}`} />}
              {msg.contentType === 'PlainText' && <PlainText key={`res-text-${i}`} isLast={isLast} msg={msg.content} />}
              {msg.contentType === 'ImageResponseCard' && (
                <ImageResponseCard isLast={isLast} key={`res-image-${i}`} msg={msg.imageResponseCard} />
              )}
            </motion.div>
          ))}
        <Flex as="p" className="group-hover:opacity-100 opacity-0 transition-all text-xs text-gray-400">
          {!!confidence && `이해도: ${confidence}`}
        </Flex>
      </Flex>
    </Flex>
  );
};

Chat.UserChat = function ({ chat }: { chat: TypeChat<'user'> }) {
  const userChat = chat.chat;
  return (
    <Flex
      variants="verticalRight"
      className="text-left break-words rounded ml-auto rounded-l-2xl rounded-br-2xl bg-blue-400  py-2 px-3 text-white max-w-[90%]"
    >
      {userChat.message}
    </Flex>
  );
};
