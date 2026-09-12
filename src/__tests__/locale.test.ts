import test from 'node:test';
import assert from 'node:assert/strict';
import { detectLocale, localeFromPath, pathForLocale } from '../utils/locale.ts';

test('한글이 있으면 한국어', () => {
  for (const text of ['이력서', '자기소개 해줘', '어떻게 만들었어?', 'Notion 링크 줘', 'ㅇㅋ']) {
    assert.equal(detectLocale(text), 'ko', text);
  }
});

test('한글이 없으면 영어', () => {
  for (const text of ['resume', 'who are you', 'How did you build this?', 'portfolio!']) {
    assert.equal(detectLocale(text), 'en', text);
  }
});

test('빈 입력은 기본값', () => {
  assert.equal(detectLocale(''), 'ko');
  assert.equal(detectLocale('   '), 'ko');
  assert.equal(detectLocale('', 'en'), 'en');
});

test('숫자·기호만 있으면 영어로 본다 (Lex 영어 쪽이 더 관대하다)', () => {
  assert.equal(detectLocale('???'), 'en');
  assert.equal(detectLocale('2024'), 'en');
});

test('경로로 화면 언어를 정한다', () => {
  assert.equal(localeFromPath('/en'), 'en');
  assert.equal(localeFromPath('/en/'), 'en');
  assert.equal(localeFromPath('/EN'), 'en');
  assert.equal(localeFromPath('/'), 'ko');
  assert.equal(localeFromPath('/무엇이든'), 'ko');
});

test('언어 → 경로', () => {
  assert.equal(pathForLocale('en'), '/en');
  assert.equal(pathForLocale('ko'), '/');
});
