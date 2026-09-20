import { useSyncExternalStore } from 'react';
import { getSessionTag, subscribeSessionTag } from '@/utils/lnLink';

/**
 * 현재 대화 세션 태그를 구독한다.
 *
 * 태그는 첫 채팅 응답과 함께 도착하므로, 그 전에 그려진 링크(헤더 등)도
 * 도착 시점에 다시 그려져야 한다. 그래서 전역 변수를 직접 읽지 않고
 * useSyncExternalStore로 구독한다.
 *
 * 서버 스냅샷이 빈 문자열인 이유: SSR/프리렌더 시점에는 세션이 없다.
 */
export const useSessionTag = (): string =>
  useSyncExternalStore(subscribeSessionTag, getSessionTag, () => '');
