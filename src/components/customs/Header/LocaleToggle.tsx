import { useAppContext } from '@/contexts';
import type { Locale } from '@/types';
import { twMerge } from 'tailwind-merge';

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'EN' },
];

/**
 * 언어 전환. 이후 질문부터 해당 언어로 답한다.
 * 이미 주고받은 대화는 그대로 둔다 (대화 기록을 다시 쓰면 맥락이 어색해진다).
 */
export default function LocaleToggle() {
  const { locale, setLocale } = useAppContext();

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex rounded-full border border-gray-200 overflow-hidden">
      {LOCALES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={locale === value}
          onClick={() => setLocale(value)}
          className={twMerge(
            'text-xs px-2.5 py-1 transition-colors',
            locale === value ? 'bg-blue-400 text-white font-bold' : 'bg-white text-gray-400 hover:bg-gray-50'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
