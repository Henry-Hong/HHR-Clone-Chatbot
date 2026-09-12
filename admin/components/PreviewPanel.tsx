import { useMemo, useState } from 'react';
import { Callout, Classes, NonIdealState, Switch, Tag, Tooltip } from '@blueprintjs/core';
import Avatar from '@/components/cores/Avatar';
import Flex from '@/components/cores/Flex';
import BlockRenderer from '@/components/customs/Main/Chat/Blocks';
import { AppContext } from '@/contexts';
import type { Block, Locale } from '@/types';
import { uidOf } from '../lib/uid';

/**
 * 미리보기는 챗봇이 실제로 쓰는 `BlockRenderer`를 그대로 재사용한다.
 * 따로 만들지 않기 때문에 "어드민에서는 멀쩡한데 실제로는 깨지는" 상황이 구조적으로 생기지 않는다.
 *
 * 어드민이 다크 모드여도 챗봇은 밝은 화면이므로 이 영역만 항상 흰 배경으로 고정한다.
 */
export default function PreviewPanel({
  blocks,
  locale,
  fallbackBlocks,
}: {
  blocks: Block[];
  locale: Locale;
  /** 이 로케일이 비었을 때 실제로 나갈 기본 언어 답변 */
  fallbackBlocks: Block[];
}) {
  // 미리보기에서도 버튼을 눌러보면 눌린 상태가 보이도록 로컬로만 기록한다.
  const [clickedBtns, setClicked] = useState<string[]>([]);

  /*
   * 챗봇은 `isLast`를 답변 하나 전체에 같은 값으로 준다 (Chat/index.tsx).
   * 방금 도착한 답변이면 말풍선 테두리와 버튼이 진해지고, 뒤로 밀리면 흐려진다.
   * 기본값은 "방금 도착한 상태"이고, 토글로 밀려난 뒤 모습도 확인할 수 있다.
   */
  const [isLatest, setIsLatest] = useState(true);

  /*
   * 아래 바깥 레이아웃은 챗봇 페이지의 것이고, 진짜 재사용 대상은 그 안의 BlockRenderer다.
   * 챗봇 본문은 화면 폭을 다 쓰지만 미리보기 패널은 좁으므로 `shrink-0 w-full` 대신
   * 줄어들 수 있게 바꾼다. 안 그러면 아바타 폭만큼 말풍선이 오른쪽으로 잘린다.
   */
  const showing = blocks.length > 0 ? blocks : fallbackBlocks;
  const isFallback = blocks.length === 0 && fallbackBlocks.length > 0;

  const context = useMemo(
    () => ({
      clickedBtns,
      addClickedBtn: (value: string) => setClicked((prev) => (prev.includes(value) ? prev : [...prev, value])),
      addChat: () => {},
      locale,
      setLocale: () => {},
    }),
    [clickedBtns, locale]
  );

  return (
    <AppContext value={context}>
      <div className="admin-scroll admin-pad admin-stack-sm" style={{ flex: 1 }}>
        {isFallback && (
          <Callout compact icon="translate" intent="warning">
            이 언어에는 답변이 없어서 기본 언어 답변이 나갑니다.
          </Callout>
        )}

        <div className="admin-preview">
          {showing.length === 0 ? (
            <NonIdealState
              icon="chat"
              title="보여줄 답변이 없어요"
              description="블록을 추가하면 여기에 실제 챗봇 화면 그대로 나타납니다."
              layout="vertical"
              className={Classes.TEXT_MUTED}
            />
          ) : (
            <Flex className="flex-row items-start justify-start gap-3">
              <Avatar />
              <Flex variants="verticalLeft" className="gap-2 min-w-0 flex-1">
                {showing.map((block) => (
                  <div key={uidOf(block)} className="w-full">
                    <BlockRenderer block={block} isLast={isLatest} />
                  </div>
                ))}
              </Flex>
            </Flex>
          )}
        </div>

        <div className="admin-inline admin-inline--wrap">
          <Tooltip compact content="미리보기는 챗봇이 쓰는 BlockRenderer를 그대로 씁니다.">
            <Tag minimal icon="mobile-phone">
              챗봇과 같은 렌더러
            </Tag>
          </Tooltip>
          <Tooltip compact content="방금 도착한 답변인지 / 대화가 더 이어진 뒤인지. 테두리와 버튼 색이 달라집니다.">
            <Switch
              checked={isLatest}
              label="최신 답변"
              inline
              style={{ margin: 0 }}
              onChange={(event) => setIsLatest(event.currentTarget.checked)}
            />
          </Tooltip>
          {clickedBtns.length > 0 && (
            <Tag
              minimal
              icon="refresh"
              interactive
              onClick={() => setClicked([])}
              htmlTitle="눌린 버튼 표시 초기화"
            >
              눌림 {clickedBtns.length} · 초기화
            </Tag>
          )}
        </div>
      </div>
    </AppContext>
  );
}
