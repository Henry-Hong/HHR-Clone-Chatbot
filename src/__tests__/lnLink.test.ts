import test from 'node:test';
import assert from 'node:assert/strict';
import { taggedLink } from '../utils/lnLink.ts';

const TAG = 'a1b2c3d4e5f6';

test('ln 링크에 세션 태그를 붙인다', () => {
  const out = taggedLink('https://ln.devheerim.com/cv?from=chatbot', TAG);
  const url = new URL(out);
  assert.equal(url.searchParams.get('s'), TAG);
});

test('기존 from 파라미터는 살아남는다', () => {
  const url = new URL(taggedLink('https://ln.devheerim.com/cv?from=chatbot', TAG));
  assert.equal(url.searchParams.get('from'), 'chatbot');
  assert.equal(url.pathname, '/cv');
});

test('쿼리가 없던 링크에도 붙는다', () => {
  const url = new URL(taggedLink('https://ln.devheerim.com/blog', TAG));
  assert.equal(url.searchParams.get('s'), TAG);
});

test('ln 이외 도메인은 건드리지 않는다', () => {
  for (const url of [
    'https://github.com/Henry-Hong',
    'https://www.linkedin.com/in/heerim/',
    'https://devheerim.notion.site/abc',
    'https://ln.devheerim.com.evil.com/cv',
  ]) {
    assert.equal(taggedLink(url, TAG), url, url);
  }
});

test('태그가 없으면 원본 그대로 (대화 전에 누른 링크)', () => {
  const url = 'https://ln.devheerim.com/cv?from=chatbot';
  assert.equal(taggedLink(url, ''), url);
});

test('이미 s가 있으면 덮어쓰지 않는다', () => {
  const url = 'https://ln.devheerim.com/cv?s=manual';
  assert.equal(taggedLink(url, TAG), url);
});

test('절대 URL이 아니거나 깨진 값은 그대로 둔다', () => {
  for (const url of ['/relative/path', '', 'mailto:devheerim@gmail.com', 'javascript:void(0)']) {
    assert.equal(taggedLink(url, TAG), url, url);
  }
});

test('결과는 항상 유효한 URL이다', () => {
  const out = taggedLink('https://ln.devheerim.com/portfolio?from=chatbot', TAG);
  assert.doesNotThrow(() => new URL(out));
  assert.ok(out.startsWith('https://ln.devheerim.com/portfolio?'));
});
