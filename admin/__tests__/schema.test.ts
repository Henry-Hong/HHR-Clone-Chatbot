import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_SCHEMA_VERSION, assertSupportedSchema } from '../lib/schema.ts';
import { content, entry } from './fixtures.ts';

test('다룰 수 있는 버전은 그대로 통과시킨다', () => {
  const file = content([entry({ id: 'AIntent' })]);
  assert.equal(assertSupportedSchema(file), file);
});

test('모르는 버전이면 던진다', () => {
  for (const version of [2, 0, 1.5]) {
    const file = { ...content([]), schemaVersion: version } as never;
    assert.throws(() => assertSupportedSchema(file), /스키마 버전/, `${version}은 거부돼야 한다`);
  }
});

test('버전이 없거나 콘텐츠 자체가 없어도 터지지 않고 거부한다', () => {
  for (const broken of [{}, { schemaVersion: null }, { schemaVersion: '1' }, null, undefined]) {
    assert.throws(() => assertSupportedSchema(broken as never), /스키마 버전/, JSON.stringify(broken));
  }
});

test('오류 메시지에 실제로 발견한 값이 들어간다', () => {
  assert.throws(() => assertSupportedSchema({ schemaVersion: 2 } as never), /2/);
  assert.throws(() => assertSupportedSchema({} as never), /undefined/);
});

test('현재 지원 버전은 1', () => {
  assert.equal(SUPPORTED_SCHEMA_VERSION, 1);
});
