import { House } from 'lucide-react';
import { getHomeChat } from '@/consts';
import { useAppContext } from '@/contexts';

export default function Homebutton() {
  const { addChat, locale } = useAppContext();

  return (
    <button
      onClick={() => addChat(getHomeChat(locale))}
      type="button"
      className="bg-blue-400 aspect-square shrink-0 rounded-full w-[44px] flex justify-center items-center text-white hover:brightness-90"
    >
      <House size={24} aria-hidden />
    </button>
  );
}
