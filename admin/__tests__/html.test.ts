import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLOWED_TAGS, disallowedTags, hasUnbalancedTags, plainText } from '../lib/html.ts';

test('허용 목록에 있는 태그는 통과', () => {
  const html = ALLOWED_TAGS.map((tag) => `<${tag}>x</${tag}>`).join('');
  assert.deepEqual(disallowedTags(html), []);
});

test('허용 목록에 없는 태그를 찾는다', () => {
  assert.deepEqual(disallowedTags('<p>a</p><script>b</script>'), ['script']);
  assert.deepEqual(disallowedTags('<div><span>x</span></div>').sort(), ['div', 'span']);
});

test('같은 태그가 여러 번 나와도 한 번만 보고한다', () => {
  assert.deepEqual(disallowedTags('<div>a</div><div>b</div>'), ['div']);
});

test('대소문자를 구분하지 않는다', () => {
  assert.deepEqual(disallowedTags('<P>a</P>'), []);
  assert.deepEqual(disallowedTags('<SCRIPT>x</SCRIPT>'), ['script']);
});

test('속성이 붙어 있어도 태그 이름만 본다', () => {
  assert.deepEqual(disallowedTags('<a href="https://x" target="_blank">x</a>'), []);
});

/* -------------------------------------------------------------------------- */

test('짝이 맞으면 통과', () => {
  assert.equal(hasUnbalancedTags('<p>안녕</p>'), false);
  assert.equal(hasUnbalancedTags('<p><strong>안녕</strong></p>'), false);
  assert.equal(hasUnbalancedTags('<ul><li>a</li><li>b</li></ul>'), false);
});

test('닫히지 않았거나 순서가 어긋나면 잡는다', () => {
  assert.equal(hasUnbalancedTags('<p>안녕'), true);
  assert.equal(hasUnbalancedTags('<p><strong>안녕</p></strong>'), true);
  assert.equal(hasUnbalancedTags('</p>'), true);
});

test('br 같은 void 태그는 닫지 않아도 된다', () => {
  assert.equal(hasUnbalancedTags('<p>한 줄<br>다음 줄</p>'), false);
  assert.equal(hasUnbalancedTags('<p>한 줄<br />다음 줄</p>'), false);
});

test('빈 문자열은 문제 없음', () => {
  assert.equal(hasUnbalancedTags(''), false);
  assert.deepEqual(disallowedTags(''), []);
});

/* -------------------------------------------------------------------------- */

test('plainText는 태그를 걷어낸다', () => {
  assert.equal(plainText('<p>안녕 <strong>세상</strong></p>'), '안녕 세상');
  assert.equal(plainText('<p></p>'), '');
  assert.equal(plainText('<p>   </p>'), '');
});
