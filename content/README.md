# content/

> ⚠️ **이 디렉터리의 `*.json`은 git에 커밋하지 않습니다.**

챗봇 답변의 Source of Truth는 **private S3 버킷**입니다.

```
s3://hhr-chatbot-content/
  content/current.json     ← SoT (Versioning ON = 이력/롤백)
  assets/*.png             ← 이미지
```

## 왜 git이 아니라 S3인가

이 레포는 **public**입니다. 답변 본문을 커밋하면 챗봇에 물어보기 전에
GitHub에서 전부 읽을 수 있게 됩니다.

그렇다고 git을 쓰고 싶었던 이유(버전 관리 / 이력 / 롤백)를 포기할 필요는 없습니다.
**S3 Versioning이 그 역할을 그대로 합니다.**

| | git | S3 + Versioning |
|---|---|---|
| 이력 | commit log | 버전 목록 |
| 롤백 | `git revert` | `rollback-content.sh` |
| diff | `git diff` | 두 버전 받아서 diff |
| 공개 여부 | public repo면 전부 노출 | IAM으로 Lambda만 |

따라서 역할을 이렇게 나눕니다.

```
git (public)  : 코드 + 스키마 + 변환 스크립트     ← 포트폴리오로 보여줄 것
S3  (private) : 답변 본문 + 이미지                ← 챗봇으로만 접근
```

## 로컬 작업 흐름

```bash
# 1) S3에서 최신 콘텐츠 받기
aws s3 cp s3://$CONTENT_BUCKET/content/current.json content/current.json

# 2) 편집 (또는 어드민 UI에서)

# 3) 검증 + 업로드
bash scripts/publish-content.sh
```

발화(utterance)를 바꿨다면 Lex에도 반영해야 합니다.

```bash
node scripts/content-to-lex.mjs        # 발화만 담은 import zip 생성
bash scripts/publish-lex.sh            # import + build (2~3분)
```

**답변 본문만 고쳤다면 Lex는 건드리지 않습니다.** `publish-content.sh`만 돌리면 끝이고,
Lambda 캐시 TTL(기본 60초) 안에 반영됩니다.

## 최초 마이그레이션

기존 Lex 봇에 흩어져 있던 답변을 끌어옵니다.

```bash
# Lex 콘솔 > 봇 > 작업 > 내보내기 (Lex / Json / 비밀번호 없음)
unzip HHR-Bot-DRAFT-*.zip -d .lex-export
node scripts/lex-to-content.mjs .lex-export/HHR-Bot
```
