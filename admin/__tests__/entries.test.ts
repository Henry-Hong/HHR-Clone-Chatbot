import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addEntry,
  duplicateEntry,
  emptyEntry,
  patchEntry,
  removeEntry,
  reorderEntries,
  setBlocks,
  setUtterances,
  sorted,
  suggestIntentId,
  uniqueId,
} from '../lib/entries.ts';
import { clone, uidOf } from '../lib/uid.ts';
import { content, entry, text } from './fixtures.ts';

const ids = (file: ReturnType<typeof content>) => sorted(file.entries).map((e) => e.id);

/* -------------------------------------------------------------------------- */
/*                                   정렬                                      */
/* -------------------------------------------------------------------------- */

test('order 순으로 정렬하고, 같으면 원래 순서를 지킨다', () => {
  const file = content([
    entry({ id: 'C', order: 1 }),
    entry({ id: 'A', order: 0 }),
    entry({ id: 'B', order: 1 }),
  ]);
  assert.deepEqual(ids(file), ['A', 'C', 'B']);
});

test('순서를 바꾸면 order를 0부터 다시 매긴다', () => {
  const file = content([
    entry({ id: 'A', order: 0 }),
    entry({ id: 'B', order: 1 }),
    entry({ id: 'C', order: 2 }),
  ]);
  const moved = reorderEntries(file, 2, 0);
  assert.deepEqual(ids(moved), ['C', 'A', 'B']);
  assert.deepEqual(sorted(moved.entries).map((e) => e.order), [0, 1, 2]);
});

test('범위를 벗어난 순서 변경은 아무 일도 하지 않는다', () => {
  const file = content([entry({ id: 'A', order: 0 }), entry({ id: 'B', order: 1 })]);
  for (const [from, to] of [[0, 0], [-1, 1], [0, 5], [9, 0]]) {
    assert.equal(reorderEntries(file, from, to), file, `${from}->${to}`);
  }
});

/* -------------------------------------------------------------------------- */
/*                                   변환                                      */
/* -------------------------------------------------------------------------- */

test('patchEntry는 대상만 바꾸고 나머지는 참조를 유지한다', () => {
  const a = entry({ id: 'A' });
  const b = entry({ id: 'B' });
  const next = patchEntry(content([a, b]), 'A', { title: '바뀜' });
  assert.equal(next.entries[0].title, '바뀜');
  assert.equal(next.entries[1], b, '건드리지 않은 엔트리는 같은 객체여야 한다');
});

test('setBlocks는 지정한 로케일만 바꾼다', () => {
  const file = content([entry({ id: 'A', blocks: { ko: [text('<p>ko</p>')], en: [text('<p>en</p>')] } })]);
  const next = setBlocks(file, 'A', 'en', [text('<p>바뀐 en</p>')]);
  assert.deepEqual(next.entries[0].blocks.ko, [text('<p>ko</p>')]);
  assert.deepEqual(next.entries[0].blocks.en, [text('<p>바뀐 en</p>')]);
});

test('setUtterances도 지정한 로케일만 바꾼다', () => {
  const file = content([entry({ id: 'A', utterances: { ko: ['가'], en: ['a'] } })]);
  const next = setUtterances(file, 'A', 'ko', ['나', '다']);
  assert.deepEqual(next.entries[0].utterances, { ko: ['나', '다'], en: ['a'] });
});

test('없는 id를 고치려 해도 터지지 않는다', () => {
  const file = content([entry({ id: 'A' })]);
  assert.deepEqual(patchEntry(file, 'NOPE', { title: 'x' }).entries, file.entries);
  assert.deepEqual(setBlocks(file, 'NOPE', 'ko', []).entries, file.entries);
});

test('addEntry / removeEntry', () => {
  const file = content([entry({ id: 'A' })]);
  const added = addEntry(file, emptyEntry('BIntent', '새 항목', 'intent', 1));
  assert.deepEqual(ids(added), ['A', 'BIntent']);
  assert.deepEqual(ids(removeEntry(added, 'A')), ['BIntent']);
});

/* -------------------------------------------------------------------------- */
/*                                   복제                                      */
/* -------------------------------------------------------------------------- */

