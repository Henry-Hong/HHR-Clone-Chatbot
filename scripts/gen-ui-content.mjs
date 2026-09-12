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
 * 이 생성물은 git에 커밋한다.
 * 인사말·버튼 라벨은 사이트를 열면 즉시 보이는 것이라 감출 가치가 없고,
 * 커밋해두면 CI가 S3 접근 권한 없이도 빌드할 수 있다.
 * (이력서·포트폴리오 같은 실제 답변은 여전히 S3에만 있다.)
 *
 * content 파일이 없고 생성물만 있으면(= CI) 그대로 둔다.
 */

import fs from 'node:fs';
import path from 'node:path';

const IN = process.env.CONTENT_FILE ?? 'content/current.json';
const OUT = 'src/generated/ui-content.ts';

const SYSTEM_IDS = ['__initial', '__home', '__fallback'];

if (!fs.existsSync(IN)) {
  if (fs.existsSync(OUT)) {
    console.log(`ℹ️  ${IN} 없음 → 이미 생성된 ${OUT}을 그대로 사용합니다.`);
    console.log(`   최신화하려면: aws s3 cp s3://$CONTENT_BUCKET/content/current.json ${IN}`);
    process.exit(0);
  }
  console.error(`
❌ ${IN} 도 ${OUT} 도 없습니다.

   S3에서 먼저 받아오세요:
     aws s3 cp s3://$CONTENT_BUCKET/content/current.json ${IN}
`);
  process.exit(1);
}

/*
 * 시드(더미) 콘텐츠로 생성물을 덮어쓰지 않는다.
 * OUT은 git에 커밋되고 그대로 프로덕션 첫 화면이 되므로,
 * 시드 상태로 빌드한 결과가 섞여 들어가면 인사말이 "(시드 데이터)"가 된 채 배포된다.
 */
if (fs.existsSync(path.join(path.dirname(IN), '.seeded'))) {
  if (fs.existsSync(OUT)) {
    console.log(`ℹ️  ${IN}은 시드 데이터입니다 → ${OUT}을 그대로 둡니다.`);
    process.exit(0);
  }
  console.warn(`⚠️  시드 데이터로 ${OUT}을 만듭니다. 이 파일은 커밋 대상이니 그대로 커밋하지 마세요.`);
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

const banner = `/**
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
