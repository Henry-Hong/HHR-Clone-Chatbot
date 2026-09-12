import { UI_CONTENT } from '@/generated/ui-content';
import type { Block, Locale, TypeChat } from '@/types';

/**
 * 화면용 문구는 전부 content(S3)에서 온다.
 * 빌드 타임에 src/generated/ui-content.ts로 주입된다. (scripts/gen-ui-content.mjs)
 */
const toMyChat = (blocks: Block[]): TypeChat<'me'> => ({
  type: 'me',
  chat: { locale: 'ko', intent: null, confidence: 1, fallback: false, blocks },
});

const pick = (localized: Record<Locale, Block[]>, locale: Locale): Block[] =>
  localized[locale]?.length ? localized[locale] : localized.ko;

export const getInitialChat = (locale: Locale = 'ko') => toMyChat(pick(UI_CONTENT.initial, locale));
export const getHomeChat = (locale: Locale = 'ko') => toMyChat(pick(UI_CONTENT.home, locale));
export const getFallbackBlocks = (locale: Locale = 'ko') => pick(UI_CONTENT.fallback, locale);
