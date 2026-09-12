/**
 * hhr-clone-lex-invoke  (Node.js 24.x / ESM)
 *
 * 역할
 *   1. Lex는 "문자열 -> intentName" 분류기로만 호출한다.
 *   2. 실제 답변(Block[])은 private S3의 content/current.json에서 읽어 조립한다.
 *   3. 모든 대화를 CloudWatch Logs에 구조화 1줄로 남긴다.
 *
 * 환경변수
 *   LEX_BOT_ID          예: QFUOZQHBTO
 *   LEX_BOT_ALIAS_ID    운영용 별칭 ID  (TSTALIASID = 테스트 별칭이므로 사용 금지)
 *   CONTENT_BUCKET      예: hhr-chatbot-content      (private, versioning on)
 *   CONTENT_KEY         기본값 content/current.json
 *   CONTENT_TTL_MS      기본값 60000
 *   SESSION_SALT        sessionId 해시용 솔트
 */

import { createHash } from 'node:crypto';
import { LexRuntimeV2Client, RecognizeTextCommand } from '@aws-sdk/client-lex-runtime-v2';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const lex = new LexRuntimeV2Client({});
const s3 = new S3Client({});

const BUCKET = process.env.CONTENT_BUCKET;
const KEY = process.env.CONTENT_KEY ?? 'content/current.json';
const TTL_MS = Number(process.env.CONTENT_TTL_MS ?? 60_000);
const SESSION_SALT = process.env.SESSION_SALT ?? 'hhr';

const LEX_LOCALE_ID = { ko: 'ko_KR', en: 'en_US' };
const DEFAULT_LOCALE = 'ko';
const FALLBACK_INTENT = 'FallbackIntent';

/* -------------------------------------------------------------------------- */
/*                              content cache                                 */
/* -------------------------------------------------------------------------- */

/** 컨테이너가 살아있는 동안 재사용. ETag로 저비용 재검증한다. */
let cache = { content: null, etag: null, at: 0 };

