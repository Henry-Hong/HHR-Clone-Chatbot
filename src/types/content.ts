/**
 * Chatbot content schema (Source of Truth = S3 `content/current.json`).
 *
 * 이 파일은 "형식"만 정의합니다. 실제 답변 내용은 git에 커밋하지 않고
 * private S3 버킷(versioning on)에 저장합니다.
 *
 *   git  : 코드 + 이 스키마 + 변환 스크립트   (public repo OK)
 *   S3   : content/current.json + assets/*    (private, Lambda IAM만 읽기)
 */

export type Locale = 'ko' | 'en';

export const LOCALES: Locale[] = ['ko', 'en'];

/** Lex localeId 매핑 */
export const LEX_LOCALE_ID: Record<Locale, string> = {
  ko: 'ko_KR',
  en: 'en_US',
};

/* -------------------------------------------------------------------------- */
/*                                   Blocks                                   */
/* -------------------------------------------------------------------------- */

/**
 * 리치텍스트 한 덩어리.
 * html에는 <p> <br> <b> <strong> <em> <mark> <ul> <li> 정도만 허용한다.
 * variations가 있으면 렌더 시 html 포함 후보 중 하나를 랜덤으로 고른다. (Lex message variations 대체)
 */
export type TextBlock = {
  type: 'text';
  html: string;
  variations?: string[];
};

/** 단일 이미지. variations가 있으면 그중 하나를 랜덤으로 고른다. */
export type ImageBlock = {
  type: 'image';
  src: string;
  alt?: string;
  caption?: string;
  variations?: { src: string; alt?: string; caption?: string }[];
};

/** 여러 장을 한 번에 보여주는 갤러리. (구 customPayload `ImageList` 정식화) */
export type GalleryBlock = {
  type: 'gallery';
  images: { src: string; alt?: string }[];
};

/** 버튼 묶음. */
export type ActionsBlock = {
  type: 'actions';
  items: Action[];
};

export type Block = TextBlock | ImageBlock | GalleryBlock | ActionsBlock;

/**
 * ask  : 누르면 해당 발화를 챗봇에 다시 보낸다.
 * link : 외부 링크로 이동한다. (구 `@라벨` prefix 컨벤션 대체)
 */
export type Action =
  | { kind: 'ask'; label: string; utterance: string }
  | { kind: 'link'; label: string; url: string };

/* -------------------------------------------------------------------------- */
/*                                   Entries                                  */
/* -------------------------------------------------------------------------- */

/**
 * intent : Lex 인텐트와 1:1 대응. id가 곧 Lex intent name.
 * system : Lex에 존재하지 않고 프론트가 직접 쓰는 화면용 콘텐츠.
 *          (최초 인사, 홈버튼, fallback 안내)
 */
export type EntryKind = 'intent' | 'system';

export type Entry = {
  /** Lex intent name. system 엔트리는 `__`로 시작한다. */
  id: string;
  /** 어드민 목록 표시용 이름 */
  title: string;
  kind: EntryKind;
  enabled: boolean;
  /** FAQ 버튼 목록에 자동 노출할지 */
  showInFaq: boolean;
  order: number;
  /** Lex로 동기화되는 발화 목록. system 엔트리는 빈 배열. */
  utterances: Record<Locale, string[]>;
  /** 실제 답변. Lex에는 저장하지 않는다. */
  blocks: Record<Locale, Block[]>;
};

export type ContentFile = {
  schemaVersion: 1;
  updatedAt: string;
  defaultLocale: Locale;
  entries: Entry[];
};

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

export const SYSTEM_ENTRY_IDS = {
  /** 앱 진입 시 최초로 보여주는 인사 */
  initial: '__initial',
  /** 홈 버튼을 눌렀을 때 */
  home: '__home',
  /** 인텐트 매칭 실패 시 */
  fallback: '__fallback',
} as const;

export const isSystemEntry = (entry: Entry): boolean => entry.id.startsWith('__');

export const findEntry = (content: ContentFile, id: string): Entry | undefined =>
  content.entries.find((entry) => entry.id === id);

/** 해당 로케일에 실제 답변이 채워져 있는지 */
export const hasLocale = (entry: Entry, locale: Locale): boolean =>
  (entry.blocks[locale]?.length ?? 0) > 0;

/** variations 중 하나를 고른다. 렌더 시점에 호출. */
export const pickTextVariation = (block: TextBlock): string => {
  if (!block.variations?.length) return block.html;
  const pool = [block.html, ...block.variations];
  return pool[Math.floor(Math.random() * pool.length)];
};

export const pickImageVariation = (block: ImageBlock): { src: string; alt?: string; caption?: string } => {
  if (!block.variations?.length) return { src: block.src, alt: block.alt, caption: block.caption };
  const pool = [{ src: block.src, alt: block.alt, caption: block.caption }, ...block.variations];
  return pool[Math.floor(Math.random() * pool.length)];
};
