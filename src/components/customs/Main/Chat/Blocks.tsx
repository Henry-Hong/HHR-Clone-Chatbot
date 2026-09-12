import Dialog from '@/components/cores/Dialog';
import Flex from '@/components/cores/Flex';
import Image from '@/components/cores/Image';
import Svg from '@/components/cores/Svg';
import { useAppContext } from '@/contexts';
import type { Action, Block } from '@/types';
import { twMerge } from 'tailwind-merge';

/* -------------------------------------------------------------------------- */
/*                                    text                                    */
/* -------------------------------------------------------------------------- */

function TextBlock({ html, isLast }: { html: string; isLast: boolean }) {
  return (
    <Flex
      variants="verticalLeft"
      dangerouslySetInnerHTML={{ __html: html }}
      className={twMerge(
        // chat-richtext: 본문 HTML의 목록·문단·링크 스타일. Tailwind preflight가 지운 것을 되살린다 (index.css)
        'chat-richtext text-left break-words border-[1.5px] rounded rounded-r-2xl rounded-bl-2xl bg-gray-100 py-2 px-3 box-content transition-all',
        isLast ? 'border-gray-400/50' : 'border-transparent'
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                                 image                                      */
/* -------------------------------------------------------------------------- */

function ZoomableImage({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  return (
    <Dialog>
      <Dialog.Trigger
        render={
          <Image
            src={src}
            alt={alt ?? ''}
            className={twMerge(
              'aspect-square object-cover cursor-zoom-in border-[1.5px] rounded transition-all hover:brightness-95',
              className
            )}
          />
        }
      />
      <Dialog.Content>
        <Image src={src} alt={alt ?? ''} className="max-h-[80dvh] max-w-[80dvh]" noDistortion />
        <Dialog.Cancel className="fixed right-5 top-5 text-blue-400">
          <Svg iconName="ic_cancel" />
        </Dialog.Cancel>
      </Dialog.Content>
    </Dialog>
  );
}

/**
 * 아직 URL이 없는 이미지 자리.
 * 빈 문자열을 `<img src>`로 넘기면 브라우저가 현재 페이지를 다시 받아온다.
 * 어드민에서 이미지 블록을 막 추가한 직후가 정확히 이 상태다.
 */
function EmptyImage() {
  return (
    <Flex
      variants="horizontalCenter"
      className="w-full max-w-[320px] aspect-square rounded border-[1.5px] border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400"
    >
      이미지 없음
    </Flex>
  );
}

function ImageBlock({ src, alt, caption }: { src: string; alt?: string; caption?: string }) {
  return (
    <Flex variants="verticalLeft" className="w-full gap-1">
      {src ? <ZoomableImage src={src} alt={alt} className="w-full max-w-[320px]" /> : <EmptyImage />}
      {caption && <p className="text-xs text-gray-400">{caption}</p>}
    </Flex>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  gallery                                   */
/* -------------------------------------------------------------------------- */

/** 구 customPayload `ImageList`를 대체. 가로 스크롤로 여러 장을 보여준다. */
function GalleryBlock({ images }: { images: { src: string; alt?: string }[] }) {
  if (images.length === 1) return <ImageBlock src={images[0].src} alt={images[0].alt} />;

  return (
    <Flex className="w-full max-w-[320px] gap-2 overflow-x-auto pb-1 justify-start">
      {images.map((image, index) =>
        image.src ? (
          <ZoomableImage
            key={`gallery-${index}-${image.src}`}
            src={image.src}
            alt={image.alt}
            className="w-[140px] shrink-0"
          />
        ) : (
          <div key={`gallery-${index}-empty`} className="w-[140px] shrink-0">
            <EmptyImage />
          </div>
        )
      )}
    </Flex>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  actions                                   */
/* -------------------------------------------------------------------------- */

function LinkAction({ action }: { action: Extract<Action, { kind: 'link' }> }) {
  return (
    <a
      href={action.url}
      target="_blank"
      rel="noreferrer"
      className="rounded-full p-1 px-3 border-[2px] text-gray-500 border-blue-500 transition-all hover:bg-gray-100 shrink-0 shadow-md"
    >
      <Flex className="gap-1 font-bold">
        <Svg iconName="ic_link" svgProps={{ width: '20px', height: '20px', strokeWidth: '2px' }} />
        <p>{action.label}</p>
      </Flex>
    </a>
  );
}

function AskAction({ action, isLast }: { action: Extract<Action, { kind: 'ask' }>; isLast: boolean }) {
  const { clickedBtns, addClickedBtn } = useAppContext();
  const isClicked = clickedBtns.includes(action.utterance);

  return (
    <button
      type="submit"
      name="btnMsg"
      value={action.utterance}
      onClick={() => setTimeout(() => addClickedBtn(action.utterance))}
      className={twMerge(
        'rounded-full p-1 px-3 border-[1.5px] text-gray-500 transition-all hover:bg-gray-100 shrink-0',
        isLast ? 'border-blue-400' : 'border-blue-200',
        isClicked ? 'text-white bg-blue-400 font-bold border-blue-700 hover:bg-blue-400' : 'active:brightness-90'
      )}
    >
      {action.label}
    </button>
  );
}

function ActionsBlock({ items, isLast }: { items: Action[]; isLast: boolean }) {
  return (
    <Flex className="gap-1 flex-wrap justify-start">
      {items.map((action, index) =>
        action.kind === 'link' ? (
          <LinkAction key={`action-${index}`} action={action} />
        ) : (
          <AskAction key={`action-${index}`} action={action} isLast={isLast} />
        )
      )}
    </Flex>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * 서버가 내려준 Block 하나를 렌더한다.
 *
 * 예전에는 `contentType`을 보고 분기하면서
 *   · title이 '-'이면 제목 없음
 *   · 버튼 라벨이 '@'로 시작하면 링크
 * 같은 암묵적 규칙을 컴포넌트가 알고 있어야 했다.
 * 이제는 타입 자체가 의미를 담고 있어 분기가 단순해졌다.
 */
export default function BlockRenderer({ block, isLast }: { block: Block; isLast: boolean }) {
  switch (block.type) {
    case 'text':
      return <TextBlock html={block.html} isLast={isLast} />;
    case 'image':
      return <ImageBlock src={block.src} alt={block.alt} caption={block.caption} />;
    case 'gallery':
      return <GalleryBlock images={block.images} />;
    case 'actions':
      return <ActionsBlock items={block.items} isLast={isLast} />;
    default:
      return null;
  }
}
