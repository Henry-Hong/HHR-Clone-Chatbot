import type { Block, Locale, TypeChat, TypeResponseChat } from '@/types';

export const createReqChatFromMessage = (message: string): TypeChat<'user'> => ({
  type: 'user',
  chat: { message },
});

export const createMyChatFromResponse = (response: TypeResponseChat): TypeChat<'me'> => ({
  type: 'me',
  chat: response,
});

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return `알 수 없는 오류가 발생했습니다. ${String(error)}`;
};

export const createMyChatFromError = (error: unknown, locale: Locale = 'ko'): TypeChat<'me'> => {
  const blocks: Block[] = [
    { type: 'text', html: '다시 한번 말씀해주세요.' },
    { type: 'text', html: getErrorMessage(error) },
  ];
  return {
    type: 'me',
    chat: { locale, intent: null, confidence: 0, fallback: true, blocks },
  };
};

/** 응답 대기 중 스켈레톤 */
export const createMyChatLoading = (locale: Locale = 'ko'): TypeChat<'me'> => ({
  type: 'me',
  pending: true,
  chat: { locale, intent: null, confidence: 0, fallback: false, blocks: [] },
});

/**
 * 응답이 너무 빨리 와도 최소 ms 동안은 로딩을 보여준다.
 * (대화하는 느낌을 주기 위한 의도적 지연)
 */
export const waitAtLeast = async <T>(ms: number, promise: Promise<T>): Promise<T> => {
  const [result] = await Promise.allSettled([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
  if (result.status === 'rejected') throw result.reason;
  return result.value as T;
};
