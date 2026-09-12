import type { ContentFile, Entry, Locale } from '@/types';
import { INTENT_ID, LOCALES, SYSTEM_IDS, blocksOf, utterancesOf } from './lib/entries';
import { disallowedTags, hasUnbalancedTags, plainText } from './lib/html';

export type IssueLevel = 'error' | 'warn';

export type Issue = {
  level: IssueLevel;
  /** 어느 엔트리 문제인지. 콘텐츠 전체 문제면 비어 있다. */
  entryId?: string;
  locale?: Locale;
  message: string;
  /** 고칠 방법 한 줄. */
  hint?: string;
};

/**
 * 저장/발행 전에 흔한 실수를 잡는다.
 *
 * 특히 "버튼이 등록되지 않은 발화를 가리키는" 케이스는 실제로 프로덕션에 있었고,
 * Lex의 퍼지 매칭 때문에 겉보기엔 동작해서 눈치채기 어려웠다.
 */
export const validate = (content: ContentFile): Issue[] => {
  const issues: Issue[] = [];
  const push = (issue: Issue) => issues.push(issue);

  checkStructure(content, push);
  for (const locale of LOCALES) checkLocale(content, locale, push);

  return issues;
};

export const errorsOf = (issues: Issue[]): Issue[] => issues.filter((issue) => issue.level === 'error');

export const groupByEntry = (issues: Issue[]): Map<string, Issue[]> => {
  const map = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (!issue.entryId) continue;
    map.set(issue.entryId, [...(map.get(issue.entryId) ?? []), issue]);
  }
  return map;
};

/* -------------------------------------------------------------------------- */
/*                                  구조 검사                                  */
/* -------------------------------------------------------------------------- */

const checkStructure = (content: ContentFile, push: (issue: Issue) => void) => {
  for (const id of SYSTEM_IDS) {
    if (!content.entries.some((entry) => entry.id === id)) {
      push({
        level: 'error',
        message: `필수 화면 항목 ${id}가 없어요.`,
        hint: '프론트가 첫 화면을 그릴 때 이 항목을 찾습니다.',
      });
    }
  }

  const seen = new Set<string>();
  for (const entry of content.entries) {
    if (seen.has(entry.id)) {
      push({ level: 'error', entryId: entry.id, message: `id "${entry.id}"가 중복됩니다.` });
    }
    seen.add(entry.id);

    if (entry.kind === 'intent' && !INTENT_ID.test(entry.id)) {
      push({
        level: 'error',
        entryId: entry.id,
        message: `id "${entry.id}"는 Lex 인텐트 이름으로 쓸 수 없어요.`,
        hint: '영문자로 시작하고 영문/숫자/밑줄만 (예: ResumeIntent)',
      });
    }

    if (!entry.title.trim()) {
      push({ level: 'warn', entryId: entry.id, message: '제목이 비어 있어요.', hint: '목록에서 찾기 어려워집니다.' });
    }

    if (entry.showInFaq && !entry.enabled) {
      push({
        level: 'warn',
        entryId: entry.id,
        message: 'FAQ에 노출하도록 돼 있는데 비활성 상태예요.',
        hint: '비활성 항목은 FAQ에 나오지 않습니다.',
      });
    }
  }
};

/* -------------------------------------------------------------------------- */
/*                                로케일 검사                                  */
/* -------------------------------------------------------------------------- */

const checkLocale = (content: ContentFile, locale: Locale, push: (issue: Issue) => void) => {
  const enabled = content.entries.filter((entry) => entry.enabled);
  const known = new Set(enabled.flatMap((entry) => utterancesOf(entry, locale)));

  checkDuplicateUtterances(enabled, locale, push);

  for (const entry of enabled) {
    checkBlocks(entry, locale, known, push);

    if (entry.kind === 'intent') {
      if (utterancesOf(entry, locale).length === 0 && locale === content.defaultLocale) {
        push({
          level: 'warn',
          entryId: entry.id,
          locale,
          message: '발화가 하나도 없어요.',
          hint: '발화가 없으면 Lex가 이 인텐트를 절대 고르지 못합니다.',
        });
      }

      if (utterancesOf(entry, locale).length > 0 && blocksOf(entry, locale).length === 0) {
        push({
          level: 'warn',
          entryId: entry.id,
          locale,
          message: '발화는 있는데 답변이 비어 있어요.',
          hint: `기본 언어(${content.defaultLocale}) 답변이 대신 나갑니다.`,
        });
      }
    }
  }
};

const checkDuplicateUtterances = (entries: Entry[], locale: Locale, push: (issue: Issue) => void) => {
  const owner = new Map<string, string>();
  for (const entry of entries) {
    for (const utterance of utterancesOf(entry, locale)) {
      const key = utterance.trim().toLowerCase();
      const previous = owner.get(key);
      if (previous && previous !== entry.id) {
        push({
          level: 'error',
          entryId: entry.id,
          locale,
          message: `발화 "${utterance}"가 ${previous}와 중복됩니다.`,
          hint: 'Lex 빌드가 깨지거나 엉뚱한 인텐트로 갑니다.',
        });
      } else {
        owner.set(key, entry.id);
      }
    }
  }
};

const isUrl = (value: string) => /^https?:\/\/\S+$/.test(value);

const checkBlocks = (entry: Entry, locale: Locale, known: Set<string>, push: (issue: Issue) => void) => {
  const at = (level: IssueLevel, message: string, hint?: string) =>
    push({ level, entryId: entry.id, locale, message, hint });

  for (const [index, block] of blocksOf(entry, locale).entries()) {
    const where = `${index + 1}번 블록`;

    if (block.type === 'text') {
      if (!plainText(block.html)) at('warn', `${where}: 내용이 비어 있어요.`);

      const bad = disallowedTags(block.html);
      if (bad.length) {
        at('error', `${where}: 허용되지 않은 태그 <${bad.join('>, <')}>`, '챗봇은 이 태그를 그대로 렌더합니다.');
      }
      if (hasUnbalancedTags(block.html)) {
        at('error', `${where}: 닫히지 않은 태그가 있어요.`, '말풍선 레이아웃이 깨집니다.');
      }
    }

    if (block.type === 'image' && !isUrl(block.src)) {
      at('error', `${where}: 이미지 URL이 비었거나 잘못됐어요.`);
    }

    if (block.type === 'gallery') {
      if (!block.images.length) at('warn', `${where}: 이미지가 하나도 없는 갤러리.`);
      const broken = block.images.filter((image) => !isUrl(image.src)).length;
      if (broken) at('error', `${where}: 잘못된 이미지 URL ${broken}개.`);
    }

    if (block.type === 'actions') {
      if (!block.items.length) at('warn', `${where}: 버튼이 하나도 없는 버튼 블록.`);

      for (const action of block.items) {
        if (!action.label.trim()) at('error', `${where}: 라벨이 빈 버튼이 있어요.`);

        if (action.kind === 'link' && !isUrl(action.url)) {
          at('error', `${where}: 링크 "${action.label}"의 URL이 잘못됐어요.`);
        }

        if (action.kind === 'ask') {
          if (!action.utterance.trim()) {
            at('error', `${where}: 버튼 "${action.label}"에 보낼 발화가 없어요.`);
          } else if (known.size && !known.has(action.utterance)) {
            at(
              'error',
              `${where}: 버튼 "${action.label}"이 등록되지 않은 발화 "${action.utterance}"를 보냅니다.`,
              'Lex 퍼지 매칭에 의존하게 됩니다. 해당 발화를 인텐트에 추가하세요.'
            );
          }
        }
      }
    }
  }
};
