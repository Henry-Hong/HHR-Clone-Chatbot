import type { ContentFile, Locale } from '@/types';

export type Issue = {
  level: 'error' | 'warn';
  entryId?: string;
  message: string;
};

const LOCALES: Locale[] = ['ko', 'en'];

/**
 * 저장/발행 전에 흔한 실수를 잡는다.
 * 특히 "버튼이 등록되지 않은 발화를 가리키는" 케이스는 실제로 프로덕션에 있었고,
 * Lex의 퍼지 매칭 때문에 겉보기엔 동작해서 눈치채기 어려웠다.
 */
export const validate = (content: ContentFile): Issue[] => {
  const issues: Issue[] = [];
  const enabled = content.entries.filter((entry) => entry.enabled);

  for (const locale of LOCALES) {
    const known = new Set(enabled.flatMap((entry) => entry.utterances[locale] ?? []));

    // 발화 중복 (Lex 빌드가 깨지거나 엉뚱한 인텐트로 간다)
    const seen = new Map<string, string>();
    for (const entry of enabled) {
      for (const utterance of entry.utterances[locale] ?? []) {
        const key = utterance.trim().toLowerCase();
        const owner = seen.get(key);
        if (owner && owner !== entry.id) {
          issues.push({
            level: 'error',
            entryId: entry.id,
            message: `[${locale}] 발화 "${utterance}"가 ${owner}와 중복됩니다.`,
          });
        } else {
          seen.set(key, entry.id);
        }
      }
    }

    for (const entry of enabled) {
      const blocks = entry.blocks[locale] ?? [];

      for (const block of blocks) {
        if (block.type === 'text' && !block.html.replace(/<[^>]*>/g, '').trim()) {
          issues.push({ level: 'warn', entryId: entry.id, message: `[${locale}] 내용이 빈 텍스트 블록이 있어요.` });
        }

        if (block.type === 'image' && !/^https?:\/\//.test(block.src)) {
          issues.push({ level: 'error', entryId: entry.id, message: `[${locale}] 이미지 URL이 비었거나 잘못됐어요.` });
        }

        if (block.type === 'gallery') {
          const broken = block.images.filter((image) => !/^https?:\/\//.test(image.src)).length;
          if (broken) {
            issues.push({ level: 'error', entryId: entry.id, message: `[${locale}] 갤러리에 잘못된 이미지 URL ${broken}개.` });
          }
        }

        if (block.type === 'actions') {
          if (!block.items.length) {
            issues.push({ level: 'warn', entryId: entry.id, message: `[${locale}] 버튼이 하나도 없는 버튼 블록.` });
          }
          for (const action of block.items) {
            if (!action.label.trim()) {
              issues.push({ level: 'error', entryId: entry.id, message: `[${locale}] 라벨이 빈 버튼이 있어요.` });
            }
            if (action.kind === 'link' && !/^https?:\/\//.test(action.url)) {
              issues.push({ level: 'error', entryId: entry.id, message: `[${locale}] 링크 "${action.label}"의 URL이 잘못됐어요.` });
            }
            if (action.kind === 'ask') {
              if (!action.utterance.trim()) {
                issues.push({ level: 'error', entryId: entry.id, message: `[${locale}] 버튼 "${action.label}"에 발화가 없어요.` });
              } else if (known.size && !known.has(action.utterance)) {
                issues.push({
                  level: 'error',
                  entryId: entry.id,
                  message:
                    `[${locale}] 버튼 "${action.label}"이 어떤 인텐트에도 등록되지 않은 발화 ` +
                    `"${action.utterance}"를 보냅니다. Lex 퍼지 매칭에 의존하게 돼요.`,
                });
              }
            }
          }
        }
      }

      // 발화는 있는데 답변이 없는 경우
      if (entry.kind === 'intent' && (entry.utterances[locale]?.length ?? 0) > 0 && blocks.length === 0) {
        issues.push({
          level: 'warn',
          entryId: entry.id,
          message: `[${locale}] 발화는 있는데 답변이 비어 있어요. 기본 언어 답변이 대신 나갑니다.`,
        });
      }
    }
  }

  for (const id of ['__initial', '__home', '__fallback']) {
    if (!content.entries.some((entry) => entry.id === id)) {
      issues.push({ level: 'error', message: `필수 화면 항목 ${id}가 없어요.` });
    }
  }

  return issues;
};
