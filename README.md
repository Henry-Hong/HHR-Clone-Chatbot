# NLU Based 홍희림 클론

<p align="center">
 <img width="300" alt="chatbot-preview" src="https://github.com/user-attachments/assets/95a8b9d0-7401-4f05-819e-6e3f61e27e4f">
</p>

# Introduction

FrontEnd + AWS Services

<br >
<br >

# Timeline

> **24.04.21 ~ ing**

<br >
<br >

# Architecture

<p align="center">
<img width="450" alt="HHR+Chatbot+Architecture" src="https://github.com/user-attachments/assets/5c1b212d-eafb-4700-92cd-637d576160bc">

</p>

# Features

### 1. i18n — 언어 모드가 없다

언어 토글을 두지 않는다. 대신 **질문마다 언어를 판별해서** 그 언어로 답한다.

| | |
|---|---|
| 한글이 섞여 있으면 | 한국어로 답한다 |
| 아니면 | 영어로 답한다 |

토글을 두면 "영어로 켜둔 채 한국어로 묻는" 상태가 생기고, Lex가 엉뚱한 로케일에서
분류해 인텐트를 못 찾는다. 모드를 없애면 그 상태 자체가 생기지 않는다.
한국어 문장은 조사·어미 때문에 거의 항상 한글을 포함하므로 판별이 단순하다.
(`src/utils/locale.ts`)

경로는 **맞이하는 언어**만 정한다. 답변 언어는 위 규칙이 정한다.

| 경로 | 인사말·화면 문구 |
|---|---|
| `/` | 한국어 |
| `/en` | 영어 |

그래서 `/en`으로 들어온 사람이 한국어로 물어도 한국어로 답한다.
경로를 나눠 둔 이유는 공유·북마크와 검색 노출(`hreflang`)이다.

`/en`은 배포할 때 같은 번들을 `en` 키로 한 번 더 올려서 서빙한다.
(`.github/workflows/main.yml`) 링크는 `/en`으로 건다 — `/en/`은 S3에 그런 키가 없어 404다.

루트로 온 방문자를 브라우저 언어에 맞춰 `/en`으로 보내는 CloudFront Function이 있다.
(`infra/cloudfront/`) 리다이렉트를 함수 안에서 만들기 때문에 `Accept-Language`가
캐시 키에 들어가지 않고, `/en`과 헤더 없는 요청은 통과시켜서 두 버전이 모두 색인된다.
레포에서 자동 배포되지 않으므로 한 번 수동으로 올려야 한다 — `infra/cloudfront/README.md`.

### 2. Amazon Lex

발화를 바꾸면 **두 로케일(`ko_KR` `en_US`)을 모두 빌드**해야 한다.
한쪽만 빌드하면 그 언어의 질문은 전부 FallbackIntent로 떨어진다.

### 3. React 19

<br >
<br >

# Content Pipeline

답변 콘텐츠는 Lex가 아니라 **private S3**가 Source of Truth입니다.
Lex는 `문자열 -> intentName` 분류기로만 씁니다.

```
  git (public repo)                    S3 (private, versioning on)
  ├─ 프론트/Lambda 코드                 ├─ content/current.json   ← SoT
  ├─ src/types/content.ts  (스키마)     └─ assets/*.png
  └─ scripts/*             (변환)
                                         ▲ IAM으로 Lambda만 읽기

  [사용자] -> API GW -> Lambda ─┬─ Lex RecognizeText  (intentName만)
                               └─ S3 content         (답변 Block[])
                                  └─ CloudWatch Logs (구조화 대화 로그)
```

**답변만 고칠 때는 Lex를 건드리지 않습니다.** 발화(utterance)가 바뀔 때만 Lex에 발행합니다.

| 작업 | 명령 | 반영 시간 |
| :-- | :-- | :-- |
| 답변 수정 | `yarn content:publish` | 즉시 (캐시 TTL 60초) |
| 발화 추가/수정 | `yarn lex:publish` | 2~3분 (import + build) |
| 롤백 | `yarn content:rollback` | 즉시 |
| 최초 마이그레이션 | `yarn content:import <lex-export-dir>` | - |

자세한 내용은 [`content/README.md`](./content/README.md) 참고.

### 응답 포맷 (Block)

```ts
type Block =
  | { type: 'text';    html: string; variations?: string[] }
  | { type: 'image';   src: string; alt?: string; caption?: string }
  | { type: 'gallery'; images: { src: string; alt?: string }[] }
  | { type: 'actions'; items: Action[] };

type Action =
  | { kind: 'ask';  label: string; utterance: string }   // 재질문
  | { kind: 'link'; label: string; url: string };        // 외부 링크
```

기존 Lex 메시지의 암묵적 컨벤션(`title: "-"` 플레이스홀더, `@라벨` 링크 prefix,
`customPayload`의 비정형 JSON)을 전부 명시적 타입으로 대체했습니다.

<br >
<br >

# Teams

| <img src="https://avatars.githubusercontent.com/u/17701725?v=4,Henry-Hong,heerim,https://github.com/Henry-Hong" width="150" height="150"/> | <img src="https://avatars.githubusercontent.com/u/17701725?v=4,Henry-Hong,heerim,https://github.com/Henry-Hong" width="150" height="150"/> |
| :-: | :-: |
| FrontEnd: heerim<br/>[@Henry-Hong](https://github.com/Henry-Hong) | Cloud Related: heerim<br/>[@Henry-Hong](https://github.com/Henry-Hong) |

<br>
<br>

# Techs

<div align="middle">
 
### FrontEnd

<img src="https://img.shields.io/badge/react-61DAFB?style=for-the-badge&amp;logo=react&amp;logoColor=white"/>
<img src="https://img.shields.io/badge/typescript-%23007ACC?style=for-the-badge&amp;logo=typescript&amp;logoColor=white"/>
<img src="https://img.shields.io/badge/tailwindcss-%2306B6D4?style=for-the-badge&amp;logo=tailwindcss&amp;logoColor=white"/>
<img src="https://img.shields.io/badge/react--query-%23FF4154?style=for-the-badge&amp;logo=reactquery&amp;logoColor=white"/>

### DevOps & Cloud

<p>
<img src="https://img.shields.io/badge/Github--Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white">
</p>
<p>
<img src="https://img.shields.io/badge/amazons3-569A31?style=for-the-badge&logo=amazons3&logoColor=white">
<img src="https://img.shields.io/badge/cloudfront-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white">
<img src="https://img.shields.io/badge/api--gateway-%23FF4F8B?style=for-the-badge&logo=amazonapigateway&logoColor=white">
<img src="https://img.shields.io/badge/lambda-FF9900?style=for-the-badge&logo=awslambda&logoColor=white">
<img src="https://img.shields.io/badge/amazon--lex-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white">
</p>

<br/>
<br/>
