#!/usr/bin/env node
/**
 * Lex V2 봇 export(JSON) -> content/current.json 마이그레이션.
 *
 * 사용법:
 *   1) Lex 콘솔 > 봇 > 작업 > 내보내기 (플랫폼 Lex / 형식 Json / 비밀번호 없음)
 *   2) 받은 zip을 풀고, 그 안의 `<BotName>/` 디렉터리 경로를 넘긴다.
 *
 *   node scripts/lex-to-content.mjs ./.lex-export-HHR-Bot [-o content/current.json]
 *
 * 이 스크립트는 Lex에 흩어져 있던 답변 본문 + 프론트에 하드코딩된 화면 문구를
 * 하나의 content 파일로 합친다. 결과물은 git에 커밋하지 않는다(private S3로 간다).
 */

import fs from 'node:fs';
import path from 'node:path';

/* -------------------------------------------------------------------------- */
/*                                   config                                   */
/* -------------------------------------------------------------------------- */

/** Lex localeId -> 우리 Locale */
const LOCALE_MAP = { ko_KR: 'ko', en_US: 'en' };

/** Lex가 "비어있음"을 표현하려고 쓰던 플레이스홀더 값들 */
const PLACEHOLDERS = new Set(['-', '', null, undefined]);

/** 링크 버튼임을 나타내던 prefix 컨벤션 */
const LINK_PREFIX = '@';

const warnings = [];
const notes = [];
const warn = (msg) => warnings.push(msg);
const note = (msg) => notes.push(msg);

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

const clean = (value) => {
  if (value === null || value === undefined) return undefined;
  const trimmed = String(value).trim();
  return PLACEHOLDERS.has(trimmed) ? undefined : trimmed;
};

/** 순수 ASCII(영문/숫자/기호)만으로 이루어진 발화인지 -> en 시드 후보 */
const looksEnglish = (utterance) => /^[\x20-\x7E]+$/.test(utterance) && /[a-zA-Z]/.test(utterance);

/** trailing comma 등 흔한 실수를 고쳐서 JSON.parse 시도 */
const parseLooseJson = (raw, context) => {
  try {
    return JSON.parse(raw);
  } catch {
    const repaired = raw.replace(/,(\s*[}\]])/g, '$1');
    try {
      const parsed = JSON.parse(repaired);
      warn(`${context}: customPayload가 잘못된 JSON이었습니다 (trailing comma). 자동 복구했습니다.`);
      return parsed;
    } catch (error) {
      warn(`${context}: customPayload를 파싱하지 못해 건너뜁니다. (${error.message})`);
      return null;
    }
  }
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

/* -------------------------------------------------------------------------- */
/*                              message -> blocks                             */
/* -------------------------------------------------------------------------- */

const toAction = (button, context) => {
  const text = String(button.text ?? '').trim();
  const value = String(button.value ?? '').trim();

  if (text.startsWith(LINK_PREFIX)) {
    const label = text.slice(LINK_PREFIX.length).trim();
    if (!/^https?:\/\//.test(value)) {
      warn(`${context}: '@' 링크 버튼("${text}")의 값이 URL이 아닙니다 -> "${value}"`);
    }
    return { kind: 'link', label, url: value };
  }
  return { kind: 'ask', label: text, utterance: value };
};

/** imageResponseCard 하나를 image / actions 블록으로 분해 */
const cardToBlocks = (card, context, variationCards = []) => {
  const blocks = [];

  const title = clean(card.title);
  const subtitle = clean(card.subtitle);
  const src = clean(card.imageUrl);
  const buttons = card.buttonsList ?? [];

  if (src) {
    const block = { type: 'image', src };
    if (title) block.alt = title;
    if (subtitle) block.caption = subtitle;

    const variations = variationCards
      .map((variation) => {
        const vSrc = clean(variation.imageUrl);
        if (!vSrc) return null;
        const v = { src: vSrc };
        const vTitle = clean(variation.title);
        const vSubtitle = clean(variation.subtitle);
        if (vTitle) v.alt = vTitle;
        if (vSubtitle) v.caption = vSubtitle;
        return v;
      })
      .filter(Boolean);

    if (variations.length) block.variations = variations;
    blocks.push(block);

    if (!/^https?:\/\/(simple-storages\.s3|[^/]*\.cloudfront\.net)/.test(src)) {
      warn(`${context}: 외부 도메인 이미지를 핫링크하고 있습니다 -> ${src.slice(0, 80)}`);
    }
  }

  if (buttons.length) {
    blocks.push({ type: 'actions', items: buttons.map((button) => toAction(button, context)) });
  }

  if (!blocks.length) {
    warn(`${context}: 내용이 없는 빈 imageResponseCard를 제거했습니다. (title=${JSON.stringify(card.title)})`);
  }

  return blocks;
};

