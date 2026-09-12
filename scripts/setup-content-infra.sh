#!/usr/bin/env bash
#
# 콘텐츠 저장소(private S3) 1회 셋업.
#
#   CONTENT_BUCKET=hhr-chatbot-content bash scripts/setup-content-infra.sh
#
# 만드는 것
#   · private 버킷 (퍼블릭 액세스 전면 차단)
#   · Versioning ON            -> 이력/롤백 ("콘텐츠용 git")
#   · 기본 암호화 (SSE-S3)
#   · 90일 지난 이전 버전 정리  -> 비용 방어
#   · Lambda 실행 역할에 붙일 읽기 전용 정책 출력
#
# ⚠️ 웹사이트용 S3 버킷과 반드시 분리할 것. 웹사이트 버킷은 CloudFront로 공개되므로
#    거기에 content를 두면 URL만 알면 답변 전체를 긁어갈 수 있다.
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-2}"
BUCKET="${CONTENT_BUCKET:?CONTENT_BUCKET 환경변수가 필요합니다}"
AWS="aws --region ${REGION}"

echo "▶ 1/5  버킷 생성: ${BUCKET}"
if $AWS s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "        이미 존재합니다. 설정만 갱신합니다."
else
  $AWS s3api create-bucket \
    --bucket "$BUCKET" \
    --create-bucket-configuration "LocationConstraint=${REGION}" >/dev/null
fi

echo "▶ 2/5  퍼블릭 액세스 전면 차단"
$AWS s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "▶ 3/5  Versioning 활성화 (이력/롤백)"
$AWS s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

echo "▶ 4/5  기본 암호화 + 수명주기"
$AWS s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'

$AWS s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "expire-old-versions",
        "Status": "Enabled",
        "Filter": { "Prefix": "" },
        "NoncurrentVersionExpiration": { "NoncurrentDays": 90 },
        "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
      }
    ]
  }'

echo "▶ 5/5  Lambda 실행 역할에 붙일 정책"
cat <<EOF

  ── 아래 정책을 hhr-clone-lex-invoke의 실행 역할에 추가하세요 ──────────────

  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "ReadChatbotContent",
        "Effect": "Allow",
        "Action": ["s3:GetObject"],
        "Resource": "arn:aws:s3:::${BUCKET}/content/*"
      }
    ]
  }

  ── Lambda 환경변수 ──────────────────────────────────────────────────────

    CONTENT_BUCKET = ${BUCKET}
    CONTENT_KEY    = content/current.json
    CONTENT_TTL_MS = 60000
    SESSION_SALT   = <아무 랜덤 문자열>
    LEX_BOT_ID     = QFUOZQHBTO
    LEX_BOT_ALIAS_ID = <운영 별칭 ID>   # TSTALIASID(테스트 별칭) 사용 금지

  ── 로그 보존 기간 (비용 방어) ────────────────────────────────────────────

    aws --region ${REGION} logs put-retention-policy \\
      --log-group-name /aws/lambda/hhr-clone-lex-invoke \\
      --retention-in-days 30

EOF

echo "🎉 셋업 완료. 다음: bash scripts/publish-content.sh"
