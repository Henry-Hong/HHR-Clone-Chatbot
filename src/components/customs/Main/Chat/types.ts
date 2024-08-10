export type TypeImageResponseCardButton = {
  text: string;
  value: string;
};

export type TypeImageResponseCard = {
  imageUrl?: string;
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

export type TypeLoadingMessage = {
  contentType: 'LoadingMsg';
};

export type TypeChatSource = 'user' | 'me';

export type TypeRequestChat = {
  message: string;
};

export type TypeResponseChat = {
  errorMessage?: string;
  messages?: (TypeImageResponseCardMessage | TypePlainTextMessage | TypeLoadingMessage)[];
  metadatas?: { confidence: number };
};

export type TypeChat<T extends TypeChatSource> = {
  type: T;
  chat: T extends 'user' ? TypeRequestChat : TypeResponseChat;
};

export type TypeAddChat = (chat: TypeChat<'me' | 'user'>) => void;
