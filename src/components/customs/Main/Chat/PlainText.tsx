import Flex from '@/components/cores/Flex';

export default function PlainText({ msg }: { msg: string }) {
  return (
    <Flex className="text-left break-words rounded rounded-r-2xl rounded-bl-2xl bg-gray-100 py-2 px-3">{msg}</Flex>
  );
}
