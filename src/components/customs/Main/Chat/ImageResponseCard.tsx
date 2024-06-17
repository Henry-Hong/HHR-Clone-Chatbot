import Flex from '@/components/cores/Flex';
import { TypeImageResponseCard, TypeImageResponseCardButton } from './types';
import { twMerge } from 'tailwind-merge';
import { useAppContext } from '@/context';
import _ from 'lodash';
import Svg from '@/components/cores/Svg';

export default function ImageResponseCard({ msg, isLast }: { msg: TypeImageResponseCard; isLast: boolean }) {
  const buttons = msg.buttons;
  return (
    <Flex className="gap-1 flex-wrap">
      {buttons?.map((button, i) => (
        <OptionButton key={`option-button-${i}`} isLast={isLast} button={button} />
      ))}
    </Flex>
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
      name="message"
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
