import Svg from '@/components/cores/Svg';

export default function Homebutton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-400 aspect-square shrink-0 rounded-full w-[44px] flex justify-center items-center text-white hover:brightness-90"
    >
      <Svg iconName="ic_house" svgProps={{ width: '24px', height: '24px' }} />
    </button>
  );
}
