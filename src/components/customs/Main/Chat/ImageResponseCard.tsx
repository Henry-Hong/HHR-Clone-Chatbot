import Flex from '@/components/cores/Flex';
import { TypeImageResponseCard, TypeImageResponseCardButton } from './types';

export default function ImageResponseCard({ msg }: { msg: TypeImageResponseCard }) {
  const buttons = msg.buttons;
  return (
    <Flex className="gap-1">
      {buttons?.map((button, i) => (
        <OptionButton key={`option-button-${i}`} button={button} />
      ))}
    </Flex>
  );
}

function OptionButton({ button }: { button: TypeImageResponseCardButton }) {
  const handleClickBtn = (value: string) => {
    alert(value);
  };

  return (
    <button
      className="rounded-full border-blue-400 border-2 p-1 px-3 text-gray-500 transition-all hover:bg-gray-100"
      onClick={() => handleClickBtn(button.value)}
    >
      {button.text}
    </button>
  );
}
