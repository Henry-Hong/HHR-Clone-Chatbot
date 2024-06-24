import { TypeChat } from './components/customs/Main/Chat/types';

export const INITIAL_CHAT: TypeChat<'me'> = {
  type: 'me',
  chat: {
    messages: [
      {
        contentType: 'PlainText',
        content: '<p>안녕하세요! <mark>FrontEnd Engineer 홍희림</mark>입니다.</p>',
      },
      {
        contentType: 'PlainText',
        content: '아래의 키워드를 눌러주세요!',
      },
      {
        contentType: 'ImageResponseCard',
        imageResponseCard: {
          buttons: [
            { value: '자기소개', text: '자기소개' },
            { value: '이력서', text: '이력서' },
            { value: '포트폴리오', text: '포트폴리오' },
          ],
        },
      },
      {
        contentType: 'ImageResponseCard',
        imageResponseCard: {
          buttons: [{ value: '시스템 구조', text: '어떻게 만들었어?' }],
        },
      },
    ],
  },
};

export const HOMEBUTTON_CHAT: TypeChat<'me'> = {
  type: 'me',
  chat: {
    messages: [
      {
        contentType: 'PlainText',
        content: '<p>자주 물어보는 질문들이에요.</p>',
      },
      {
        contentType: 'ImageResponseCard',
        imageResponseCard: {
          buttons: [
            { value: '자기소개', text: '자기소개' },
            { value: '이력서', text: '이력서' },
            { value: '포트폴리오', text: '포트폴리오' },
            { value: '시스템 구조', text: '아키텍처' },
          ],
        },
      },
    ],
  },
};
