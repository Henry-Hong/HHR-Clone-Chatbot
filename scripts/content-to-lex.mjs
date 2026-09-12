#!/usr/bin/env node
/**
 * content/current.json -> Lex V2 import 아카이브 생성.
 *
 *   node scripts/content-to-lex.mjs [-i content/current.json] [-o dist-lex]
 *
 * 핵심: Lex에는 **인텐트 이름과 발화만** 넣는다. 답변 본문은 절대 넣지 않는다.
 *       Lex를 "문자열 -> intentName" 분류기로만 쓰고, 답변은 Lambda가
 *       S3 content에서 읽어 조립한다.
 *
 * 결과적으로
 *   - 답변만 고칠 때  : content만 갱신, Lex 손 안 댐 -> 즉시 반영
 *   - 발화가 바뀔 때  : 이 스크립트로 zip 만들어 import + build (2~3분)
 *
 * import 방법 (AWS CLI):
 *   URL=$(aws lexv2-models create-upload-url --query uploadUrl --output text)
 *   curl -X PUT --upload-file dist-lex/HHR-Bot-import.zip "$URL"
 *   # -> importId 로 start-import / describe-import / build-bot-locale
 *   (scripts/publish-lex.sh 참고)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const LEX_LOCALE_ID = { ko: 'ko_KR', en: 'en_US' };

const VOICE = {
  ko_KR: { voiceId: 'Seoyeon', engine: 'standard' },
  en_US: { voiceId: 'Matthew', engine: 'standard' },
};

const NLU_CONFIDENCE_THRESHOLD = 0.4;

/* -------------------------------------------------------------------------- */

const endConversation = () => ({
  sessionAttributes: null,
  intent: null,
  dialogAction: { type: 'EndConversation', slotToElicit: null, suppressNextMessage: null, intentsInScope: null },
});

/**
 * 응답이 비어있는 인텐트.
 * Lex는 매칭만 하고 메시지를 반환하지 않는다 -> Lambda가 content에서 답변을 조립한다.
 */
const buildIntent = (entry, utterances) => ({
  name: entry.id,
  identifier: null,
  displayName: null,
  description: entry.title,
  parentIntentSignature: null,
  sampleUtterances: utterances.map((utterance) => ({ utterance })),
  intentConfirmationSetting: null,
  intentClosingSetting: null,
  initialResponseSetting: {
    conditional: null,
    codeHook: null,
    nextStep: endConversation(),
    initialResponse: null,
  },
  inputContexts: null,
  outputContexts: null,
  kendraConfiguration: null,
  qnAIntentConfiguration: null,
  bedrockAgentIntentConfiguration: null,
  qInConnectIntentConfiguration: null,
  dialogCodeHook: null,
  fulfillmentCodeHook: null,
  slotPriorities: [],
});

/** AMAZON.FallbackIntent - 응답 없이 매칭만 (프론트가 __fallback 콘텐츠를 렌더) */
const buildFallbackIntent = () => ({
  name: 'FallbackIntent',
  identifier: 'FALLBCKINT',
  displayName: null,
  description: null,
  parentIntentSignature: 'AMAZON.FallbackIntent',
  sampleUtterances: null,
  intentConfirmationSetting: null,
  intentClosingSetting: null,
  initialResponseSetting: {
    conditional: null,
    codeHook: null,
    nextStep: endConversation(),
    initialResponse: null,
  },
  inputContexts: null,
  outputContexts: null,
  kendraConfiguration: null,
  qnAIntentConfiguration: null,
  bedrockAgentIntentConfiguration: null,
  qInConnectIntentConfiguration: null,
  dialogCodeHook: null,
  fulfillmentCodeHook: null,
  slotPriorities: [],
});

/* -------------------------------------------------------------------------- */

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value), 'utf8');
};

