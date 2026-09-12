import { useCallback, useState } from 'react';

/**
 * HTML5 드래그로 목록 순서를 바꾼다.
 *
 * 라이브러리를 하나 더 들이는 대신 짧게 끝낸다. 목록이 수십 개 규모라
 * 가상 스크롤도 자동 스크롤도 필요 없다.
 *
 * 손잡이(`handleProps`)와 드롭 영역(`zoneProps`)을 나눠서 준다.
 * 카드 전체를 draggable로 만들면 카드 안의 목록(갤러리 이미지, 버튼)을 드래그할 때
 * 바깥 카드까지 같이 끌려간다.
 */
export type DragList = {
  draggingIndex: number | null;
  overIndex: number | null;
  /** 드래그 손잡이에 펼친다. */
  handleProps: (index: number) => {
    draggable: true;
    onDragStart: (event: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  /** 드롭을 받을 항목 전체에 펼친다. */
  zoneProps: (index: number) => {
    onDragOver: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
  };
  /** 드래그 중 시각 상태를 클래스 이름으로. */
  classFor: (index: number, base: string) => string;
};

export const useDragList = (onMove: (from: number, to: number) => void): DragList => {
  const [draggingIndex, setDragging] = useState<number | null>(null);
  const [overIndex, setOver] = useState<number | null>(null);

  const handleProps = useCallback(
    (index: number) => ({
      draggable: true as const,
      onDragStart: (event: React.DragEvent) => {
        event.stopPropagation();
        setDragging(index);
        event.dataTransfer.effectAllowed = 'move';
        // Firefox는 데이터가 없으면 드래그를 시작하지 않는다.
        event.dataTransfer.setData('text/plain', String(index));
      },
      onDragEnd: () => {
        setDragging(null);
        setOver(null);
      },
    }),
    []
  );

  const zoneProps = useCallback(
    (index: number) => ({
      onDragOver: (event: React.DragEvent) => {
        if (draggingIndex === null) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setOver(index);
      },
      onDrop: (event: React.DragEvent) => {
        if (draggingIndex === null) return;
        event.preventDefault();
        event.stopPropagation();
        const from = draggingIndex;
        setDragging(null);
        setOver(null);
        if (from !== index) onMove(from, index);
      },
    }),
    [draggingIndex, onMove]
  );

  const classFor = useCallback(
    (index: number, base: string) =>
      [
        base,
        draggingIndex === index && `${base}--dragging`,
        overIndex === index && draggingIndex !== index && `${base}--over`,
      ]
        .filter(Boolean)
        .join(' '),
    [draggingIndex, overIndex]
  );

  return { draggingIndex, overIndex, handleProps, zoneProps, classFor };
};
