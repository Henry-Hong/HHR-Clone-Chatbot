import Flex from '@/components/cores/Flex';

export default function Header() {
  return (
    <Flex className="w-full p-2 h-[64px] fixed top-0 shadow-md z-10 bg-white">
      <Flex as="h1" className="text-4xl">
        <button>{'🤖'}</button>
      </Flex>
    </Flex>
  );
}
