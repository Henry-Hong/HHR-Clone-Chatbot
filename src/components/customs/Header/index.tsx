import Flex from '@/components/cores/Flex';
import Robot from '/img_robot.gif';

export default function Header() {
  return (
    <Flex className="w-full justify-center p-2 h-[64px] fixed top-0 shadow-md z-10 bg-white">
      <img src={Robot} className="w-[90px] -mb-2 pointer-events-none select-none" />
    </Flex>
  );
}
