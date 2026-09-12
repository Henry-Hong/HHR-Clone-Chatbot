import test from 'node:test';
import assert from 'node:assert/strict';
import { errorsOf, groupByEntry, validate } from '../validate.ts';
import { ask, contentWithSystem, entry, link, systemEntries, text, withBlocks } from './fixtures.ts';
import { content as makeContent } from './fixtures.ts';

const errorMessages = (file: Parameters<typeof validate>[0]) =>
  errorsOf(validate(file)).map((issue) => issue.message);

/* -------------------------------------------------------------------------- */
/*                                   구조                                      */
/* -------------------------------------------------------------------------- */

test('필수 화면 항목이 없으면 오류', () => {
  const messages = errorMessages(makeContent([entry({ id: 'AIntent' })]));
  assert.ok(messages.some((m) => m.includes('__initial')));
  assert.ok(messages.some((m) => m.includes('__home')));
  assert.ok(messages.some((m) => m.includes('__fallback')));
});

test('id가 중복되면 오류', () => {
  const messages = errorMessages(contentWithSystem([entry({ id: 'AIntent' }), entry({ id: 'AIntent' })]));
  assert.ok(messages.some((m) => m.includes('중복')));
});

test('Lex 인텐트 이름 규칙을 어기면 오류', () => {
  for (const id of ['1Intent', '자기소개', 'has-dash', 'has space', '']) {
    const messages = errorMessages(contentWithSystem([entry({ id })]));
    assert.ok(
      messages.some((m) => m.includes('Lex 인텐트 이름')),
      `${id} 는 거부돼야 한다`
    );
  }
});

test('올바른 인텐트 이름은 통과', () => {
  for (const id of ['A', 'ResumeIntent', 'Intent_2']) {
    const messages = errorMessages(contentWithSystem([entry({ id })]));
    assert.equal(
      messages.some((m) => m.includes('Lex 인텐트 이름')),
      false,
      `${id} 는 허용돼야 한다`
    );
  }
});

test('system 엔트리는 __ 로 시작해도 인텐트 이름 규칙을 적용하지 않는다', () => {
  const messages = errorMessages(contentWithSystem([]));
  assert.equal(messages.some((m) => m.includes('Lex 인텐트 이름')), false);
});

/* -------------------------------------------------------------------------- */
/*                                   발화                                      */
/* -------------------------------------------------------------------------- */

test('두 인텐트가 같은 발화를 가지면 오류', () => {
  const file = contentWithSystem([
    entry({ id: 'AIntent', utterances: { ko: ['이력서'], en: [] } }),
    entry({ id: 'BIntent', utterances: { ko: ['이력서'], en: [] } }),
  ]);
  assert.ok(errorMessages(file).some((m) => m.includes('중복')));
});

test('대소문자·공백만 다른 발화도 중복으로 본다', () => {
  const file = contentWithSystem([
    entry({ id: 'AIntent', utterances: { ko: [], en: ['Resume'] } }),
    entry({ id: 'BIntent', utterances: { ko: [], en: ['  resume  '] } }),
  ]);
  assert.ok(errorMessages(file).some((m) => m.includes('중복')));
});

test('비활성 인텐트와는 발화가 겹쳐도 괜찮다', () => {
  const file = contentWithSystem([
    entry({ id: 'AIntent', utterances: { ko: ['이력서'], en: [] } }),
    entry({ id: 'BIntent', enabled: false, utterances: { ko: ['이력서'], en: [] } }),
  ]);
  assert.equal(errorMessages(file).some((m) => m.includes('중복')), false);
});

/* -------------------------------------------------------------------------- */
/*             버튼이 등록되지 않은 발화를 보내는 경우 (실제로 있던 버그)         */
/* -------------------------------------------------------------------------- */

test('버튼이 어느 인텐트에도 없는 발화를 보내면 오류', () => {
  const file = contentWithSystem([
    withBlocks(entry({ id: 'AIntent', utterances: { ko: ['자기소개'], en: [] } }), 'ko', [
      ask('이력서 보기', '이력서'),
    ]),
  ]);
  const messages = errorMessages(file);
  assert.ok(messages.some((m) => m.includes('이력서') && m.includes('등록되지 않은')));
});

test('등록된 발화를 보내는 버튼은 통과', () => {
  const file = contentWithSystem([
    withBlocks(entry({ id: 'AIntent', utterances: { ko: ['자기소개'], en: [] } }), 'ko', [
      ask('자기소개', '자기소개'),
    ]),
  ]);
  assert.equal(errorMessages(file).some((m) => m.includes('등록되지 않은')), false);
});

