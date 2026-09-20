import type { Block, Locale } from './content';

export type { Block, Action, Locale, Entry, ContentFile } from './content';

/* -------------------------------------------------------------------------- */
/*                                    chat                                    */
/* -------------------------------------------------------------------------- */

export type TypeChatSource = 'user' | 'me';

export type TypeRequestChat = {
  message: string;
};

/** 서버 응답. 답변 본문은 Lex가 아니라 S3 content에서 온다. */
export type TypeResponseChat = {
  /**
   * 대화 세션 태그. 서버 로그의 `sid`와 같은 값이며, ln 단축링크에 `?s=`로 실어
   * 클릭 알림과 대화 로그를 잇는 데 쓴다. (@/utils/lnLink)
   *
   * 클라이언트가 만든 chat(초기 인사·에러 등)에는 없으므로 optional이다.
   */
  sid?: string;
  locale: Locale;
  /** 매칭된 Lex 인텐트 이름. 매칭 실패 시 'FallbackIntent' */
  intent: string | null;
  confidence: number;
  fallback: boolean;
  blocks: Block[];
  error?: string;
};

/** 로딩 스켈레톤은 서버 응답이 아니라 클라이언트가 만든다. */
export type TypeChat<T extends TypeChatSource> = {
  type: T;
  chat: T extends 'user' ? TypeRequestChat : TypeResponseChat;
  /** 응답 대기 중 표시 */
  pending?: boolean;
};

export type TypeAddChat = (chat: TypeChat<TypeChatSource>) => void;
