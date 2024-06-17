import Flex from '@/components/cores/Flex';
import { twMerge } from 'tailwind-merge';

export default function LoadingMsg() {
  return (
    <Flex
      variants="verticalLeft"
      className={twMerge(
        'border-gray-400/50 pointer-events-none  select-none loading w-[125px] text-left break-words border-[1.5px] rounded rounded-r-2xl rounded-bl-2xl  py-2 px-3 box-content '
      )}
    >
      {'⠀'}
    </Flex>
  );
}
