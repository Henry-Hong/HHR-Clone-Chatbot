import { TypeChat } from './components/customs/Main/Chat/types';

export const INITIAL_CHAT: TypeChat = {
  type: 'me',
  chat: {
    messages: [
      {
        contentType: 'PlainText',
        content: '안녕하세요! FrontEnd Engineer 홍희림입니다.',
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
    ],
  },
};
