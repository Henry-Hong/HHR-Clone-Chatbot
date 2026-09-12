import Flex from '@/components/cores/Flex';
import Avatar from '@/components/cores/Avatar';
import { motion } from 'framer-motion';
import type { TypeChat, TypeChatSource } from '@/types';
import BlockRenderer from './Blocks';
import LoadingMsg from './LoadingMsg';
import { getFallbackBlocks } from '@/consts';

export default function Chat({ chat, isLast }: { chat: TypeChat<TypeChatSource>; isLast: boolean }) {
  if (chat.type === 'user') return <UserChat chat={chat as TypeChat<'user'>} />;
  return <MyChat chat={chat as TypeChat<'me'>} isLast={isLast} />;
}

function MyChat({ chat, isLast }: { chat: TypeChat<'me'>; isLast: boolean }) {
  const { locale, confidence, fallback, blocks } = chat.chat;

  // 서버가 fallback 블록을 못 채워준 경우에만 로컬 문구를 쓴다
  const rendered = blocks.length ? blocks : fallback ? getFallbackBlocks(locale) : [];

  return (
    <Flex className="md:flex-row flex-col items-start md:justify-start max-w-[90%] gap-3">
      <Avatar />
      <Flex variants="verticalLeft" className="gap-2 group shrink-0 w-full">
        {chat.pending && <LoadingMsg />}

        {!chat.pending &&
          rendered.map((block, index) => (
            <motion.div
              key={`block-${index}-${block.type}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="w-full"
            >
              <BlockRenderer block={block} isLast={isLast} />
            </motion.div>
          ))}

        <Flex as="p" className="group-hover:opacity-100 opacity-0 transition-all text-xs text-gray-400">
          {!chat.pending && !!confidence && `이해도: ${confidence}`}
        </Flex>
      </Flex>
    </Flex>
  );
}

function UserChat({ chat }: { chat: TypeChat<'user'> }) {
  return (
    <Flex
      variants="verticalRight"
      className="text-left break-words rounded ml-auto rounded-l-2xl rounded-br-2xl bg-blue-400 py-2 px-3 text-white max-w-[90%]"
    >
      {chat.chat.message}
    </Flex>
  );
}
