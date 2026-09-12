#!/usr/bin/env bash
#
# S3 Versioning을 이용한 콘텐츠 롤백. (= git revert 대응)
#
#   bash scripts/rollback-content.sh            # 버전 목록 보기
#   bash scripts/rollback-content.sh <VersionId> # 해당 버전으로 되돌리기
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-2}"
BUCKET="${CONTENT_BUCKET:?CONTENT_BUCKET 환경변수가 필요합니다}"
KEY="${CONTENT_KEY:-content/current.json}"
AWS="aws --region ${REGION}"

if [ $# -eq 0 ]; then
  echo "s3://${BUCKET}/${KEY} 버전 목록 (최신순)"
  echo
  $AWS s3api list-object-versions --bucket "$BUCKET" --prefix "$KEY" \
    --query 'Versions[].{ts:LastModified,latest:IsLatest,size:Size,id:VersionId}' \
    --output table
  echo "되돌리려면: bash scripts/rollback-content.sh <VersionId>"
  exit 0
fi

VERSION_ID="$1"
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

echo "▶ 버전 ${VERSION_ID} 내려받기"
$AWS s3api get-object --bucket "$BUCKET" --key "$KEY" --version-id "$VERSION_ID" "$TMP" >/dev/null

node -e '
const content = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
console.log(`   updatedAt=${content.updatedAt}  엔트리 ${content.entries.length}개`);
' "$TMP"

read -r -p "이 버전을 현재 버전으로 만들까요? [y/N] " answer
[ "$answer" = "y" ] || { echo "취소"; exit 0; }

# 되돌리기도 "새 버전으로 덮어쓰기"로 처리한다 -> 이력이 끊기지 않는다
$AWS s3api put-object --bucket "$BUCKET" --key "$KEY" --body "$TMP" \
  --content-type application/json --cache-control no-cache \
  --query 'VersionId' --output text

echo "🎉 롤백 완료"
