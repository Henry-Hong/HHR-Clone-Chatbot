#!/usr/bin/env bash
#
# 답변 콘텐츠를 private S3에 올린다. (= 배포)
#
#   bash scripts/publish-content.sh [content/current.json]
#
# 버킷에 Versioning이 켜져 있으므로 저장할 때마다 버전이 쌓인다.
# 즉 이 버킷이 "콘텐츠용 git" 역할을 한다. 롤백은 scripts/rollback-content.sh.
set -euo pipefail

FILE="${1:-content/current.json}"
REGION="${AWS_REGION:-ap-northeast-2}"
BUCKET="${CONTENT_BUCKET:?CONTENT_BUCKET 환경변수가 필요합니다}"
KEY="${CONTENT_KEY:-content/current.json}"

[ -f "$FILE" ] || { echo "❌ 파일 없음: $FILE"; exit 1; }

# 스키마 최소 검증 - 깨진 JSON이 프로덕션에 올라가는 것을 막는다
node -e '
const fs = require("fs");
const content = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (content.schemaVersion !== 1) throw new Error("schemaVersion이 1이 아닙니다");
if (!Array.isArray(content.entries) || !content.entries.length) throw new Error("entries가 비어 있습니다");
const TYPES = new Set(["text", "image", "gallery", "actions"]);
for (const entry of content.entries) {
  for (const [locale, blocks] of Object.entries(entry.blocks ?? {})) {
    for (const [i, block] of (blocks ?? []).entries()) {
      if (!TYPES.has(block.type)) throw new Error(`${entry.id}.${locale}[${i}]: 알 수 없는 block.type "${block.type}"`);
    }
  }
}
const required = ["__initial", "__home", "__fallback"];
for (const id of required) {
  if (!content.entries.some((e) => e.id === id)) throw new Error(`필수 system 엔트리 누락: ${id}`);
}
console.log(`   검증 통과: 엔트리 ${content.entries.length}개`);
' "$FILE"

echo "▶ s3://${BUCKET}/${KEY} 업로드"
aws --region "$REGION" s3api put-object \
  --bucket "$BUCKET" \
  --key "$KEY" \
  --body "$FILE" \
  --content-type application/json \
  --cache-control no-cache \
  --query 'VersionId' --output text

echo "🎉 반영 완료. Lambda 캐시 TTL(기본 60초) 이내에 적용됩니다."