test('비활성 인텐트의 발화는 버튼 대상으로 인정하지 않는다', () => {
  const file = contentWithSystem([
    withBlocks(entry({ id: 'AIntent', utterances: { ko: ['자기소개'], en: [] } }), 'ko', [ask('이력서', '이력서')]),
    entry({ id: 'BIntent', enabled: false, utterances: { ko: ['이력서'], en: [] } }),
  ]);
  assert.ok(errorMessages(file).some((m) => m.includes('등록되지 않은')));
});

/* -------------------------------------------------------------------------- */
/*                                   블록                                      */
/* -------------------------------------------------------------------------- */

test('허용되지 않은 태그는 오류', () => {
  const file = contentWithSystem([
    withBlocks(entry({ id: 'AIntent' }), 'ko', [text('<p>안녕 <script>alert(1)</script></p>')]),
  ]);
  assert.ok(errorMessages(file).some((m) => m.includes('허용되지 않은 태그')));
});

test('닫히지 않은 태그는 오류', () => {
  const file = contentWithSystem([withBlocks(entry({ id: 'AIntent' }), 'ko', [text('<p>안녕')])]);
  assert.ok(errorMessages(file).some((m) => m.includes('닫히지 않은')));
});

test('허용 태그만 쓰면 통과', () => {
  const html = '<p><strong>굵게</strong> <em>기울임</em> <mark>강조</mark></p><ul><li>하나</li></ul>';
  const file = contentWithSystem([withBlocks(entry({ id: 'AIntent' }), 'ko', [text(html)])]);
  assert.deepEqual(errorMessages(file), []);
});

test('잘못된 링크 URL은 오류', () => {
  for (const url of ['', 'example.com', 'javascript:alert(1)', 'ftp://x']) {
    const file = contentWithSystem([withBlocks(entry({ id: 'AIntent' }), 'ko', [link('보기', url)])]);
    assert.ok(errorMessages(file).some((m) => m.includes('URL')), `${url} 는 거부돼야 한다`);
  }
});

test('이미지 URL이 비면 오류', () => {
  const file = contentWithSystem([
    withBlocks(entry({ id: 'AIntent' }), 'ko', [{ type: 'image', src: '' }]),
  ]);
  assert.ok(errorMessages(file).some((m) => m.includes('이미지 URL')));
});

test('갤러리의 잘못된 이미지 개수를 센다', () => {
  const file = contentWithSystem([
    withBlocks(entry({ id: 'AIntent' }), 'ko', [
      { type: 'gallery', images: [{ src: 'https://a/1.png' }, { src: '' }, { src: 'nope' }] },
    ]),
  ]);
  assert.ok(errorMessages(file).some((m) => m.includes('2개')));
});

test('라벨이 빈 버튼은 오류', () => {
  const file = contentWithSystem([
    withBlocks(entry({ id: 'AIntent', utterances: { ko: ['x'], en: [] } }), 'ko', [ask('  ', 'x')]),
  ]);
  assert.ok(errorMessages(file).some((m) => m.includes('라벨')));
});

/* -------------------------------------------------------------------------- */
/*                                   경고                                      */
/* -------------------------------------------------------------------------- */

test('비활성인데 FAQ 노출이면 경고 (오류는 아님)', () => {
  const file = contentWithSystem([entry({ id: 'AIntent', enabled: false, showInFaq: true })]);
  const issues = validate(file);
  assert.ok(issues.some((i) => i.level === 'warn' && i.message.includes('FAQ')));
  assert.deepEqual(errorsOf(issues), []);
});

test('발화는 있는데 답변이 비면 경고', () => {
  const file = contentWithSystem([entry({ id: 'AIntent', utterances: { ko: ['이력서'], en: [] } })]);
  assert.ok(validate(file).some((i) => i.level === 'warn' && i.message.includes('답변이 비어')));
});

/* -------------------------------------------------------------------------- */

test('groupByEntry는 엔트리별로 모으고 전역 문제는 빼놓는다', () => {
  const issues = validate(makeContent([entry({ id: 'bad id' })]));
  const grouped = groupByEntry(issues);
  assert.ok((grouped.get('bad id')?.length ?? 0) > 0);
  // 필수 화면 항목 누락은 entryId가 없으므로 어느 그룹에도 들어가지 않는다
  assert.equal([...grouped.values()].flat().length < issues.length, true);
});

test('system 엔트리만 제대로 있으면 문제 없음', () => {
  assert.deepEqual(validate(makeContent(systemEntries())), []);
});
