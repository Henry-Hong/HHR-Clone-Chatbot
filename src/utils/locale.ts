import type { Locale } from '@/types';

/**
 * 화면(인사말·안내 문구)의 언어를 정하는 경로.
 *
 * `/en`  → 영어로 맞이한다
 * 그 외  → 한국어 (content.defaultLocale)
 *
 * navigator.language로 자동 판별하지 않는 이유:
 * 같은 URL이 방문자마다 다른 내용을 내면 검색 엔진이 색인하기 어렵고,
 * 링크를 공유했을 때 상대가 보는 화면을 예측할 수 없다.
 */
const PATH_LOCALE: Record<string, Locale> = {
  '/en': 'en',
  '/en/': 'en',
};

export const localeFromPath = (pathname: string): Locale => PATH_LOCALE[pathname.toLowerCase()] ?? 'ko';

export const pathForLocale = (locale: Locale): string => (locale === 'en' ? '/en' : '/');

/**
 * 질문 하나의 언어를 정한다.
 *
 * 언어 토글을 두면 "영어 모드로 켜둔 채 한국어로 묻는" 상태가 생기고,
 * 그러면 Lex가 엉뚱한 로케일에서 분류해 답을 못 찾는다.
 * 모드를 없애고 질문마다 판별하면 그 상태 자체가 생기지 않는다.
 *
 * 한글이 한 글자라도 있으면 한국어로 본다.
 * 한국어 문장은 조사·어미 때문에 거의 항상 한글을 포함하고,
 * 영어 문장에 한글이 섞이는 일은 사실상 없다.
 * ("Notion 링크 줘" 처럼 섞인 문장은 한국어로 묻는 것이 맞다)
 */
const HANGUL = /[ㄱ-ㆎ가-힣]/;

export const detectLocale = (text: string, fallback: Locale = 'ko'): Locale => {
  if (!text.trim()) return fallback;
  return HANGUL.test(text) ? 'ko' : 'en';
};
