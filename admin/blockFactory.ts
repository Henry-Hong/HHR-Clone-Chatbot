import type { Block } from '@/types';
import type { IconName } from '@blueprintjs/icons';

/** 새 블록의 기본값. 컴포넌트 파일과 분리해야 fast refresh가 동작한다. */
export const EMPTY_BLOCK: Record<Block['type'], () => Block> = {
  text: () => ({ type: 'text', html: '<p></p>' }),
  image: () => ({ type: 'image', src: '' }),
  gallery: () => ({ type: 'gallery', images: [{ src: '' }] }),
  actions: () => ({ type: 'actions', items: [{ kind: 'ask', label: '', utterance: '' }] }),
};

export const BLOCK_TYPES = Object.keys(EMPTY_BLOCK) as Block['type'][];

export const TYPE_LABEL: Record<Block['type'], string> = {
  text: '텍스트',
  image: '이미지',
  gallery: '갤러리',
  actions: '버튼',
};

export const TYPE_ICON: Record<Block['type'], IconName> = {
  text: 'paragraph',
  image: 'media',
  gallery: 'grid-view',
  actions: 'widget-button',
};

/** 목록에서 블록 내용을 한 줄로 요약한다. */
export const summarize = (block: Block): string => {
  switch (block.type) {
    case 'text':
      return block.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '(빈 텍스트)';
    case 'image':
      return block.caption || block.alt || block.src || '(이미지 없음)';
    case 'gallery':
      return `${block.images.length}장`;
    case 'actions':
      return block.items.map((item) => item.label || '(라벨 없음)').join(' · ') || '(버튼 없음)';
    default:
      return '';
  }
};
