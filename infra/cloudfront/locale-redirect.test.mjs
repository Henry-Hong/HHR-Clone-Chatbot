import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/*
 * CloudFront Function은 모듈이 아니라 전역에 handler를 두는 스크립트다.
 * 배포되는 파일을 그대로 돌려서 검증한다 (복사본을 만들면 어긋난다).
 */
const source = fs.readFileSync(path.join(import.meta.dirname, 'locale-redirect.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const { handler, prefersKorean } = sandbox;

const request = (over = {}) => ({
  request: { uri: '/', querystring: {}, headers: {}, ...over },
});

const withLang = (value, over = {}) =>
  request({ headers: { 'accept-language': { value } }, ...over });

const isRedirect = (result) => result.statusCode === 302 && result.headers.location.value === '/en';

/* ------------------------------- 언어 판정 -------------------------------- */

test('한국어가 1순위면 한국어', () => {
  for (const value of ['ko', 'ko-KR', 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7', 'ko,en']) {
    assert.equal(prefersKorean(value), true, value);
  }
});

test('영어가 한국어보다 앞서면 영어', () => {
  for (const value of ['en', 'en-US,en;q=0.9', 'en-US,en;q=0.9,ko;q=0.8']) {
    assert.equal(prefersKorean(value), false, value);
  }
});

test('한국어도 영어도 없으면 영어 화면이 낫다', () => {
  for (const value of ['ja', 'fr-FR,fr;q=0.9', 'zh-CN']) {
    assert.equal(prefersKorean(value), false, value);
  }
});

test('헤더가 없거나 비면 기본(한국어) — 크롤러가 대부분 여기', () => {
  for (const value of ['', '   ', undefined, null]) {
    assert.equal(prefersKorean(value), true, JSON.stringify(value));
  }
});

test('와일드카드만 있으면 선호가 없는 것으로 본다', () => {
  assert.equal(prefersKorean('*'), true);
});

test('q=0 은 원하지 않는다는 뜻이라 무시한다', () => {
  assert.equal(prefersKorean('en;q=0,ko;q=0.5'), true);
  assert.equal(prefersKorean('ko;q=0,en;q=0.5'), false);
});

test('q 값이 같으면 한국어를 유지한다 (기본 화면)', () => {
  assert.equal(prefersKorean('en;q=0.8,ko;q=0.8'), true);
});

test('망가진 헤더에도 터지지 않는다', () => {
  for (const value of [',,,', ';q=', 'ko;q=abc', 'ko;;q=0.9']) {
    assert.equal(typeof prefersKorean(value), 'boolean', value);
  }
});

/* -------------------------------- 핸들러 --------------------------------- */

test('영어권이 루트로 오면 /en 으로 보낸다', () => {
  assert.ok(isRedirect(handler(withLang('en-US,en;q=0.9'))));
});

test('한국어권 루트는 그대로 통과 (캐시된 / 를 그대로 쓴다)', () => {
  const result = handler(withLang('ko-KR,ko;q=0.9'));
  assert.equal(result.statusCode, undefined);
  assert.equal(result.uri, '/');
});

test('/en 은 무슨 일이 있어도 리다이렉트하지 않는다', () => {
  const result = handler(withLang('ko-KR,ko;q=0.9', { uri: '/en' }));
  assert.equal(result.uri, '/en');
  assert.equal(result.statusCode, undefined);
});

test('정적 자산은 건드리지 않는다', () => {
  for (const uri of ['/assets/index-abc.js', '/favicon.ico', '/img_robot.gif']) {
    const result = handler(withLang('en-US', { uri }));
    assert.equal(result.uri, uri);
    assert.equal(result.statusCode, undefined);
  }
});

test('/index.html 도 루트로 본다', () => {
  assert.ok(isRedirect(handler(withLang('en-US', { uri: '/index.html' }))));
});

test('lang 쿼리가 있으면 판정하지 않는다 — 영어권도 한국어 화면을 볼 수 있어야 한다', () => {
  const result = handler(withLang('en-US,en;q=0.9', { querystring: { lang: { value: 'ko' } } }));
  assert.equal(result.uri, '/');
  assert.equal(result.statusCode, undefined);
});

test('Accept-Language 가 없으면 통과 — 크롤러가 / 를 색인할 수 있어야 한다', () => {
  const result = handler(request());
  assert.equal(result.uri, '/');
  assert.equal(result.statusCode, undefined);
});

test('리다이렉트에 Vary 와 no-cache 가 붙는다', () => {
  const result = handler(withLang('en-US'));
  assert.equal(result.headers.vary.value, 'Accept-Language');
  assert.equal(result.headers['cache-control'].value, 'no-cache');
});
