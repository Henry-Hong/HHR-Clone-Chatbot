/**
 * 텍스트 블록은 `dangerouslySetInnerHTML`로 렌더된다.
 * 어드민은 나 혼자 쓰지만, 오타 난 태그가 그대로 프로덕션에 나가는 건 막아야 한다.
 */

/**
 * 말풍선 안에서 실제로 보이는 태그만 허용한다.
 *
 * Tailwind preflight가 목록·문단·링크를 리셋하기 때문에 그냥 두면
 * "어드민은 허용한다는데 화면에는 아무 차이가 없는" 태그가 생긴다.
 * src/index.css의 `.chat-richtext` 규칙이 이 목록을 실제로 보이게 만든다.
 * 둘 중 하나만 바꾸면 어긋나므로 같이 바꿔야 한다.
 */
export const ALLOWED_TAGS = [
  'p',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'mark',
  'code',
  'ul',
  'ol',
  'li',
  'a',
] as const;

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

/* -------------------------------------------------------------------------- */
/*                                 살균하기                                   */
/* -------------------------------------------------------------------------- */

/**
 * 브라우저가 만든 태그를 허용 목록으로 접어 넣는다.
 *
 * 서식 모드(contentEditable)는 편하지만 브라우저마다 `<b>`·`<strike>`·`<font>`·
 * `<span style>` 같은 걸 제멋대로 집어넣는다. 그대로 저장하면 S3 원문이 더러워지고
 * 챗봇 화면에서는 아무 차이도 안 나는 태그가 쌓인다.
 * 그래서 입력이 끝날 때마다 이 함수로 한 번 통과시켜 결과를 예측 가능하게 고정한다.
 */

/** 같은 의미의 태그는 하나로 모은다. 빈 문자열은 "껍데기만 벗기고 안의 글자는 살린다"는 뜻. */
const TAG_ALIAS: Record<string, string> = {
  b: 'strong',
  i: 'em',
  strike: 's',
  del: 's',
  div: 'p',
  font: '',
  span: '',
};

/** 태그별로 남겨두는 속성. 나머지는 전부 버린다 (style, class, on* 등). */
const KEEP_ATTRS: Record<string, string[]> = {
  a: ['href', 'target', 'rel'],
};

const isSafeHref = (href: string) => /^(https?:\/\/|mailto:|\/|#)/i.test(href.trim());

const cleanElement = (el: Element, doc: Document): Node[] => {
  const name = el.tagName.toLowerCase();
  const mapped = TAG_ALIAS[name] ?? name;

  const children = [...el.childNodes].flatMap((child) => cleanNode(child, doc));

  // 허용 목록에 없거나 껍데기만 벗기는 태그라면 안의 내용만 살린다
  if (!mapped || !(ALLOWED_TAGS as readonly string[]).includes(mapped)) return children;

  const next = doc.createElement(mapped);
  for (const attr of KEEP_ATTRS[mapped] ?? []) {
    const value = el.getAttribute(attr);
    if (value === null) continue;
    if (attr === 'href' && !isSafeHref(value)) continue;
    next.setAttribute(attr, value);
  }
  // 새 창 링크는 rel을 빼먹으면 안 된다 (window.opener 누수)
  if (mapped === 'a' && next.getAttribute('target') === '_blank') next.setAttribute('rel', 'noreferrer');

  for (const child of children) next.appendChild(child);
  return [next];
};

const cleanNode = (node: Node, doc: Document): Node[] => {
  if (node.nodeType === 3 /* text */) return [doc.createTextNode(node.nodeValue ?? '')];
  if (node.nodeType !== 1 /* element */) return [];
  return cleanElement(node as Element, doc);
};

/** 허용 태그·속성만 남긴 HTML. 브라우저 밖(테스트)에서는 원문을 그대로 돌려준다. */
export const sanitizeHtml = (html: string): string => {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const out = doc.createElement('div');
  for (const child of [...doc.body.childNodes]) {
    for (const node of cleanNode(child, doc)) out.appendChild(node);
  }
  return out.innerHTML.replace(/<p><\/p>/g, '').trim();
};