const loadContent = async () => {
  const fresh = cache.content && Date.now() - cache.at < TTL_MS;
  if (fresh) return cache.content;

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: KEY,
        ...(cache.etag ? { IfNoneMatch: cache.etag } : {}),
      })
    );
    const body = await response.Body.transformToString();
    cache = { content: JSON.parse(body), etag: response.ETag, at: Date.now() };
    return cache.content;
  } catch (error) {
    // 304 = 안 바뀜 -> 캐시 연장
    if (error?.$metadata?.httpStatusCode === 304 && cache.content) {
      cache.at = Date.now();
      return cache.content;
    }
    // content를 못 읽어도 캐시가 있으면 그걸로 버틴다 (가용성 우선)
    if (cache.content) {
      console.error(JSON.stringify({ evt: 'content_stale', err: error.message }));
      return cache.content;
    }
    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/*                                  helpers                                   */
/* -------------------------------------------------------------------------- */

const hashSession = (sessionId) =>
  createHash('sha256').update(`${SESSION_SALT}:${sessionId}`).digest('hex').slice(0, 12);

const pickOne = (candidates) => candidates[Math.floor(Math.random() * candidates.length)];

/** variations를 렌더 직전에 하나로 확정한다. 프론트가 매번 다르게 그리지 않도록. */
export const resolveBlock = (block) => {
  if (block.type === 'text' && block.variations?.length) {
    const { variations, ...rest } = block;
    return { ...rest, html: pickOne([block.html, ...variations]) };
  }
  if (block.type === 'image' && block.variations?.length) {
    const { variations, ...rest } = block;
    const chosen = pickOne([{ src: block.src, alt: block.alt, caption: block.caption }, ...variations]);
    return { ...rest, ...chosen };
  }
  return block;
};

export const blocksFor = (content, entryId, locale) => {
  const entry = content.entries.find((item) => item.id === entryId);
  if (!entry || !entry.enabled) return null;

  const blocks = entry.blocks[locale]?.length
    ? entry.blocks[locale]
    : entry.blocks[content.defaultLocale ?? DEFAULT_LOCALE];

  if (!blocks?.length) return null;
  return blocks.map(resolveBlock);
};

/* -------------------------------------------------------------------------- */
/*                       legacy 호환 (프론트 교체 전까지)                        */
/* -------------------------------------------------------------------------- */

/**
 * 구 프론트가 기대하는 Lex 메시지 모양으로 되돌린다.
 * 새 프론트가 배포되면 이 함수와 legacy 필드를 지우면 된다.
 * (상호 배포 순서에 상관없이 동작하도록 하기 위한 과도기 코드)
 */
export const toLegacyMessages = (blocks) => {
  const messages = [];

  for (const block of blocks) {
    if (block.type === 'text') {
      messages.push({ contentType: 'PlainText', content: block.html });
      continue;
    }
    if (block.type === 'image') {
      messages.push({
        contentType: 'ImageResponseCard',
        imageResponseCard: {
          title: block.alt ?? '-',
          subtitle: block.caption ?? '-',
          imageUrl: block.src,
        },
      });
      continue;
    }
    if (block.type === 'gallery') {
      for (const image of block.images) {
        messages.push({
          contentType: 'ImageResponseCard',
          imageResponseCard: { title: image.alt ?? '-', subtitle: '-', imageUrl: image.src },
        });
      }
      continue;
    }
    if (block.type === 'actions') {
      messages.push({
        contentType: 'ImageResponseCard',
        imageResponseCard: {
          title: '-',
          subtitle: '-',
          // 구 프론트는 '@' prefix를 링크로 해석한다
          buttons: block.items.map((item) =>
            item.kind === 'link'
              ? { text: `@${item.label}`, value: item.url }
              : { text: item.label, value: item.utterance }
          ),
        },
      });
    }
  }

  return messages;
};

/* -------------------------------------------------------------------------- */

export const parseEvent = (event) => {
  const payload =
    typeof event?.body === 'string' ? JSON.parse(event.body || '{}') : event?.body ?? event ?? {};

  const text = String(payload.text ?? '').trim();
  const requested = String(payload.locale ?? '').toLowerCase();
  const locale = LEX_LOCALE_ID[requested] ? requested : DEFAULT_LOCALE;
  const sessionId = String(payload.sessionId ?? 'anonymous');

  return { text, locale, sessionId };
};

/* -------------------------------------------------------------------------- */
/*                                  handler                                   */
/* -------------------------------------------------------------------------- */

export const handler = async (event) => {
  const startedAt = Date.now();
  const { text, locale, sessionId } = parseEvent(event);

  const log = (extra) =>
    console.log(
      JSON.stringify({
        evt: 'chat',
        ts: startedAt,
        sid: hashSession(sessionId),
        locale,
        q: text,
        ms: Date.now() - startedAt,
        ...extra,
      })
    );

  if (!text) {
    log({ intent: null, hit: false, err: 'empty_text' });
    return { locale, intent: null, confidence: 0, fallback: true, blocks: [], messages: [], metadatas: { confidence: 0 } };
  }

  try {
    const content = await loadContent();

    const lexResponse = await lex.send(
      new RecognizeTextCommand({
        botId: process.env.LEX_BOT_ID,
        botAliasId: process.env.LEX_BOT_ALIAS_ID,
        localeId: LEX_LOCALE_ID[locale],
        sessionId,
        text,
      })
    );

    const interpretation = lexResponse.interpretations?.[0];
    const intent = interpretation?.intent?.name ?? FALLBACK_INTENT;
    const confidence = interpretation?.nluConfidence?.score ?? 0;

    const blocks = intent === FALLBACK_INTENT ? null : blocksFor(content, intent, locale);

    if (!blocks) {
      const fallbackBlocks = blocksFor(content, '__fallback', locale) ?? [];
      log({ intent, conf: confidence, hit: false });
      return {
        locale,
        intent,
        confidence,
        fallback: true,
        blocks: fallbackBlocks,
        // legacy: 구 프론트는 messages가 빈 배열이면 자체 fallback UI를 그린다
        messages: [],
        metadatas: { confidence },
      };
    }

    log({ intent, conf: confidence, hit: true, blocks: blocks.length });
    return {
      locale,
      intent,
      confidence,
      fallback: false,
      blocks,
      messages: toLegacyMessages(blocks),
      metadatas: { confidence },
    };
  } catch (error) {
    console.error(JSON.stringify({ evt: 'chat_error', q: text, locale, err: error.message }));
    log({ intent: null, hit: false, err: error.name });
    return {
      locale,
      intent: null,
      confidence: 0,
      fallback: true,
      error: 'internal_error',
      blocks: [],
      messages: [],
      metadatas: { confidence: 0 },
    };
  }
};
