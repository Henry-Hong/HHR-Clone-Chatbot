import Flex from '@/components/cores/Flex';
import { TypeImageResponseCard, TypeImageResponseCardButton } from './types';
import { twMerge } from 'tailwind-merge';

export default function ImageResponseCard({ msg, isLast }: { msg: TypeImageResponseCard; isLast: boolean }) {
  const buttons = msg.buttons;
  return (
    <Flex className="gap-1">
      {buttons?.map((button, i) => (
        <OptionButton key={`option-button-${i}`} isLast={isLast} button={button} />
      ))}
    </Flex>
  );
}

function OptionButton({ button, isLast }: { button: TypeImageResponseCardButton; isLast: boolean }) {
  const handleClickBtn = (value: string) => {
    alert(value);
  };

  return (
    <button
      onClick={() => handleClickBtn(button.value)}
      className={twMerge(
        'rounded-full p-1 px-3 border-[1.5px] text-gray-500 transition-all hover:bg-gray-100',
        isLast ? 'border-blue-400' : 'border-blue-200'
      )}
    >
      {button.text}
    </button>
  );
}
