/**
 * 블록/액션에 렌더 전용 식별자를 붙인다.
 *
 * 스키마(`Block`)에는 id가 없고, 콘텐츠 파일에 id를 추가하면 S3의 SoT가 오염된다.
 * 그래서 **심볼 키**를 쓴다.
 *
 *   - `JSON.stringify`는 심볼 키를 무시한다  → 저장 파일이 깨끗하게 유지된다
 *   - 객체 스프레드(`{...block, html}`)는 심볼 키를 복사한다 → 편집해도 같은 블록으로 취급된다
 *   - `JSON.parse(JSON.stringify(x))`는 심볼을 잃는다 → 복제본은 새 id를 받는다
 *
 * 인덱스를 React key로 쓰면 블록을 지우거나 옮겼을 때 아래 블록의 입력 상태가
 * 엉뚱한 곳에 남는다. 실제로 기존 어드민에 있던 버그다.
 */

const UID = Symbol('adminUid');

let sequence = 0;

type Tagged = { [UID]?: string };

export const uidOf = (target: object): string => {
  const tagged = target as Tagged;
  if (!tagged[UID]) tagged[UID] = `n${++sequence}`;
  return tagged[UID];
};

/** 심볼까지 털어내는 깊은 복제. 복제본은 새 uid를 받는다. */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
