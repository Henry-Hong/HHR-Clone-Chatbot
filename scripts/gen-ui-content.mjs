#!/usr/bin/env node
/**
 * content/current.json 의 system 엔트리를 프론트 번들에 주입한다.
 *
 *   node scripts/gen-ui-content.mjs
 *   -> src/generated/ui-content.ts  (gitignore 대상)
 *
 * 최초 인사 / 홈 버튼 / fallback 문구는 API 응답이 아니라 첫 페인트에 바로
 * 보여야 하므로 빌드 타임에 박아 넣는다. 그래도 원본은 여전히 content 하나뿐이다.
 *
 * content 파일이 없으면 S3에서 받아오라고 안내하고 실패한다.
 */

import fs from 'node:fs';
import path from 'node:path';

const IN = process.env.CONTENT_FILE ?? 'content/current.json';
const OUT = 'src/generated/ui-content.ts';

const SYSTEM_IDS = ['__initial', '__home', '__fallback'];

if (!fs.existsSync(IN)) {
  console.error(`
❌ ${IN} 이(가) 없습니다.

   S3에서 먼저 받아오세요:
     aws s3 cp s3://$CONTENT_BUCKET/content/current.json ${IN}
`);
  process.exit(1);
}

const content = JSON.parse(fs.readFileSync(IN, 'utf8'));

const pick = (id) => {
  const entry = content.entries.find((item) => item.id === id);
  if (!entry) {
    console.error(`❌ system 엔트리 ${id}를 찾을 수 없습니다.`);
    process.exit(1);
  }
  return entry.blocks;
};

const ui = Object.fromEntries(SYSTEM_IDS.map((id) => [id.replace(/^__/, ''), pick(id)]));

const banner = `/* eslint-disable */
/**
 * 이 파일은 scripts/gen-ui-content.mjs가 생성합니다. 직접 수정하지 마세요.
 * 원본: content/current.json (S3: content/current.json)
 * 생성: ${new Date().toISOString()}
 */
import type { Block, Locale } from '@/types/content';

type LocalizedBlocks = Record<Locale, Block[]>;

`;

const body = `export const UI_CONTENT: {
  initial: LocalizedBlocks;
  home: LocalizedBlocks;
  fallback: LocalizedBlocks;
} = ${JSON.stringify(ui, null, 2)} as const;
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, banner + body, 'utf8');

const counts = Object.entries(ui)
  .map(([key, value]) => `${key}=${value.ko?.length ?? 0}`)
  .join(' ');
console.log(`✅ ${OUT} 생성 (ko 블록: ${counts})`);
