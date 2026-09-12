import type { Block, ContentFile, Entry, Locale } from '@/types';
import type { EntryKind } from '@/types/content';
import { clone } from './uid.ts';

export const LOCALES: Locale[] = ['ko', 'en'];

export const LOCALE_LABEL: Record<Locale, string> = { ko: '한국어', en: 'English' };

export const SYSTEM_IDS = ['__initial', '__home', '__fallback'] as const;

/** Lex 인텐트 이름 규칙. 어기면 import가 실패한다. */
export const INTENT_ID = /^[A-Za-z][A-Za-z0-9_]{0,99}$/;

/** `order` 순으로 정렬한다. 값이 같으면 원래 순서를 유지한다. */
export const sorted = (entries: Entry[]): Entry[] =>
  entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.order - b.entry.order || a.index - b.index)
    .map(({ entry }) => entry);

export const blocksOf = (entry: Entry, locale: Locale): Block[] => entry.blocks[locale] ?? [];

export const utterancesOf = (entry: Entry, locale: Locale): string[] => entry.utterances[locale] ?? [];

/** 이 로케일에 실제 답변이 있는가. 비어 있으면 기본 언어 답변이 대신 나간다. */
export const isTranslated = (entry: Entry, locale: Locale): boolean => blocksOf(entry, locale).length > 0;

export const emptyEntry = (id: string, title: string, kind: EntryKind, order: number): Entry => ({
  id,
  title,
  kind,
  enabled: true,
  showInFaq: kind === 'intent',
  order,
  utterances: { ko: [], en: [] },
  blocks: { ko: [], en: [] },
});

/** 제목에서 Lex 인텐트 이름 후보를 만든다. 한글은 못 쓰므로 비면 호출부가 채운다. */
export const suggestIntentId = (title: string): string => {
  const ascii = title
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');
  return ascii ? `${ascii}Intent` : '';
};

export const uniqueId = (entries: Entry[], base: string): string => {
  const taken = new Set(entries.map((entry) => entry.id));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
};

/* -------------------------------------------------------------------------- */
/*                              content 변환기                                 */
/* -------------------------------------------------------------------------- */

export const patchEntry = (content: ContentFile, id: string, patch: Partial<Entry>): ContentFile => ({
  ...content,
  entries: content.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
});

export const setBlocks = (content: ContentFile, id: string, locale: Locale, blocks: Block[]): ContentFile =>
  patchEntry(content, id, {
    blocks: { ...(content.entries.find((entry) => entry.id === id)?.blocks ?? { ko: [], en: [] }), [locale]: blocks },
  });

export const setUtterances = (content: ContentFile, id: string, locale: Locale, values: string[]): ContentFile =>
  patchEntry(content, id, {
    utterances: {
      ...(content.entries.find((entry) => entry.id === id)?.utterances ?? { ko: [], en: [] }),
      [locale]: values,
    },
  });

export const addEntry = (content: ContentFile, entry: Entry): ContentFile => ({
  ...content,
  entries: [...content.entries, entry],
});

export const removeEntry = (content: ContentFile, id: string): ContentFile => ({
  ...content,
  entries: content.entries.filter((entry) => entry.id !== id),
});

/** 목록에서 from → to 위치로 옮기고 order를 다시 매긴다. */
export const reorderEntries = (content: ContentFile, from: number, to: number): ContentFile => {
  const list = sorted(content.entries);
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return content;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return { ...content, entries: next.map((entry, index) => ({ ...entry, order: index })) };
};

export const duplicateEntry = (content: ContentFile, id: string): { content: ContentFile; id: string } | null => {
  const source = content.entries.find((entry) => entry.id === id);
  if (!source || source.kind === 'system') return null;
  const copyId = uniqueId(content.entries, `${source.id}Copy`);
  const copy: Entry = {
    ...clone(source),
    id: copyId,
    title: `${source.title} 복사본`,
    order: source.order + 0.5,
    // 발화가 겹치면 Lex가 어느 인텐트로 보낼지 모른다. 복사본은 비워둔다.
    utterances: { ko: [], en: [] },
    enabled: false,
    showInFaq: false,
  };
  const next = { ...content, entries: sorted([...content.entries, copy]).map((entry, index) => ({ ...entry, order: index })) };
  return { content: next, id: copyId };
};
