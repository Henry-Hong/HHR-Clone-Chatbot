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
      utterances: { ko: ['자기소개', '너 누구야', '소개해줘'], en: ['who are you', 'introduce yourself'] },
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
      id: 'SystemArchitectureIntent',
      title: '시스템 구조',
      kind: 'intent',
      enabled: true,
      showInFaq: false,
      order: 6,
      utterances: { ko: ['시스템 구조', '어떻게 만들었어'], en: ['how did you build this'] },
      blocks: {
        ko: [{ type: 'text', html: '<p>(시드 데이터) S3 + Lex + Lambda로 만들었습니다.</p>' }],
        en: [],
      },
    },
  ],
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
console.log(`✅ ${OUT} 생성 (엔트리 ${content.entries.length}개) — 더미 데이터입니다.`);
