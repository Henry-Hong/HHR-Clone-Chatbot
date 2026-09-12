import Avatar from '@/components/cores/Avatar';
import Flex from '@/components/cores/Flex';
import BlockRenderer from '@/components/customs/Main/Chat/Blocks';
import { AppContext } from '@/contexts';
import type { Block, Locale } from '@/types';

/**
 * 미리보기는 챗봇이 실제로 쓰는 BlockRenderer를 그대로 재사용한다.
 * 따로 만들지 않기 때문에 "어드민에서는 멀쩡한데 실제로는 깨지는" 상황이 생기지 않는다.
 */
export default function Preview({
  blocks,
  locale,
  title,
}: {
  blocks: Block[];
  locale: Locale;
  title: string;
}) {
  return (
    <AppContext.Provider
      value={{
        clickedBtns: [],
        addClickedBtn: () => {},
        addChat: () => {},
        locale,
        setLocale: () => {},
      }}
    >
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between shrink-0">
          <span className="text-sm font-bold text-gray-600">미리보기</span>
          <span className="text-xs text-gray-400">
            {title} · {locale.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto admin-scroll bg-white p-5">
          {blocks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-10">
              이 언어에는 아직 내용이 없어요.
              <br />
              비어 있으면 기본 언어(한국어) 답변이 대신 나갑니다.
            </p>
          ) : (
            <Flex className="md:flex-row flex-col items-start md:justify-start gap-3">
              <Avatar />
              <Flex variants="verticalLeft" className="gap-2 shrink-0 w-full">
                {blocks.map((block, index) => (
                  <div key={`preview-${index}`} className="w-full">
                    <BlockRenderer block={block} isLast />
                  </div>
                ))}
              </Flex>
            </Flex>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
}
