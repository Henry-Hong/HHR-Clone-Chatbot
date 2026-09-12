#!/usr/bin/env bash
#
# Lex 봇에 발화(utterance)를 반영한다.
#
#   bash scripts/publish-lex.sh dist-lex/HHR-Bot-import.zip
#
# 주의: 이 스크립트는 **발화가 바뀐 경우에만** 돌리면 된다.
#       답변 본문만 고쳤다면 content/current.json을 S3에 올리는 것으로 끝이다.
#       (bash scripts/publish-content.sh)
#
# 필요 권한: lexv2-models:CreateUploadUrl, StartImport, DescribeImport,
#            BuildBotLocale, DescribeBotLocale
set -euo pipefail

ZIP="${1:-dist-lex/HHR-Bot-import.zip}"
REGION="${AWS_REGION:-ap-northeast-2}"
BOT_ID="${LEX_BOT_ID:?LEX_BOT_ID 환경변수가 필요합니다 (예: QFUOZQHBTO)}"
BOT_NAME="${LEX_BOT_NAME:-HHR-Bot}"
LOCALES="${LEX_LOCALES:-ko_KR en_US}"
AWS="aws --region ${REGION}"

[ -f "$ZIP" ] || { echo "❌ 아카이브를 찾을 수 없습니다: $ZIP"; exit 1; }

echo "▶ 1/4  업로드 URL 발급"
UPLOAD=$($AWS lexv2-models create-upload-url)
UPLOAD_URL=$(echo "$UPLOAD" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).uploadUrl')
IMPORT_ID=$(echo "$UPLOAD" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).importId')
echo "        importId=${IMPORT_ID}"

echo "▶ 2/4  아카이브 업로드"
curl -sS -X PUT --upload-file "$ZIP" "$UPLOAD_URL"

echo "▶ 3/4  import 시작 (기존 인텐트 덮어쓰기)"
$AWS lexv2-models start-import \
  --import-id "$IMPORT_ID" \
  --merge-strategy Overwrite \
  --resource-specification "{
    \"botImportSpecification\": {
      \"botName\": \"${BOT_NAME}\",
      \"roleArn\": \"$($AWS lexv2-models describe-bot --bot-id "$BOT_ID" --query roleArn --output text)\",
      \"dataPrivacy\": { \"childDirected\": false },
      \"idleSessionTTLInSeconds\": 300
    }
  }" >/dev/null

while :; do
  STATUS=$($AWS lexv2-models describe-import --import-id "$IMPORT_ID" --query importStatus --output text)
  case "$STATUS" in
    Completed) echo "        import 완료"; break ;;
    Failed)
      echo "❌ import 실패:"
      $AWS lexv2-models describe-import --import-id "$IMPORT_ID" --query failureReasons
      exit 1 ;;
    *) printf '        %s...\r' "$STATUS"; sleep 3 ;;
  esac
done

echo "▶ 4/4  로케일 빌드"
for LOCALE in $LOCALES; do
  echo "        ${LOCALE} 빌드 시작"
  $AWS lexv2-models build-bot-locale \
    --bot-id "$BOT_ID" --bot-version DRAFT --locale-id "$LOCALE" >/dev/null

  while :; do
    STATUS=$($AWS lexv2-models describe-bot-locale \
      --bot-id "$BOT_ID" --bot-version DRAFT --locale-id "$LOCALE" \
      --query botLocaleStatus --output text)
    case "$STATUS" in
      Built) echo "        ${LOCALE} ✅ 빌드 완료"; break ;;
      Failed|NotBuilt)
        echo "        ${LOCALE} ❌ 빌드 실패"
        $AWS lexv2-models describe-bot-locale \
          --bot-id "$BOT_ID" --bot-version DRAFT --locale-id "$LOCALE" \
          --query failureReasons
        exit 1 ;;
      *) printf '        %s %s...\r' "$LOCALE" "$STATUS"; sleep 5 ;;
    esac
  done
done

echo
echo "🎉 발행 완료. 답변 본문은 Lex가 아니라 S3 content에서 옵니다."
