export type RagServiceCitation = {
  position: number;
  sourceType: string;
  documentId?: string | null;
  chunkId?: string | null;
  title?: string | null;
  page?: number | null;
  snippet?: string | null;
  score?: number | null;
};

export type GenerateRagAnswerInput = {
  ragRequestId: number;
  ragConversationId: number;

  pharmacyId: number;

  turnNumber: number;
  isFirstTurn: boolean;

  question: string;

  conversationSummary: string | null;

  recentMessages: Array<{
    role: 'USER' | 'ASSISTANT';
    content: string;
  }>;
};

export type GenerateRagAnswerOutput = {
  answer: string;

  /**
   * يعاد فقط عند أول Turn.
   */
  conversationTitle: string | null;

  citations: RagServiceCitation[];
};