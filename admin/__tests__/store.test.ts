import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reducer, type State } from '../lib/store.ts';
import { content, entry } from './fixtures.ts';

const base = content([entry({ id: 'AIntent', title: 'A' })]);

const loaded = (): State => reducer(initialState, { type: 'load', content: base });

const rename = (title: string) => (current: typeof base) => ({
  ...current,
  entries: current.entries.map((e) => ({ ...e, title })),
});

const titleOf = (state: State) => state.present?.entries[0].title;

test('load는 이력과 dirty를 초기화한다', () => {
  const dirty = reducer(loaded(), { type: 'edit', recipe: rename('B') });
  const reloaded = reducer(dirty, { type: 'load', content: base });
  assert.equal(reloaded.dirty, false);
  assert.deepEqual(reloaded.past, []);
  assert.deepEqual(reloaded.future, []);
});

test('edit은 dirty를 세우고 이력을 쌓는다', () => {
  const next = reducer(loaded(), { type: 'edit', recipe: rename('B') });
  assert.equal(titleOf(next), 'B');
  assert.equal(next.dirty, true);
  assert.equal(next.past.length, 1);
});

test('recipe가 null을 돌려주면 아무 일도 없다', () => {
  const before = loaded();
  assert.equal(reducer(before, { type: 'edit', recipe: () => null }), before);
});

test('recipe가 같은 객체를 돌려줘도 아무 일도 없다', () => {
  const before = loaded();
  assert.equal(reducer(before, { type: 'edit', recipe: (c) => c }), before);
});

test('되돌리기와 다시 실행', () => {
  const one = reducer(loaded(), { type: 'edit', recipe: rename('B') });
  const two = reducer(one, { type: 'edit', recipe: rename('C') });

  const undone = reducer(two, { type: 'undo' });
  assert.equal(titleOf(undone), 'B');

  const twice = reducer(undone, { type: 'undo' });
  assert.equal(titleOf(twice), 'A');

  assert.equal(titleOf(reducer(twice, { type: 'redo' })), 'B');
});

test('더 되돌릴 게 없으면 그대로 둔다', () => {
  const state = loaded();
  assert.equal(reducer(state, { type: 'undo' }), state);
  assert.equal(reducer(state, { type: 'redo' }), state);
});

test('되돌린 뒤 새로 편집하면 다시 실행 이력은 버린다', () => {
  const two = reducer(reducer(loaded(), { type: 'edit', recipe: rename('B') }), {
    type: 'edit',
    recipe: rename('C'),
  });
  const undone = reducer(two, { type: 'undo' });
  assert.equal(undone.future.length, 1);

  const branched = reducer(undone, { type: 'edit', recipe: rename('D') });
  assert.deepEqual(branched.future, []);
});

test('같은 키로 연달아 편집하면 되돌리기 한 단계로 묶는다', () => {
  let state = loaded();
  for (const title of ['B', 'BC', 'BCD']) {
    state = reducer(state, { type: 'edit', recipe: rename(title), coalesce: 'AIntent:title' });
  }
  assert.equal(titleOf(state), 'BCD');
  assert.equal(state.past.length, 1, '세 번 쳤어도 한 단계여야 한다');
  assert.equal(titleOf(reducer(state, { type: 'undo' })), 'A');
});

test('키가 다르면 따로 쌓인다', () => {
  let state = loaded();
  state = reducer(state, { type: 'edit', recipe: rename('B'), coalesce: 'AIntent:title' });
  state = reducer(state, { type: 'edit', recipe: rename('C'), coalesce: 'AIntent:html' });
  assert.equal(state.past.length, 2);
});

test('키가 없으면 묶지 않는다', () => {
  let state = loaded();
  state = reducer(state, { type: 'edit', recipe: rename('B') });
  state = reducer(state, { type: 'edit', recipe: rename('C') });
  assert.equal(state.past.length, 2);
});

test('되돌린 직후의 입력은 앞 단계와 묶이지 않는다', () => {
  let state = loaded();
  state = reducer(state, { type: 'edit', recipe: rename('B'), coalesce: 'k' });
  state = reducer(state, { type: 'undo' });
  state = reducer(state, { type: 'edit', recipe: rename('C'), coalesce: 'k' });
  // 묶였다면 되돌리기 한 번에 'A'로 가겠지만, 새 단계라 'A'가 맞다
  assert.equal(titleOf(reducer(state, { type: 'undo' })), 'A');
  assert.equal(state.future.length, 0, '새로 편집했으므로 다시 실행 이력은 비어야 한다');
});

test('저장하면 dirty가 풀리고 updatedAt이 바뀐다', () => {
  const edited = reducer(loaded(), { type: 'edit', recipe: rename('B') });
  const saved = reducer(edited, { type: 'saved', updatedAt: '2030-05-05T00:00:00.000Z' });
  assert.equal(saved.dirty, false);
  assert.equal(saved.present?.updatedAt, '2030-05-05T00:00:00.000Z');
  assert.equal(titleOf(saved), 'B', '저장은 내용을 건드리지 않는다');
});

test('이력은 무한정 쌓이지 않는다', () => {
  let state = loaded();
  for (let i = 0; i < 120; i += 1) {
    state = reducer(state, { type: 'edit', recipe: rename(`T${i}`) });
  }
  assert.ok(state.past.length <= 60, `past=${state.past.length}`);
});

test('콘텐츠가 없으면 편집을 무시한다', () => {
  assert.equal(reducer(initialState, { type: 'edit', recipe: rename('B') }), initialState);
  assert.equal(reducer(initialState, { type: 'undo' }), initialState);
});

/* -------------------------------------------------------------------------- */
/*                            dirty는 이력 위치를 따른다                        */
/* -------------------------------------------------------------------------- */

test('전부 되돌리면 dirty가 풀린다', () => {
  let state = reducer(loaded(), { type: 'edit', recipe: rename('B') });
  state = reducer(state, { type: 'edit', recipe: rename('C') });
  assert.equal(state.dirty, true);

  state = reducer(state, { type: 'undo' });
  assert.equal(state.dirty, true);

  state = reducer(state, { type: 'undo' });
  assert.equal(state.dirty, false, '저장된 시점으로 돌아왔으면 저장할 게 없다');

  state = reducer(state, { type: 'redo' });
  assert.equal(state.dirty, true);
});

test('저장한 지점으로 되돌아오면 dirty가 풀린다', () => {
  let state = reducer(loaded(), { type: 'edit', recipe: rename('B') });
  state = reducer(state, { type: 'saved', updatedAt: '2024-01-01T00:00:00.000Z' });
  assert.equal(state.dirty, false);

  state = reducer(state, { type: 'edit', recipe: rename('C') });
  assert.equal(state.dirty, true);

  state = reducer(state, { type: 'undo' });
  assert.equal(state.dirty, false);
});
