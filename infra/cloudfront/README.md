# infra/cloudfront/

루트(`/`)로 온 방문자를 브라우저 언어에 맞춰 `/en`으로 보내는 CloudFront Function.

```
/      + Accept-Language 한국어 우선   → 그대로 (한국어 화면)
/      + 그 외                         → 302 /en
/      + Accept-Language 없음          → 그대로  ← 크롤러가 대부분 여기
/en    + 무엇이든                      → 그대로
/?lang=ko                              → 그대로  ← 영어권의 탈출구
```

**이 함수는 레포에서 자동 배포되지 않습니다.** 아래를 한 번 수동으로 해주셔야 합니다.
(앱 배포 워크플로는 S3 + CloudFront 무효화만 합니다)

## 왜 이 방식인가

**캐시를 오염시키지 않습니다.** viewer request 함수는 캐시 조회 *전에* 돌고,
함수가 응답 객체를 돌려주면 CloudFront는 캐시도 오리진도 보지 않고 바로 내보냅니다.
그래서 `Accept-Language`를 캐시 키에 넣을 필요가 없습니다.

같은 URL에 헤더 따라 다른 **본문**을 서빙했다면 달랐습니다. 그때는 캐시 키에 헤더를
넣어야 하고, 안 넣으면 첫 방문자의 언어가 캐시돼 모두에게 나갑니다.
여기서는 본문을 바꾸지 않고 리다이렉트만 하므로 그 문제가 없습니다.

**두 버전이 모두 색인됩니다.** `/en`은 절대 리다이렉트하지 않고, `Accept-Language`가
없으면 그대로 통과시킵니다. 크롤러는 대개 이 헤더를 보내지 않으므로 `/`(한국어)를 보고,
`/en`은 `hreflang` 링크로 따로 찾아갑니다.

## 배포

### 1. 함수 만들기

```bash
aws cloudfront create-function \
  --name hhr-chatbot-locale-redirect \
  --function-config '{"Comment":"루트를 브라우저 언어에 맞춰 /en 으로","Runtime":"cloudfront-js-2.0"}' \
  --function-code fileb://infra/cloudfront/locale-redirect.js
```

`ETag`를 받아둡니다.

### 2. 실제 요청으로 시험해보기

올리기 전에 CloudFront에서 직접 돌려볼 수 있습니다.

```bash
cat > /tmp/event-en.json <<'JSON'
{ "request": { "uri": "/", "method": "GET", "querystring": {},
  "headers": { "accept-language": { "value": "en-US,en;q=0.9" } } } }
JSON

aws cloudfront test-function \
  --name hhr-chatbot-locale-redirect \
  --if-match <1번의 ETag> \
  --stage DEVELOPMENT \
  --event-object fileb:///tmp/event-en.json
```

`statusCode: 302`, `location: /en` 이 나오면 됩니다.
`accept-language`를 `ko-KR,ko;q=0.9`로 바꿔서 통과(리다이렉트 없음)도 확인하세요.

### 3. 배포(publish)

```bash
aws cloudfront publish-function \
  --name hhr-chatbot-locale-redirect \
  --if-match <1번의 ETag>
```

### 4. 배포판(distribution)의 기본 동작에 연결

콘솔: **CloudFront → 해당 배포 → Behaviors → Default (\*) → Edit →
Function associations → Viewer request → CloudFront Functions → 위 함수 선택 → Save**

CLI로 하려면 `get-distribution-config`로 현재 설정을 받아
`DefaultCacheBehavior.FunctionAssociations`에 아래를 넣고 `update-distribution` 합니다.

```json
{
  "Quantity": 1,
  "Items": [{
    "FunctionARN": "arn:aws:cloudfront::<계정ID>:function/hhr-chatbot-locale-redirect",
    "EventType": "viewer-request"
  }]
}
```

### 5. 확인

```bash
# 영어권 → 302 /en
curl -sI -H 'Accept-Language: en-US,en;q=0.9' https://<도메인>/ | head -5

# 한국어권 → 200 (리다이렉트 없음)
curl -sI -H 'Accept-Language: ko-KR,ko;q=0.9' https://<도메인>/ | head -5

# 헤더 없음(크롤러) → 200
curl -sI https://<도메인>/ | head -5

# /en 은 그대로 200
curl -sI -H 'Accept-Language: ko-KR' https://<도메인>/en | head -5
```

## 고칠 때

함수 코드를 바꾸면 `create-function` 대신 `update-function`을 쓰고, 다시
`publish-function` 하면 됩니다. 배포판 연결은 그대로 둬도 됩니다.

```bash
yarn test    # 이 함수의 판정 로직도 함께 돕니다 (16개)
```

테스트는 배포되는 파일을 그대로 읽어서 돌립니다. 복사본을 만들지 않으므로
코드와 테스트가 어긋날 수 없습니다.

## 남겨둔 것

- **앱 안에 언어 링크가 없습니다.** 영어권 방문자가 한국어 화면을 보려면 `/?lang=ko`를
  직접 쳐야 합니다. 눈에 보이는 길을 두고 싶으면 `/en` 화면에 작은 "한국어" 링크를
  넣는 게 가장 간단합니다.
- 쿠키로 선택을 기억하게 하려면 `handler`에서 `request.cookies.lang`을 함께 보면 됩니다.
  지금은 앱에 선택 UI가 없어서 넣지 않았습니다.
