export type TypeImageResponseCardButton = {
  text: string;
  value: string;
};

export type TypeImageResponseCard = {
  title?: string;
  subtitle?: string;
  buttons?: TypeImageResponseCardButton[];
};

export type TypeImageResponseCardMessage = {
  imageResponseCard: TypeImageResponseCard;
  contentType: 'ImageResponseCard';
};

export type TypePlainTextMessage = {
  content: string;
  contentType: 'PlainText';
};

export type TypeChatSource = 'user' | 'me';

export type TypeRequestChat = {
  message: string;
};

export type TypeResponseChat = {
  messages: (TypeImageResponseCardMessage | TypePlainTextMessage)[];
  metadatas?: { confidence: number };
};

export type TypeChat = {
  type: TypeChatSource;
  chat: TypeRequestChat | TypeResponseChat;
};

export type TypeAddChat = (chat: TypeChat) => void;
