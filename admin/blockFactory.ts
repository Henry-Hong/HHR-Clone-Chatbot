import type { Block } from '@/types';

/** 새 블록의 기본값. 컴포넌트 파일과 분리해야 fast refresh가 동작한다. */
export const EMPTY_BLOCK: Record<Block['type'], () => Block> = {
  text: () => ({ type: 'text', html: '<p></p>' }),
  image: () => ({ type: 'image', src: '' }),
  gallery: () => ({ type: 'gallery', images: [{ src: '' }] }),
  actions: () => ({ type: 'actions', items: [{ kind: 'ask', label: '', utterance: '' }] }),
};

export const TYPE_LABEL: Record<Block['type'], string> = {
  text: '텍스트',
  image: '이미지',
  gallery: '갤러리',
  actions: '버튼',
};
