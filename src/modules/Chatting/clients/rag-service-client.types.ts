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
  isFirstTurn: boolean;

  question: string;

  conversationSummary: string | null;
};

export type GenerateRagAnswerOutput = {
  answer: string;

  /**
   * يعاد فقط عند أول Turn.
   */
  conversationTitle: string | null;
  /**
   * الذاكرة الجديدة التي تمثل:
   *
   * previous summary
   * + current question
   * + current answer
   */
  updatedSummary: string;

  citations: RagServiceCitation[];
};
