import Svg from '@/components/cores/Svg';
import { twMerge } from 'tailwind-merge';

export default function SendButton({ onClick, isPending }: { isPending: boolean; onClick: () => void }) {
  return (
    <button
      onClick={() => onClick()}
      disabled={isPending ? true : false}
      className={twMerge('mr-2 hover:bg-gray-200 rounded-full p-1 text-blue-400', isPending && 'cursor-not-allowed')}
    >
      {isPending ? (
        <Svg
          iconName="ic_reload"
          svgProps={{
            width: '20px',
            height: '20px',
            className: 'animate-spin',
          }}
        />
      ) : (
        <Svg
          iconName="ic_send"
          svgProps={{
            width: '20px',
            height: '20px',
          }}
        />
      )}
    </button>
  );
}
