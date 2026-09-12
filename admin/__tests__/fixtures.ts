import type { Block, ContentFile, Entry, Locale } from '@/types';
import type { EntryKind } from '@/types/content';

/** 테스트에서 쓰는 최소 엔트리. 필요한 필드만 덮어쓴다. */
export const entry = (over: Partial<Entry> & { id: string }): Entry => ({
  title: over.id,
  kind: 'intent' as EntryKind,
  enabled: true,
  showInFaq: false,
  order: 0,
  utterances: { ko: [], en: [] },
  blocks: { ko: [], en: [] },
  ...over,
});

export const systemEntries = (): Entry[] => [
  entry({ id: '__initial', kind: 'system', order: 0 }),
  entry({ id: '__home', kind: 'system', order: 1 }),
  entry({ id: '__fallback', kind: 'system', order: 2 }),
];

export const content = (entries: Entry[], over: Partial<ContentFile> = {}): ContentFile => ({
  schemaVersion: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
  defaultLocale: 'ko',
  entries,
  ...over,
});

/** system 엔트리를 자동으로 얹어주는 편의 함수. 구조 오류로 테스트가 흐려지지 않게. */
export const contentWithSystem = (entries: Entry[], over: Partial<ContentFile> = {}): ContentFile =>
  content([...systemEntries(), ...entries], over);

export const text = (html: string): Block => ({ type: 'text', html });

export const ask = (label: string, utterance: string): Block => ({
  type: 'actions',
  items: [{ kind: 'ask', label, utterance }],
});

export const link = (label: string, url: string): Block => ({
  type: 'actions',
  items: [{ kind: 'link', label, url }],
});

export const withBlocks = (target: Entry, locale: Locale, blocks: Block[]): Entry => ({
  ...target,
  blocks: { ...target.blocks, [locale]: blocks },
});
