/**
 * node --test lambda/index.test.mjs
 *
 * AWS 호출 없이 돌아가는 순수 로직만 검증한다.
 * 실제 content/current.json이 있으면 그걸로, 없으면 픽스처로 돈다.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { parseEvent, resolveBlock, blocksFor } from './index.mjs';

const CONTENT_PATH = path.join(import.meta.dirname, '..', 'content', 'current.json');

const fixture = {
  schemaVersion: 1,
  defaultLocale: 'ko',
  entries: [
    {
      id: 'Q1',
      kind: 'intent',
      enabled: true,
      blocks: {
        ko: [{ type: 'text', html: 'ko-a', variations: ['ko-b'] }],
        en: [],
      },
    },
    { id: 'Q9', kind: 'intent', enabled: false, blocks: { ko: [{ type: 'text', html: 'x' }], en: [] } },
    { id: '__fallback', kind: 'system', enabled: true, blocks: { ko: [{ type: 'text', html: 'fb' }], en: [] } },
  ],
};

/* ------------------------------- parseEvent ------------------------------- */

test('parseEvent: 직접 호출 페이로드', () => {
  const result = parseEvent({ text: '  자기소개  ', locale: 'en', sessionId: 's1' });
  assert.equal(result.text, '자기소개');
  assert.equal(result.locale, 'en');
  assert.equal(result.sessionId, 's1');
});

test('parseEvent: API Gateway proxy(body 문자열)도 처리', () => {
  const result = parseEvent({ body: JSON.stringify({ text: 'hi', locale: 'en' }) });
  assert.equal(result.text, 'hi');
  assert.equal(result.locale, 'en');
});

test('parseEvent: 모르는 locale은 기본값(ko)으로', () => {
  assert.equal(parseEvent({ text: 'a', locale: 'jp' }).locale, 'ko');
  assert.equal(parseEvent({ text: 'a' }).locale, 'ko');
});

test('parseEvent: 빈 입력', () => {
  assert.equal(parseEvent({}).text, '');
  assert.equal(parseEvent({ text: '   ' }).text, '');
});

/* ------------------------------ resolveBlock ------------------------------ */

test('resolveBlock: text variations가 하나로 확정되고 variations 키가 사라진다', () => {
  const block = { type: 'text', html: 'a', variations: ['b', 'c'] };
  for (let i = 0; i < 50; i += 1) {
    const resolved = resolveBlock(block);
    assert.ok(['a', 'b', 'c'].includes(resolved.html));
    assert.equal(resolved.variations, undefined);
  }
});

test('resolveBlock: image variations', () => {
  const block = { type: 'image', src: 'a.png', alt: 'A', variations: [{ src: 'b.png', alt: 'B' }] };
  const resolved = resolveBlock(block);
  assert.ok(['a.png', 'b.png'].includes(resolved.src));
  assert.equal(resolved.variations, undefined);
});

test('resolveBlock: actions/gallery는 그대로 통과', () => {
  const actions = { type: 'actions', items: [{ kind: 'ask', label: 'L', utterance: 'U' }] };
  assert.deepEqual(resolveBlock(actions), actions);
  const gallery = { type: 'gallery', images: [{ src: 'a.png' }] };
  assert.deepEqual(resolveBlock(gallery), gallery);
});

/* ------------------------------- blocksFor -------------------------------- */

test('blocksFor: 기본 조회', () => {
  assert.equal(blocksFor(fixture, 'Q1', 'ko').length, 1);
});

test('blocksFor: en이 비면 defaultLocale로 폴백', () => {
  const blocks = blocksFor(fixture, 'Q1', 'en');
  assert.ok(blocks.length === 1);
  assert.ok(['ko-a', 'ko-b'].includes(blocks[0].html));
});

test('blocksFor: disabled 엔트리는 null', () => {
  assert.equal(blocksFor(fixture, 'Q9', 'ko'), null);
});

test('blocksFor: 없는 엔트리는 null', () => {
  assert.equal(blocksFor(fixture, 'NOPE', 'ko'), null);
});

test('blocksFor: __fallback 조회', () => {
  assert.equal(blocksFor(fixture, '__fallback', 'ko')[0].html, 'fb');
});

/* --------------------------- 실제 content 검증 ---------------------------- */