const customPayloadToBlocks = (payload, context) => {
  const parsed = parseLooseJson(payload.value ?? '', context);
  if (!parsed) return [];

  if (parsed.contentType === 'ImageList' && Array.isArray(parsed.imageList)) {
    const images = parsed.imageList
      .map((image) => {
        const src = clean(image.src);
        if (!src) return null;
        const entry = { src };
        const alt = clean(image.alt);
        if (alt) entry.alt = alt;
        return entry;
      })
      .filter(Boolean);

    if (!images.length) return [];

    // 같은 이미지가 반복되는 경우(더미 데이터) 중복 제거
    const unique = [];
    const seen = new Set();
    for (const image of images) {
      const key = `${image.src}|${image.alt ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(image);
    }
    if (unique.length !== images.length) {
      warn(`${context}: ImageList에 중복 이미지가 ${images.length - unique.length}개 있어 정리했습니다.`);
    }

    return [{ type: 'gallery', images: unique }];
  }

  warn(`${context}: 알 수 없는 customPayload contentType="${parsed.contentType}" -> 건너뜁니다.`);
  return [];
};

/** Lex messageGroupsList -> Block[] */
const messageGroupsToBlocks = (groups, context) => {
  const blocks = [];

  (groups ?? []).forEach((group, index) => {
    const at = `${context} [${index}]`;
    const message = group.message ?? {};
    const variations = group.variations ?? [];

    if (message.plainTextMessage) {
      const block = { type: 'text', html: message.plainTextMessage.value };
      const texts = variations
        .map((variation) => variation.plainTextMessage?.value)
        .filter((value) => typeof value === 'string' && value.trim());
      if (texts.length) block.variations = texts;
      blocks.push(block);
      return;
    }

    if (message.imageResponseCard) {
      const variationCards = variations.map((variation) => variation.imageResponseCard).filter(Boolean);
      blocks.push(...cardToBlocks(message.imageResponseCard, at, variationCards));
      return;
    }

    if (message.customPayload) {
      blocks.push(...customPayloadToBlocks(message.customPayload, at));
      return;
    }

    if (message.ssmlMessage) {
      warn(`${at}: ssmlMessage는 텍스트 챗봇에서 쓰지 않으므로 건너뜁니다.`);
      return;
    }

    warn(`${at}: 인식할 수 없는 메시지라 건너뜁니다.`);
  });

  return blocks;
};

/* -------------------------------------------------------------------------- */
/*                             intent -> entry                                */
/* -------------------------------------------------------------------------- */

const orderOf = (intentName) => {
  const match = /^Q(\d+)/.exec(intentName);
  return match ? Number(match[1]) : 900;
};

const titleOf = (intent) =>
  clean(intent.description) ?? intent.name.replace(/^Q\d+-/, '').replace(/-/g, ' ');

const collectIntent = (intentDir, intentName, locale) => {
  const intent = readJson(path.join(intentDir, 'Intent.json'));
  const context = `${locale}/${intentName}`;

  const utterances = (intent.sampleUtterances ?? [])
    .map((item) => String(item.utterance ?? '').trim())
    .filter(Boolean);

  const initial = intent.initialResponseSetting?.initialResponse?.messageGroupsList;
  const closing = intent.intentClosingSetting?.closingResponse?.messageGroupsList;

  const blocks = [
    ...messageGroupsToBlocks(initial, `${context}.initialResponse`),
    ...messageGroupsToBlocks(closing, `${context}.closingResponse`),
  ];

  return { intent, utterances, blocks };
};

/* -------------------------------------------------------------------------- */
/*                    프론트에 하드코딩돼 있던 화면용 콘텐츠                      */
/* -------------------------------------------------------------------------- */

/**
 * src/consts.ts 의 INITIAL_CHAT / HOMEBUTTON_CHAT 과
 * src/components/customs/Main/Chat/FallbackIntent.tsx 의 문구를 흡수한다.
 * 이 마이그레이션 이후로 콘텐츠 소스는 content 파일 하나뿐이다.
 */
const systemEntries = () => [
  {
    id: '__initial',
    title: '최초 인사',
    kind: 'system',
    enabled: true,
    showInFaq: false,
    order: 0,
    utterances: { ko: [], en: [] },
    blocks: {
      ko: [
        { type: 'text', html: '<p>안녕하세요! <mark>FrontEnd Engineer 홍희림</mark>입니다.</p>' },
        { type: 'text', html: '아래의 키워드를 눌러주세요!' },
        {
          type: 'actions',
          items: [
            { kind: 'ask', label: '자기소개', utterance: '자기소개' },
            { kind: 'ask', label: '이력서', utterance: '이력서' },
            { kind: 'ask', label: '포트폴리오', utterance: '포트폴리오' },
          ],
        },
        {
          type: 'actions',
          items: [{ kind: 'ask', label: '어떻게 만들었어?', utterance: '시스템 구조' }],
        },
      ],
      en: [],
    },
  },
  {
    id: '__home',
    title: '홈 버튼',
    kind: 'system',
    enabled: true,
    showInFaq: false,
    order: 901,
    utterances: { ko: [], en: [] },
    blocks: {
      ko: [
        { type: 'text', html: '<p>자주 물어보는 질문들이에요.</p>' },
        {
          type: 'actions',
          items: [
            { kind: 'ask', label: '자기소개', utterance: '자기소개' },
            { kind: 'ask', label: '이력서', utterance: '이력서' },
            { kind: 'ask', label: '포트폴리오', utterance: '포트폴리오' },
            { kind: 'ask', label: '아키텍처', utterance: '시스템 구조' },
          ],
        },
      ],
      en: [],
    },
  },
  {
    id: '__fallback',
    title: '답변 실패 안내',
    kind: 'system',
    enabled: true,
    showInFaq: false,
    order: 902,
    utterances: { ko: [], en: [] },
    blocks: {
      ko: [
        { type: 'text', html: '다른 질문이 있으신가요?' },
        {
          type: 'actions',
          items: [{ kind: 'ask', label: '자주 묻는 질문 보기', utterance: '자주 묻는 질문 보기' }],
        },
      ],
      en: [],
    },
  },
];

/* -------------------------------------------------------------------------- */
/*                                    main                                    */
/* -------------------------------------------------------------------------- */

const main = () => {
  const args = process.argv.slice(2);
  const exportDir = args.find((arg) => !arg.startsWith('-'));
  const outIndex = args.indexOf('-o');
  const outPath = outIndex >= 0 ? args[outIndex + 1] : 'content/current.json';

  if (!exportDir) {
    console.error('usage: node scripts/lex-to-content.mjs <lex-export-dir> [-o out.json]');
    process.exit(1);
  }

  const localesDir = path.join(exportDir, 'BotLocales');
  if (!fs.existsSync(localesDir)) {
    console.error(`BotLocales 디렉터리를 찾을 수 없습니다: ${localesDir}`);
    process.exit(1);
  }

  /** intentName -> entry(부분) */
  const byIntent = new Map();

  for (const lexLocale of fs.readdirSync(localesDir)) {
    const locale = LOCALE_MAP[lexLocale];
    if (!locale) {
      note(`로케일 ${lexLocale}은(는) 매핑 대상이 아니라 건너뜁니다.`);
      continue;
    }

    const intentsDir = path.join(localesDir, lexLocale, 'Intents');
    if (!fs.existsSync(intentsDir)) continue;

    for (const intentName of fs.readdirSync(intentsDir)) {
      // Fallback은 응답이 프론트에 있으므로 __fallback system 엔트리로 대체한다.
      if (intentName === 'FallbackIntent') continue;

      const { intent, utterances, blocks } = collectIntent(
        path.join(intentsDir, intentName),
        intentName,
        lexLocale
      );

      if (!utterances.length && !blocks.length) {
        note(`${lexLocale}/${intentName}: 발화도 응답도 없는 빈 인텐트라 제외했습니다.`);
        continue;
      }

      if (!byIntent.has(intentName)) {
        byIntent.set(intentName, {
          id: intentName,
          title: titleOf(intent),
          kind: 'intent',
          enabled: true,
          showInFaq: false,
          order: orderOf(intentName),
          utterances: { ko: [], en: [] },
          blocks: { ko: [], en: [] },
        });
      }

      const entry = byIntent.get(intentName);
      entry.utterances[locale] = utterances;
      entry.blocks[locale] = blocks;
    }
  }

  const entries = [...byIntent.values()];

  // ── en 시드: ko 발화 중 영문으로만 된 것들을 en 쪽에도 넣어준다 ──────────────
  for (const entry of entries) {
    if (entry.utterances.en.length) continue;
    const seeds = entry.utterances.ko.filter(looksEnglish);
    if (seeds.length) {
      entry.utterances.en = seeds;
      note(`${entry.id}: 영문 발화 ${JSON.stringify(seeds)}를 en 시드로 복사했습니다.`);
    }
  }

  // ── showInFaq: FAQ 인텐트가 실제로 걸어둔 버튼을 기준으로 역산 ───────────────
  const faqEntry = entries.find((entry) => /FAQ/i.test(entry.id));
  if (faqEntry) {
    const faqUtterances = new Set(
      faqEntry.blocks.ko
        .filter((block) => block.type === 'actions')
        .flatMap((block) => block.items)
        .filter((item) => item.kind === 'ask')
        .map((item) => item.utterance)
    );

    for (const entry of entries) {
      const matched = entry.utterances.ko.some((utterance) => faqUtterances.has(utterance));
      if (matched) entry.showInFaq = true;
    }
    note(`FAQ 노출 대상: ${entries.filter((e) => e.showInFaq).map((e) => e.id).join(', ') || '(없음)'}`);
  }

  entries.push(...systemEntries());

  // ── ask 버튼이 가리키는 발화가 실제로 등록돼 있는지 ──────────────────────
  // 등록 안 된 발화는 Lex의 퍼지 매칭에 운으로 걸리는 상태라, 임계값이나
  // 다른 인텐트 발화가 바뀌면 조용히 fallback으로 떨어진다.
  for (const locale of ['ko', 'en']) {
    const known = new Set(entries.flatMap((entry) => entry.utterances[locale]));
    if (!known.size) continue;

    for (const entry of entries) {
      for (const block of entry.blocks[locale] ?? []) {
        if (block.type !== 'actions') continue;
        for (const item of block.items) {
          if (item.kind !== 'ask' || known.has(item.utterance)) continue;

          // 라벨이 어떤 인텐트의 발화와 정확히 일치하면 그 인텐트로 이어주려던 의도로 본다
          const target = entries.find((candidate) =>
            candidate.utterances[locale].includes(item.label)
          );
          if (target) {
            target.utterances[locale].push(item.utterance);
            known.add(item.utterance);
            warn(
              `[${locale}] ${entry.id}의 버튼 "${item.label}"이 미등록 발화 "${item.utterance}"를 보내고 있었습니다. ` +
                `${target.id}의 발화로 등록했습니다.`
            );
          } else {
            warn(
              `[${locale}] ${entry.id}의 버튼 "${item.label}" -> "${item.utterance}": ` +
                `어떤 인텐트에도 등록되지 않은 발화입니다. 연결할 인텐트를 지정해주세요.`
            );
          }
        }
      }
    }
  }

  entries.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  const content = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    defaultLocale: 'ko',
    entries,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');

  /* ------------------------------- 리포트 ------------------------------- */
  const blockCount = (locale) =>
    entries.reduce((sum, entry) => sum + entry.blocks[locale].length, 0);

  console.log(`\n✅ ${outPath} 생성 완료\n`);
  console.log(`   엔트리       : ${entries.length}개 (intent ${entries.filter((e) => e.kind === 'intent').length} / system ${entries.filter((e) => e.kind === 'system').length})`);
  console.log(`   블록         : ko ${blockCount('ko')}개 / en ${blockCount('en')}개`);
  console.log(`   발화         : ko ${entries.reduce((s, e) => s + e.utterances.ko.length, 0)}개 / en ${entries.reduce((s, e) => s + e.utterances.en.length, 0)}개`);

  console.log('\n   ┌─ 엔트리 목록 ──────────────────────────────────────────');
  for (const entry of entries) {
    const faq = entry.showInFaq ? ' ★FAQ' : '';
    const en = entry.blocks.en.length ? `en:${entry.blocks.en.length}` : 'en:—';
    console.log(
      `   │ ${String(entry.order).padStart(3)} ${entry.id.padEnd(24)} ko:${String(entry.blocks.ko.length).padEnd(3)} ${en.padEnd(6)} utt(ko/en):${entry.utterances.ko.length}/${entry.utterances.en.length}${faq}`
    );
  }
  console.log('   └────────────────────────────────────────────────────────');

  if (notes.length) {
    console.log('\n   ℹ️  참고');
    notes.forEach((message) => console.log(`      · ${message}`));
  }
  if (warnings.length) {
    console.log('\n   ⚠️  확인 필요');
    warnings.forEach((message) => console.log(`      · ${message}`));
  }
  console.log('');
};

main();
