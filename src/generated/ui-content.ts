/**
 * 이 파일은 scripts/gen-ui-content.mjs가 생성합니다. 직접 수정하지 마세요.
 * 원본: content/current.json (S3: content/current.json)
 * 생성: 2026-09-12T09:23:45.096Z
 */
import type { Block, Locale } from '@/types/content';

type LocalizedBlocks = Record<Locale, Block[]>;

export const UI_CONTENT: {
  initial: LocalizedBlocks;
  home: LocalizedBlocks;
  fallback: LocalizedBlocks;
} = {
  "initial": {
    "ko": [
      {
        "type": "text",
        "html": "<p>안녕하세요! <mark>FrontEnd Engineer 홍희림</mark>입니다.</p>"
      },
      {
        "type": "text",
        "html": "아래의 키워드를 눌러주세요!"
      },
      {
        "type": "actions",
        "items": [
          {
            "kind": "ask",
            "label": "자기소개",
            "utterance": "자기소개"
          },
          {
            "kind": "ask",
            "label": "이력서",
            "utterance": "이력서"
          },
          {
            "kind": "ask",
            "label": "포트폴리오",
            "utterance": "포트폴리오"
          }
        ]
      },
      {
        "type": "actions",
        "items": [
          {
            "kind": "ask",
            "label": "어떻게 만들었어?",
            "utterance": "시스템 구조"
          }
        ]
      }
    ],
    "en": []
  },
  "home": {
    "ko": [
      {
        "type": "text",
        "html": "<p>자주 물어보는 질문들이에요.</p>"
      },
      {
        "type": "actions",
        "items": [
          {
            "kind": "ask",
            "label": "자기소개",
            "utterance": "자기소개"
          },
          {
            "kind": "ask",
            "label": "이력서",
            "utterance": "이력서"
          },
          {
            "kind": "ask",
            "label": "포트폴리오",
            "utterance": "포트폴리오"
          },
          {
            "kind": "ask",
            "label": "아키텍처",
            "utterance": "시스템 구조"
          }
        ]
      }
    ],
    "en": []
  },
  "fallback": {
    "ko": [
      {
        "type": "text",
        "html": "다른 질문이 있으신가요?"
      },
      {
        "type": "actions",
        "items": [
          {
            "kind": "ask",
            "label": "자주 묻는 질문 보기",
            "utterance": "자주 묻는 질문 보기"
          }
        ]
      }
    ],
    "en": []
  }
} as const;
