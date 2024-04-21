import Flex from '@/components/cores/Flex';
import { twMerge } from 'tailwind-merge';

export default function PlainText({ msg, isLast }: { msg: string; isLast: boolean }) {
  return (
    <Flex
      className={twMerge(
        'text-left break-words border-[1.5px] rounded rounded-r-2xl rounded-bl-2xl bg-gray-100 py-2 px-3 box-content transition-all',
        isLast ? 'border-gray-400/50' : 'border-transparent'
      )}
    >
      {msg}
    </Flex>
  );
}
