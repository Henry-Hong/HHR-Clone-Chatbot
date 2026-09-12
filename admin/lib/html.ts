/**
 * 텍스트 블록은 `dangerouslySetInnerHTML`로 렌더된다.
 * 어드민은 나 혼자 쓰지만, 오타 난 태그가 그대로 프로덕션에 나가는 건 막아야 한다.
 */

export const ALLOWED_TAGS = ['p', 'br', 'b', 'strong', 'em', 'mark', 'ul', 'ol', 'li', 'a'] as const;

const TAG = /<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/g;

/** 허용 목록에 없는 태그 이름들 (중복 제거). */
export const disallowedTags = (html: string): string[] => {
  const found = new Set<string>();
  for (const [, name] of html.matchAll(TAG)) {
    const tag = name.toLowerCase();
    if (!(ALLOWED_TAGS as readonly string[]).includes(tag)) found.add(tag);
  }
  return [...found];
};

/** 열고 닫히지 않은 태그가 있으면 true. `<br>` 같은 void 태그는 제외. */
const VOID = new Set(['br']);

export const hasUnbalancedTags = (html: string): boolean => {
  const stack: string[] = [];
  for (const match of html.matchAll(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)[^>]*?(\/?)\s*>/g)) {
    const [, closing, rawName, selfClosing] = match;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || selfClosing) continue;
    if (closing) {
      if (stack.pop() !== name) return true;
    } else {
      stack.push(name);
    }
  }
  return stack.length > 0;
};

/** 태그를 걷어낸 순수 텍스트. 빈 블록 판정에 쓴다. */
export const plainText = (html: string): string => html.replace(/<[^>]*>/g, '').trim();
