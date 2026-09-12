import type { ContentFile } from '@/types';

/**
 * 이 어드민이 다룰 수 있는 콘텐츠 스키마 버전.
 *
 * `ContentFile.schemaVersion`은 지금까지 읽기만 하고 검사하지 않았다.
 * 나중에 스키마를 2로 올리면, 아직 1만 아는 어드민이 파일을 열어 편집하고
 * 저장하면서 모르는 필드를 통째로 날려버릴 수 있다. S3의 Source of Truth라
 * 조용히 지워지면 알아채기 어렵다.
 *
 * 스키마를 올릴 때는 이 상수와 `src/types/content.ts`를 함께 바꾼다.
 */
export const SUPPORTED_SCHEMA_VERSION = 1;

export const schemaMismatchMessage = (found: unknown): string =>
  `콘텐츠 스키마 버전이 ${JSON.stringify(found)}입니다. ` +
  `이 어드민은 ${SUPPORTED_SCHEMA_VERSION}만 다룰 수 있어요. ` +
  `그대로 편집하면 어드민이 모르는 항목이 저장할 때 사라집니다. 어드민을 최신으로 받아주세요.`;

/** 다룰 수 있는 버전이면 그대로 돌려주고, 아니면 던진다. */
export const assertSupportedSchema = (content: ContentFile): ContentFile => {
  if (content?.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(schemaMismatchMessage(content?.schemaVersion));
  }
  return content;
};
