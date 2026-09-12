#!/usr/bin/env node
/**
 * S3 접근 없이 어드민/프론트를 돌려보기 위한 로컬 시드 콘텐츠를 만든다.
 *
 *   node scripts/seed-content.mjs           # content/current.json 이 없을 때만 생성
 *   node scripts/seed-content.mjs --force   # 있어도 덮어쓴다
 *
 * 실제 답변은 S3(private)에 있다. 이 시드는 "구조만 같은 더미"이므로
 * 진짜 콘텐츠로 작업하려면 여전히 아래를 먼저 받아와야 한다.
 *
 *   aws s3 cp s3://$CONTENT_BUCKET/content/current.json content/current.json
 *
 * system 엔트리(__initial/__home/__fallback)는 이미 커밋돼 있는
 * src/generated/ui-content.ts 에서 그대로 복원하므로 실제와 동일하다.
 */

import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.CONTENT_FILE ?? 'content/current.json';
const UI = 'src/generated/ui-content.ts';
const force = process.argv.includes('--force');

if (fs.existsSync(OUT) && !force) {
  console.log(`ℹ️  ${OUT} 이 이미 있습니다. 덮어쓰려면 --force`);
  process.exit(0);
}

/** ui-content.ts 는 TS지만 본문이 순수 JSON이라 객체 리터럴만 떼어내 파싱한다. */
const readUiContent = () => {
  if (!fs.existsSync(UI)) return null;
  const source = fs.readFileSync(UI, 'utf8');
  const start = source.indexOf('} = {');
  if (start === -1) return null;
  const body = source.slice(start + 4);
  const end = body.lastIndexOf('} as const;');
  if (end === -1) return null;
  try {
    return JSON.parse(body.slice(0, end + 1));
  } catch {
    return null;
  }
};

const empty = () => ({ ko: [], en: [] });

const ui = readUiContent();
if (!ui) console.warn(`⚠️  ${UI} 를 읽지 못해 system 엔트리를 빈 값으로 만듭니다.`);

const system = (id, title, order, key) => ({
  id,
  title,
  kind: 'system',
  enabled: true,
  showInFaq: false,
  order,
  utterances: { ko: [], en: [] },
  blocks: ui?.[key] ?? empty(),
});

const content = {
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  defaultLocale: 'ko',
  entries: [
    system('__initial', '최초 인사', 0, 'initial'),
    system('__home', '홈', 1, 'home'),
    system('__fallback', '이해 못했을 때', 2, 'fallback'),
    {
      id: 'SelfIntroductionIntent',
      title: '자기소개',
      kind: 'intent',
      enabled: true,
      showInFaq: true,
      order: 3,
      // 'self introduction'은 __initial / __home의 영어 버튼이 보내는 발화다.
      // 등록해두지 않으면 Lex 퍼지 매칭에 기대게 된다.
      utterances: {
        ko: ['자기소개', '너 누구야', '소개해줘'],
        en: ['who are you', 'introduce yourself', 'self introduction'],
      },
      blocks: {
        ko: [
          { type: 'text', html: '<p>(시드 데이터) 프론트엔드 엔지니어 <mark>홍희림</mark>입니다.</p>' },
          {
            type: 'actions',
            items: [
              { kind: 'ask', label: '이력서', utterance: '이력서' },
              { kind: 'ask', label: '포트폴리오', utterance: '포트폴리오' },
            ],
          },
        ],
        en: [{ type: 'text', html: '<p>(seed) I am <mark>Heerim Hong</mark>, a frontend engineer.</p>' }],
      },
    },
    {
      id: 'ResumeIntent',
      title: '이력서',
      kind: 'intent',
      enabled: true,
      showInFaq: true,
      order: 4,
      utterances: { ko: ['이력서', '경력', '커리어'], en: ['resume', 'cv'] },
      blocks: {
        ko: [
          { type: 'text', html: '<p>(시드 데이터) 이력서 내용이 들어갈 자리입니다.</p>' },
          { type: 'actions', items: [{ kind: 'link', label: '이력서 보기', url: 'https://example.com/resume' }] },
        ],
        en: [],
      },
    },
    {
      id: 'PortfolioIntent',
      title: '포트폴리오',
      kind: 'intent',
      enabled: true,
      showInFaq: true,
      order: 5,
      utterances: { ko: ['포트폴리오', '만든거', '프로젝트'], en: ['portfolio', 'projects'] },
      blocks: {
        ko: [
          { type: 'text', html: '<p>(시드 데이터) 만든 것들입니다.</p>' },
          {
            type: 'gallery',
            images: [
              { src: 'https://placehold.co/400x400/png?text=1', alt: '샘플 1' },
              { src: 'https://placehold.co/400x400/png?text=2', alt: '샘플 2' },
            ],
          },
        ],
        en: [],
      },
    },
    {
      // __fallback 화면의 버튼이 '자주 묻는 질문 보기' / 'faq'를 보낸다.
      id: 'FaqIntent',
      title: '자주 묻는 질문',
      kind: 'intent',
      enabled: true,
      showInFaq: false,
      order: 6,
      utterances: { ko: ['자주 묻는 질문 보기', '자주 묻는 질문'], en: ['faq', 'common questions'] },
      blocks: {
        ko: [{ type: 'text', html: '<p>(시드 데이터) 자주 묻는 질문 목록이 들어갈 자리입니다.</p>' }],
        en: [{ type: 'text', html: '<p>(seed) Frequently asked questions go here.</p>' }],
      },
    },
    {
      id: 'SystemArchitectureIntent',
      title: '시스템 구조',
      kind: 'intent',
      enabled: true,
      showInFaq: false,
      order: 6,
      // 'system architecture'는 __initial / __home의 영어 버튼이 보내는 발화다.
      utterances: {
        ko: ['시스템 구조', '어떻게 만들었어'],
        en: ['how did you build this', 'system architecture'],
      },
      blocks: {
        ko: [{ type: 'text', html: '<p>(시드 데이터) S3 + Lex + Lambda로 만들었습니다.</p>' }],
        en: [],
      },
    },
  ],
};

