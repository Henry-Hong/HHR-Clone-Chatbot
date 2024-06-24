import Svg from '@/components/cores/Svg';
import { HOMEBUTTON_CHAT } from '@/consts';
import { useAppContext } from '@/contexts';

export default function Homebutton() {
  const { addChat } = useAppContext();

  return (
    <button
      onClick={() => addChat(HOMEBUTTON_CHAT)}
      type="button"
      className="bg-blue-400 aspect-square shrink-0 rounded-full w-[44px] flex justify-center items-center text-white hover:brightness-90"
    >
      <Svg iconName="ic_house" svgProps={{ width: '24px', height: '24px' }} />
    </button>
  );
}
