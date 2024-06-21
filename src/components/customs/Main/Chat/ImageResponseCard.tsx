import Dialog from '@/components/cores/Dialog';
import Flex from '@/components/cores/Flex';
import Image from '@/components/cores/Image';
import Svg from '@/components/cores/Svg';
import { useAppContext } from '@/contexts';
import _ from 'lodash';
import { Fragment } from 'react/jsx-runtime';
import { twMerge } from 'tailwind-merge';
import { TypeImageResponseCard, TypeImageResponseCardButton } from './types';

export default function ImageResponseCard({ msg, isLast }: { msg: TypeImageResponseCard; isLast: boolean }) {
  const hasImage = !!msg.imageUrl;
  const buttons = msg.buttons;
  return (
    <Fragment>
      <Flex className="w-full">
        {hasImage && (
          <Dialog>
            <Dialog.Trigger
              render={
                <Image
                  src={msg.imageUrl}
                  alt={`${msg.title}${msg.subtitle}`}
                  className="w-full mb-2 max-w-[320px] aspect-square object-cover cursor-zoom-in border-[1.5px] rounded"
                />
              }
            />
            <Dialog.Content>
              <Image
                src={msg.imageUrl}
                alt={`${msg.title}${msg.subtitle}`}
                className="max-h-[80dvh] max-w-[80dvh]"
                noDistortion
              />
              <Dialog.Cancel className="fixed right-5 top-5 text-blue-400">
                <Svg iconName="ic_cancel" />
              </Dialog.Cancel>
            </Dialog.Content>
          </Dialog>
        )}
      </Flex>
      <Flex className="gap-1 flex-wrap">
        {buttons?.map((button, i) => (
          <OptionButton key={`option-button-${i}`} isLast={isLast} button={button} />
        ))}
      </Flex>
    </Fragment>
  );
}

function OptionButton({ button, isLast }: { button: TypeImageResponseCardButton; isLast: boolean }) {
  const isLink = _.first(button.text) === '@';
  const Component = isLink ? OptionButton.Link : OptionButton.Btn;
  return <Component button={button} isLast={isLast} />;
}

OptionButton.Link = function Link({ button }: { button: TypeImageResponseCardButton }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, ...label] = button.text;
  const link = button.value;

  return (
    <a
      href={link}
      target="_blank"
      className={twMerge(
        'rounded-full p-1 px-3 border-[2px] text-gray-500 border-blue-500 transition-all hover:bg-gray-100 shrink-0 shadow-md'
      )}
    >
      <Flex className="gap-1 font-bold">
        <Svg
          iconName="ic_link"
          svgProps={{
            width: '20px',
            height: '20px',
            strokeWidth: '2px',
          }}
        />
        <p>{label}</p>
      </Flex>
    </a>
  );
};

OptionButton.Btn = function Btn({ button, isLast }: { button: TypeImageResponseCardButton; isLast: boolean }) {
  const { clickedBtns, addClickedBtn } = useAppContext();
  const isClicked = clickedBtns.some((btn) => btn === button.value);
  return (
    <button
      type="submit"
      name="btnMsg"
      value={button.value}
      onClick={() => setTimeout(() => addClickedBtn(button.value))}
      className={twMerge(
        'rounded-full p-1 px-3 border-[1.5px] text-gray-500 transition-all hover:bg-gray-100 shrink-0',
        isLast ? 'border-blue-400' : 'border-blue-200',
        isClicked ? 'text-white bg-blue-400 font-bold border-blue-700 hover:bg-blue-400' : 'active:brightness-90'
      )}
    >
      {button.text}
    </button>
  );
};