/**
 * 버튼이 보내는 발화 중 어느 인텐트에도 등록되지 않은 것을 찾아 스텁 인텐트에 붙인다.
 *
 * 그 상태로 두면 챗봇이 Lex 퍼지 매칭에 기대게 되고, 어드민 검증과
 * `lambda/index.test.mjs`가 모두 오류로 잡는다. 위에서 손으로 맞춰뒀지만
 * src/generated/ui-content.ts가 바뀌면 다시 어긋날 수 있어 안전망을 둔다.
 */
const linkDanglingUtterances = (entries) => {
  const askUtterances = (entry, locale) =>
    (entry.blocks[locale] ?? [])
      .filter((block) => block.type === 'actions')
      .flatMap((block) => block.items)
      .filter((item) => item.kind === 'ask')
      .map((item) => item.utterance);

  for (const locale of ['ko', 'en']) {
    const known = new Set(entries.flatMap((entry) => entry.utterances[locale] ?? []));
    const dangling = [...new Set(entries.flatMap((entry) => askUtterances(entry, locale)))].filter(
      (utterance) => utterance && !known.has(utterance)
    );
    if (!dangling.length) continue;

    console.warn(`⚠️  [${locale}] 인텐트에 없는 발화 ${dangling.length}개를 스텁에 붙입니다: ${dangling.join(', ')}`);

    let stub = entries.find((entry) => entry.id === 'SeedMiscIntent');
    if (!stub) {
      stub = {
        id: 'SeedMiscIntent',
        title: '기타 (시드 자동 생성)',
        kind: 'intent',
        enabled: true,
        showInFaq: false,
        order: entries.length,
        utterances: { ko: [], en: [] },
        blocks: {
          ko: [{ type: 'text', html: '<p>(시드 데이터) 아직 답변이 준비되지 않았습니다.</p>' }],
          en: [{ type: 'text', html: '<p>(seed) No answer prepared yet.</p>' }],
        },
      };
      entries.push(stub);
    }
    stub.utterances[locale] = [...stub.utterances[locale], ...dangling];
  }

  return entries;
};

linkDanglingUtterances(content.entries);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(content, null, 2)}\n`, 'utf8');

/*
 * 시드로 만든 콘텐츠라는 표시.
 *
 * gen-ui-content.mjs가 이걸 보고 src/generated/ui-content.ts를 덮어쓰지 않는다.
 * 그 파일은 git에 커밋되고 그대로 프로덕션에 나가므로, 시드 상태로 빌드했다가
 * 인사말이 "(시드 데이터)"로 바뀐 채 커밋되면 알아채기 어렵다.
 */
fs.writeFileSync(path.join(path.dirname(OUT), '.seeded'), `${new Date().toISOString()}\n`, 'utf8');

console.log(`✅ ${OUT} 생성 (엔트리 ${content.entries.length}개) — 더미 데이터입니다.`);
console.log('   실제 콘텐츠로 바꾸려면: aws s3 cp s3://$CONTENT_BUCKET/content/current.json content/current.json');