const main = () => {
  const args = process.argv.slice(2);
  const readArg = (flag, fallback) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : fallback;
  };

  const inPath = readArg('-i', 'content/current.json');
  const outDir = readArg('-o', 'dist-lex');
  const botName = readArg('--bot', 'HHR-Bot');
  const description = readArg('--desc', '제 자기소개를 대신해줄 봇입니다.');

  if (!fs.existsSync(inPath)) {
    console.error(`content 파일을 찾을 수 없습니다: ${inPath}`);
    process.exit(1);
  }

  const content = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const problems = [];
  const summary = [];

  const stageDir = path.join(outDir, 'stage');
  fs.rmSync(stageDir, { recursive: true, force: true });

  writeJson(path.join(stageDir, 'Manifest.json'), {
    metaData: { schemaVersion: '1', fileFormat: 'LexJson', resourceType: 'BOT' },
  });

  writeJson(path.join(stageDir, botName, 'Bot.json'), {
    name: botName,
    version: 'DRAFT',
    description,
    identifier: null,
    errorLogSettings: null,
    dataPrivacy: { childDirected: false },
    idleSessionTTLInSeconds: 300,
  });

  const intentEntries = content.entries
    .filter((entry) => entry.kind === 'intent' && entry.enabled)
    .sort((a, b) => a.order - b.order);

  for (const [locale, lexLocaleId] of Object.entries(LEX_LOCALE_ID)) {
    const localeDir = path.join(stageDir, botName, 'BotLocales', lexLocaleId);

    writeJson(path.join(localeDir, 'BotLocale.json'), {
      name: lexLocaleId === 'ko_KR' ? 'Korean (South Korea)' : 'English (US)',
      identifier: lexLocaleId,
      version: null,
      description: null,
      voiceSettings: VOICE[lexLocaleId],
      nluConfidenceThreshold: NLU_CONFIDENCE_THRESHOLD,
    });

    writeJson(path.join(localeDir, 'Intents', 'FallbackIntent', 'Intent.json'), buildFallbackIntent());

    // 발화 중복 검사 (같은 발화가 두 인텐트에 있으면 Lex build가 실패하거나 오작동한다)
    const seen = new Map();
    let intentCount = 0;
    let utteranceCount = 0;

    for (const entry of intentEntries) {
      const utterances = entry.utterances[locale] ?? [];
      if (!utterances.length) {
        problems.push(`[${lexLocaleId}] ${entry.id}: 발화가 없어 이 로케일에서 제외됩니다.`);
        continue;
      }
      if (!entry.blocks[locale]?.length) {
        problems.push(`[${lexLocaleId}] ${entry.id}: 발화는 있는데 답변(blocks.${locale})이 비어 있습니다.`);
      }

      for (const utterance of utterances) {
        const key = utterance.trim().toLowerCase();
        if (seen.has(key)) {
          problems.push(
            `[${lexLocaleId}] 발화 중복: "${utterance}" (${seen.get(key)} ↔ ${entry.id})`
          );
        } else {
          seen.set(key, entry.id);
        }
      }

      writeJson(path.join(localeDir, 'Intents', entry.id, 'Intent.json'), buildIntent(entry, utterances));
      intentCount += 1;
      utteranceCount += utterances.length;
    }

    summary.push({ lexLocaleId, intentCount, utteranceCount });
  }

  // zip
  const zipPath = path.resolve(outDir, `${botName}-import.zip`);
  fs.rmSync(zipPath, { force: true });
  execFileSync('zip', ['-q', '-r', zipPath, '.'], { cwd: stageDir });

  const bytes = fs.statSync(zipPath).size;

  console.log(`\n✅ ${path.relative(process.cwd(), zipPath)} 생성 완료 (${(bytes / 1024).toFixed(1)} KB)\n`);
  for (const item of summary) {
    console.log(`   ${item.lexLocaleId.padEnd(6)} 인텐트 ${String(item.intentCount).padStart(2)}개 / 발화 ${String(item.utteranceCount).padStart(3)}개`);
  }
  console.log('\n   ℹ️  이 아카이브에는 답변 본문이 들어있지 않습니다 (발화만).');

  if (problems.length) {
    console.log('\n   ⚠️  확인 필요');
    problems.forEach((message) => console.log(`      · ${message}`));
  }

  console.log(`\n   다음 단계: bash scripts/publish-lex.sh ${path.relative(process.cwd(), zipPath)}\n`);
};

main();