test('content/current.json이 있으면 전체 엔트리를 렌더할 수 있다', { skip: !fs.existsSync(CONTENT_PATH) }, () => {
  const content = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
  const TYPES = new Set(['text', 'image', 'gallery', 'actions']);

  for (const id of ['__initial', '__home', '__fallback']) {
    assert.ok(blocksFor(content, id, 'ko')?.length, `${id} 콘텐츠가 비어 있음`);
  }

  for (const entry of content.entries) {
    const blocks = blocksFor(content, entry.id, 'ko');
    if (!blocks) continue;
    for (const block of blocks) {
      assert.ok(TYPES.has(block.type), `${entry.id}: 알 수 없는 type ${block.type}`);
      if (block.type === 'text') assert.equal(typeof block.html, 'string');
      if (block.type === 'image') assert.ok(block.src.startsWith('http'));
      if (block.type === 'gallery') assert.ok(block.images.length > 0);
      if (block.type === 'actions') {
        for (const item of block.items) {
          assert.ok(['ask', 'link'].includes(item.kind), `${entry.id}: 알 수 없는 action ${item.kind}`);
          assert.ok(item.label, `${entry.id}: 라벨 없는 버튼`);
          if (item.kind === 'link') assert.ok(/^https?:\/\//.test(item.url), `${entry.id}: 잘못된 링크 ${item.url}`);
          if (item.kind === 'ask') assert.ok(item.utterance, `${entry.id}: utterance 없는 버튼`);
        }
      }
    }
  }
});

test('ask 버튼의 utterance가 실제로 매칭 가능한 발화인지', { skip: !fs.existsSync(CONTENT_PATH) }, () => {
  const content = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
  const known = new Set(content.entries.flatMap((entry) => entry.utterances?.ko ?? []));
  const dangling = [];

  for (const entry of content.entries) {
    for (const block of entry.blocks.ko ?? []) {
      if (block.type !== 'actions') continue;
      for (const item of block.items) {
        if (item.kind === 'ask' && !known.has(item.utterance)) {
          dangling.push(`${entry.id} -> "${item.utterance}"`);
        }
      }
    }
  }

  assert.deepEqual(dangling, [], `어떤 인텐트에도 매칭되지 않는 버튼:\n  ${dangling.join('\n  ')}`);
});

/* ----------------------------- legacy 호환 ------------------------------- */

test('toLegacyMessages: 구 프론트 포맷으로 되돌린다', async () => {
  const { toLegacyMessages } = await import('./index.mjs');
  const messages = toLegacyMessages([
    { type: 'text', html: '<p>hi</p>' },
    { type: 'image', src: 'a.png', alt: 'A', caption: 'C' },
    { type: 'gallery', images: [{ src: 'g1.png', alt: 'G1' }, { src: 'g2.png' }] },
    {
      type: 'actions',
      items: [
        { kind: 'ask', label: '자기소개', utterance: '자기소개' },
        { kind: 'link', label: '이력서', url: 'https://example.com' },
      ],
    },
  ]);

  assert.equal(messages.length, 5);
  assert.deepEqual(messages[0], { contentType: 'PlainText', content: '<p>hi</p>' });
  assert.equal(messages[1].imageResponseCard.imageUrl, 'a.png');
  assert.equal(messages[1].imageResponseCard.title, 'A');
  assert.equal(messages[2].imageResponseCard.imageUrl, 'g1.png');
  assert.equal(messages[3].imageResponseCard.imageUrl, 'g2.png');
  // '@' prefix 컨벤션 복원
  assert.deepEqual(messages[4].imageResponseCard.buttons, [
    { text: '자기소개', value: '자기소개' },
    { text: '@이력서', value: 'https://example.com' },
  ]);
});

test('toLegacyMessages: 실제 content 전체를 변환해도 깨지지 않는다', { skip: !fs.existsSync(CONTENT_PATH) }, async () => {
  const { toLegacyMessages } = await import('./index.mjs');
  const content = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
  for (const entry of content.entries) {
    const messages = toLegacyMessages(entry.blocks.ko ?? []);
    for (const message of messages) {
      assert.ok(['PlainText', 'ImageResponseCard'].includes(message.contentType));
      if (message.contentType === 'PlainText') assert.equal(typeof message.content, 'string');
    }
  }
});

/* --------------------- sessionId 공유 방지 (회귀 테스트) ------------------- */

test('parseEvent: sessionId가 없으면 매 요청 고유값을 만든다', () => {
  const a = parseEvent({ text: 'x' });
  const b = parseEvent({ text: 'x' });
  assert.notEqual(a.sessionId, b.sessionId, '기본 sessionId가 상수면 모든 방문자가 Lex 세션을 공유하게 된다');
  assert.match(a.sessionId, /^anon-/);
});

test('parseEvent: sessionId가 오면 그대로 쓴다', () => {
  assert.equal(parseEvent({ text: 'x', sessionId: 'abc' }).sessionId, 'abc');
});
