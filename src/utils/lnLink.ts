/**
 * ln 단축링크에 대화 세션 태그를 붙인다.
 *
 * 왜 필요한가
 * -----------
 * 이력서·포트폴리오 링크를 누르면 ln-redirect가 클릭을 기록하고 디스코드로
 * 알림을 쏜다. 그런데 그 알림에는 "누가 눌렀나"(IP·지역)만 있고
 * "무슨 대화를 하다가 눌렀나"가 없었다. 챗봇 로그(CloudWatch)와 클릭 로그는
 * 서로 겹치는 식별자가 하나도 없어서, 지금까지는 타임스탬프를 눈으로
 * 맞춰보는 수밖에 없었다. 방문자가 둘 이상 겹치면 그마저도 불가능하다.
 *
 * 그래서 서버가 내려준 `sid`(대화 로그의 `sid`와 같은 값)를 링크에 `?s=`로
 * 실어 보낸다. ln 쪽이 이걸 클릭 로그에 그대로 남기므로 두 로그가 이어진다.
 *
 * `s`가 비어 있는 클릭은 "한 마디도 안 하고 링크만 누른 방문자"라는 뜻이라,
 * 값이 없는 것 자체도 정보가 된다.
 *
 * 원본 sessionId가 아니라 서버가 해시한 값을 쓴다. 이 값은 외부 도메인의
 * 쿼리스트링에 실려 나가므로, 유출되더라도 Lex 세션을 가로챌 수 없어야 한다.
 */

const TAG_KEY = 'hhr-chat-tag';

/** 태그를 붙일 대상. 다른 도메인 링크는 건드리지 않는다. */
const LN_HOST = 'ln.devheerim.com';

const readStored = (): string => {
  try {
    return sessionStorage.getItem(TAG_KEY) ?? '';
  } catch {
    // 시크릿 모드 등에서 sessionStorage 접근이 막히는 경우
    return '';
  }
};

let tag = readStored();
const listeners = new Set<() => void>();

/**
 * 채팅 응답에서 받은 세션 태그를 기억한다.
 *
 * 첫 응답이 오기 전에는 태그가 없다. 그 사이에 눌린 링크는 태그 없이 나가는데,
 * 아직 대화가 없었다는 뜻이므로 이어붙일 대화도 없다. 의도된 동작이다.
 */
export const rememberSessionTag = (sid?: string | null): void => {
  if (!sid || sid === tag) return;
  tag = sid;
  try {
    sessionStorage.setItem(TAG_KEY, sid);
  } catch {
    // 저장 실패해도 메모리 값으로 이번 세션은 동작한다
  }
  listeners.forEach((listener) => listener());
};

/** useSyncExternalStore용 구독. 태그가 늦게 도착해도 링크가 다시 그려진다. */
export const subscribeSessionTag = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getSessionTag = (): string => tag;

/**
 * ln 링크면 `s` 파라미터를 붙여서, 아니면 원본 그대로 돌려준다.
 *
 * - 절대 URL이 아니면 건드리지 않는다 (파싱 실패로 링크가 깨지는 것 방지)
 * - 이미 `s`가 있으면 덮어쓰지 않는다 (콘텐츠가 직접 지정한 값이 우선)
 * - 기존 `from` 파라미터는 그대로 유지된다
 */
export const taggedLink = (url: string, sessionTag: string = tag): string => {
  if (!sessionTag) return url;
  if (!/^https?:\/\//i.test(url)) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== LN_HOST) return url;
    if (parsed.searchParams.has('s')) return url;
    parsed.searchParams.set('s', sessionTag);
    return parsed.toString();
  } catch {
    return url;
  }
};
