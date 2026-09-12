import { useCallback, useEffect, useState } from 'react';

/** 새로고침해도 남는 UI 상태(테마, 패널 너비, 마지막 로케일 등). */
export const useLocalState = <T>(key: string, fallback: T): [T, (value: T) => void] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`hhr-admin:${key}`);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`hhr-admin:${key}`, JSON.stringify(value));
    } catch {
      /* 사생활 보호 모드 등. 저장 못 해도 동작에는 지장 없다. */
    }
  }, [key, value]);

  return [value, useCallback((next: T) => setValue(next), [])];
};