test('복제본은 발화를 비우고 비활성으로 시작한다', () => {
  const source = entry({
    id: 'AIntent',
    title: '자기소개',
    enabled: true,
    showInFaq: true,
    utterances: { ko: ['자기소개'], en: ['about'] },
    blocks: { ko: [text('<p>본문</p>')], en: [] },
  });
  const result = duplicateEntry(content([source]), 'AIntent');
  assert.ok(result);

  const copy = result.content.entries.find((e) => e.id === result.id)!;
  // 발화가 겹치면 Lex가 어느 인텐트로 보낼지 모른다
  assert.deepEqual(copy.utterances, { ko: [], en: [] });
  assert.equal(copy.enabled, false);
  assert.equal(copy.showInFaq, false);
  assert.deepEqual(copy.blocks.ko, [text('<p>본문</p>')]);
  assert.notEqual(copy.blocks.ko[0], source.blocks.ko[0], '블록은 깊은 복제여야 한다');
});

test('복제본은 원본 바로 뒤에 온다', () => {
  const file = content([
    entry({ id: 'AIntent', order: 0 }),
    entry({ id: 'BIntent', order: 1 }),
    entry({ id: 'CIntent', order: 2 }),
  ]);
  const result = duplicateEntry(file, 'BIntent')!;
  assert.deepEqual(ids(result.content), ['AIntent', 'BIntent', result.id, 'CIntent']);
});

test('system 엔트리는 복제할 수 없다', () => {
  const file = content([entry({ id: '__home', kind: 'system' })]);
  assert.equal(duplicateEntry(file, '__home'), null);
});

test('여러 번 복제해도 id가 겹치지 않는다', () => {
  let file = content([entry({ id: 'AIntent' })]);
  const made: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const result = duplicateEntry(file, 'AIntent')!;
    file = result.content;
    made.push(result.id);
  }
  assert.equal(new Set(made).size, 3, made.join(','));
});

/* -------------------------------------------------------------------------- */
/*                                   id                                        */
/* -------------------------------------------------------------------------- */

test('제목에서 인텐트 id를 만든다', () => {
  assert.equal(suggestIntentId('favorite stack'), 'FavoriteStackIntent');
  assert.equal(suggestIntentId('Resume'), 'ResumeIntent');
  // 한글은 Lex 인텐트 이름으로 쓸 수 없으므로 비워서 돌려준다 (호출부가 사용자에게 묻는다)
  assert.equal(suggestIntentId('자기소개'), '');
  assert.equal(suggestIntentId('   '), '');
});

test('uniqueId는 겹치지 않을 때까지 숫자를 붙인다', () => {
  const taken = [entry({ id: 'A' }), entry({ id: 'A2' })];
  assert.equal(uniqueId(taken, 'B'), 'B');
  assert.equal(uniqueId(taken, 'A'), 'A3');
});

/* -------------------------------------------------------------------------- */
/*                       블록 id가 저장 파일에 새지 않는가                       */
/* -------------------------------------------------------------------------- */

test('uid는 같은 객체에 대해 안정적이다', () => {
  const block = text('<p>x</p>');
  assert.equal(uidOf(block), uidOf(block));
});

test('스프레드로 편집해도 uid가 이어진다', () => {
  const block = text('<p>x</p>');
  const before = uidOf(block);
  const edited = { ...block, html: '<p>y</p>' };
  assert.equal(uidOf(edited), before, '같은 블록을 고친 것이므로 key가 유지돼야 한다');
});

test('깊은 복제는 새 uid를 받는다', () => {
  const block = text('<p>x</p>');
  const before = uidOf(block);
  assert.notEqual(uidOf(clone(block)), before);
});

test('uid는 JSON에 직렬화되지 않는다', () => {
  const block = text('<p>x</p>');
  uidOf(block);
  const file = content([entry({ id: 'A', blocks: { ko: [block], en: [] } })]);
  const json = JSON.stringify(file);
  assert.equal(json.includes('uid'), false);
  assert.deepEqual(JSON.parse(json).entries[0].blocks.ko[0], { type: 'text', html: '<p>x</p>' });
});
