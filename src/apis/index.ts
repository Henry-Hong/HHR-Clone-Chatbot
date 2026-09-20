import { useMutation } from '@tanstack/react-query';
import { preload } from 'react-dom';
import { rememberSessionTag } from '@/utils/lnLink';
import type { Block, Locale, TypeResponseChat } from '@/types';

const BASE_URL = 'https://2bs7x43h1j.execute-api.ap-northeast-2.amazonaws.com/v1';

/** 브라우저 세션 단위 대화 식별자. 서버에서는 해시만 저장한다. */
const SESSION_KEY = 'hhr-chat-session';

const getSessionId = (): string => {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return 'anonymous';
  }
};

/**
 * 블록에서 실제 이미지 URL만 추출한다.
 *
 * NOTE: 예전 구현은 메시지 객체를 그대로 preload()에 넘겨서
 *       프리로드가 전혀 동작하지 않았다. (이미지가 뒤늦게 뜨던 원인)
 */
const collectImageUrls = (blocks: Block[]): string[] => {
  const urls: string[] = [];
  for (const block of blocks) {
    if (block.type === 'image') urls.push(block.src);
    if (block.type === 'gallery') urls.push(...block.images.map((image) => image.src));
  }
  return urls.filter(Boolean);
};

export const useChatMutation = () => {
  return useMutation({
    mutationFn: async ({ text, locale }: { text: string; locale: Locale }): Promise<TypeResponseChat> => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, locale, sessionId: getSessionId() }),
      });

      if (!response.ok) throw new Error(`요청에 실패했어요. (${response.status})`);

      const data = (await response.json()) as TypeResponseChat;
      if (data.error) throw new Error(data.error);

      // 서버가 준 세션 태그를 기억해 ln 링크에 붙인다 (@/utils/lnLink)
      rememberSessionTag(data.sid);

      // 인위적 지연(waitAtLeast) 동안 이미지를 미리 받아둔다
      collectImageUrls(data.blocks ?? []).forEach((url) => preload(url, { as: 'image' }));

      return data;
    },
  });
};
