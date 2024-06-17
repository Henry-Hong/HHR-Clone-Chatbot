import { TypeChat, TypeResponseChat } from '../components/customs/Main/Chat/types';

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

export const createMyChatLoadingMsg = (): TypeChat => {
  return {
    type: 'me',
    chat: {
      messages: [
        {
          contentType: 'PlainText',
          content: '..',
        },
      ],
    },
  };
};

/**
 * TODO: make it Generic
 */
export const waitAtLeast = async (ms: number, promise: Promise<unknown>): Promise<unknown> => {
  const delay = (ms: number = 5000) => new Promise((resolve) => setTimeout(resolve, ms));
  const [result] = await Promise.all([promise, delay(ms)]);
  return result;
};