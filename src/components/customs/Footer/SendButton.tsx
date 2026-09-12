import { RefreshCw, Send } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export default function SendButton({ isPending }: { isPending: boolean }) {
  return (
    <button
      type="submit"
      aria-label={isPending ? '보내는 중' : '보내기'}
      disabled={isPending}
      className={twMerge('mr-2 hover:bg-gray-200 rounded-full p-1 text-blue-400', isPending && 'cursor-not-allowed')}
    >
      {isPending ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
    </button>
  );
}
