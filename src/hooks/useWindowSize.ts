import { useSyncExternalStore } from 'react';

/**
 * 창 크기를 구독한다.
 *
 * 이 훅을 쓰는 컴포넌트가 늘어나도 `resize` 리스너는 하나만 붙는다.
 * (채팅에 이미지가 쌓이면 Image마다 리스너가 하나씩 생기던 문제)
 */

type Size = { width: number; height: number };

/**
 * useSyncExternalStore는 값이 그대로면 같은 참조를 돌려받기를 기대한다.
 * 매번 새 객체를 만들면 "getSnapshot should be cached" 경고와 무한 렌더가 난다.
 */
let snapshot: Size = { width: 0, height: 0 };

const getSnapshot = (): Size => {
  if (snapshot.width !== window.innerWidth || snapshot.height !== window.innerHeight) {
    snapshot = { width: window.innerWidth, height: window.innerHeight };
  }
  return snapshot;
};

const listeners = new Set<() => void>();

const handleResize = () => {
  getSnapshot();
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) window.addEventListener('resize', handleResize);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('resize', handleResize);
  };
};

export const useWindowSize = () => {
  const { width, height } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    width,
    height,
    isVertical: width <= height,
    isHorizontal: width > height,
  };
};
