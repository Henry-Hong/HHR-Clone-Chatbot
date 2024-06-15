import { TypeChat, TypeResponseChat } from './components/customs/Main/Chat/types';

export const createReqChatFromMessage = (message: string): TypeChat => {
  return {
    type: 'user',
    chat: { message },
  };
};

export const createMyChatFromResponse = (response: TypeResponseChat): TypeChat => {
  return {
    type: 'me',
    chat: response,
  };
};

export const createMyChayChatFromError = (): TypeChat => {
  return {
    type: 'me',
    chat: {
      messages: [
        {
          contentType: 'PlainText',
          content: '다시 한번 말씀해주세요.',
        },
      ],
    },
  };
};
