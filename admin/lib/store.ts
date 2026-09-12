import { useCallback, useMemo, useReducer } from 'react';
import type { ContentFile } from '@/types';

/**
 * 콘텐츠 편집 상태. 되돌리기까지 포함한다.
 *
 * 스냅샷을 통째로 쌓는다. 콘텐츠가 수백 KB 수준이라 diff를 만들 이유가 없고,
 * 스프레드로만 갱신하므로 바뀌지 않은 가지는 참조가 공유돼 실제 메모리도 얼마 안 든다.
 * (uid 심볼도 참조로 따라오므로 되돌려도 블록 identity가 유지된다.)
 *
 * 변경은 항상 `edit(recipe)`로 들어온다. recipe를 리듀서 안에서 실행하므로
 * 렌더 시점의 낡은 content를 잡고 쓰는 일이 구조적으로 생기지 않는다.
 * (기존 어드민은 렌더 클로저의 entries로 patch를 만들어 연속 편집 시 유실될 수 있었다.)
 */

const LIMIT = 60;

/** 이 시간 안에 같은 필드를 계속 고치면 되돌리기 한 단계로 묶는다. */
const COALESCE_MS = 700;

type State = {
  present: ContentFile | null;
  past: ContentFile[];
  future: ContentFile[];
  /** 마지막 저장 이후 바뀐 게 있는가 */
  dirty: boolean;
  /** 직전 편집이 묶임 대상이었다면 그 키와 시각 */
  lastKey: string | null;
  lastAt: number;
};

export type Recipe = (content: ContentFile) => ContentFile | null;

type Action =
  | { type: 'load'; content: ContentFile }
  | { type: 'edit'; recipe: Recipe; coalesce?: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'saved'; updatedAt: string };

const initial: State = { present: null, past: [], future: [], dirty: false, lastKey: null, lastAt: 0 };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'load':
      return { ...initial, present: action.content };

    case 'edit': {
      if (!state.present) return state;
      const next = action.recipe(state.present);
      if (!next || next === state.present) return state;

      // 한 글자마다 되돌리기 단계가 쌓이면 ⌘Z가 쓸모없어진다.
      // 같은 필드를 연달아 고치는 동안은 스냅샷을 하나로 유지한다.
      const now = Date.now();
      const merge =
        !!action.coalesce &&
        state.lastKey === action.coalesce &&
        now - state.lastAt < COALESCE_MS &&
        state.past.length > 0;

      return {
        present: next,
        past: merge ? state.past : [...state.past, state.present].slice(-LIMIT),
        future: [],
        dirty: true,
        lastKey: action.coalesce ?? null,
        lastAt: now,
      };
    }

    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (!previous || !state.present) return state;
      return {
        present: previous,
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future],
        dirty: true,
        lastKey: null,
        lastAt: 0,
      };
    }

    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next || !state.present) return state;
      return {
        present: next,
        past: [...state.past, state.present],
        future: rest,
        dirty: true,
        lastKey: null,
        lastAt: 0,
      };
    }

    case 'saved':
      return state.present
        ? { ...state, present: { ...state.present, updatedAt: action.updatedAt }, dirty: false, lastKey: null }
        : state;

    default:
      return state;
  }
};

export type ContentStore = {
  content: ContentFile | null;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  load: (content: ContentFile) => void;
  /**
   * 현재 콘텐츠를 받아 새 콘텐츠를 돌려준다. null을 돌려주면 아무 일도 일어나지 않는다.
   *
   * `coalesce`를 주면 같은 키로 연달아 들어온 편집이 되돌리기 한 단계로 묶인다.
   * 텍스트 입력처럼 글자 단위로 호출되는 곳에 쓴다. 키에는 대상 필드를 넣어서
   * 다른 필드로 옮겨가면 새 단계가 시작되게 한다.
   */
  edit: (recipe: Recipe, coalesce?: string) => void;
  undo: () => void;
  redo: () => void;
  markSaved: (updatedAt: string) => void;
};

export const useContentStore = (): ContentStore => {
  const [state, dispatch] = useReducer(reducer, initial);

  const load = useCallback((content: ContentFile) => dispatch({ type: 'load', content }), []);
  const edit = useCallback(
    (recipe: Recipe, coalesce?: string) => dispatch({ type: 'edit', recipe, coalesce }),
    []
  );
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const markSaved = useCallback((updatedAt: string) => dispatch({ type: 'saved', updatedAt }), []);

  return useMemo(
    () => ({
      content: state.present,
      dirty: state.dirty,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      load,
      edit,
      undo,
      redo,
      markSaved,
    }),
    [state, load, edit, undo, redo, markSaved]
  );
};
