export type ChatCitationEvent = {
  ragMessageCitationId: number;
  position: number;
  sourceType: string;

  documentId: string | null;
  chunkId: string | null;
  title: string | null;
  page: number | null;
  snippet: string | null;
  score: number | null;
};

export type ChatRequestSucceededEvent = {
  ragRequestId: number;
  ragConversationId: number;
  turnNumber: number;

  status: 'SUCCEEDED';

  conversationTitle: string;

  finishedAt: Date;
  latencyMs: number | null;

  assistantMessage: {
    ragMessageId: number;
    role: 'ASSISTANT';
    content: string;
    createdAt: Date;

    citations: ChatCitationEvent[];
  };
};

export type ChatRequestFailedEvent = {
  ragRequestId: number;
  ragConversationId: number;
  turnNumber: number;

  status: 'FAILED';

  failureCode: string;
  finishedAt: Date;
};