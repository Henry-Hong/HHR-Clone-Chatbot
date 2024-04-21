import Flex from '@/components/cores/Flex';
import { TypeImageResponseCard } from './types';

export default function ImageResponseCard({ msg }: { msg: TypeImageResponseCard }) {
  const title = msg.title;
  // const subtitle = msg.subtitle;
  // const buttons = msg.buttons;

  return <Flex>{title}</Flex>;
}
