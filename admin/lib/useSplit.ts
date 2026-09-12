import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalState } from './useLocalState';

/** 좌/우 패널 너비를 드래그로 조절하고 새로고침해도 유지한다. */
export const useSplit = (key: string, initial: number, min: number, max: number) => {
  const [stored, setStored] = useLocalState(`split:${key}`, initial);
  const [width, setWidth] = useState(stored);
  const dragging = useRef<{ startX: number; startWidth: number; sign: 1 | -1 } | null>(null);

  useEffect(() => setWidth(stored), [stored]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const drag = dragging.current;
      if (!drag) return;
      event.preventDefault();
      const next = drag.startWidth + (event.clientX - drag.startX) * drag.sign;
      setWidth(Math.min(max, Math.max(min, next)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth((current) => {
        setStored(current);
        return current;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [min, max, setStored]);

  /** `side`는 손잡이가 패널의 어느 쪽에 붙어 있는지. left 패널이면 'right'. */
  const start = useCallback(
    (side: 'right' | 'left') => (event: React.MouseEvent) => {
      event.preventDefault();
      dragging.current = { startX: event.clientX, startWidth: width, sign: side === 'right' ? 1 : -1 };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width]
  );

  return { width, start };
};
