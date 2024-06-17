import Svg from '@/components/cores/Svg';
import { twMerge } from 'tailwind-merge';

export default function SendButton({ isPending }: { isPending: boolean }) {
  return (
    <button
      type="submit"
      disabled={isPending ? true : false}
      className={twMerge('mr-2 hover:bg-gray-200 rounded-full p-1 text-blue-400', isPending && 'cursor-not-allowed')}
    >
      <Svg
        iconName={isPending ? 'ic_reload' : 'ic_send'}
        svgProps={{
          width: '20px',
          height: '20px',
          className: isPending ? 'animate-spin' : '',
        }}
      />
    </button>
  );
}
