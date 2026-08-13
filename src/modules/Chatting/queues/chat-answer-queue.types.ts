export type GenerateChatAnswerJobData = {
  /**
   * نرسل المعرّف فقط.
   * الـWorker يقرأ جميع البيانات من PostgreSQL.
   */
  ragRequestId: number;
};

export type GenerateChatAnswerJobResult = {
  ragRequestId: number;

  processedAt: string;

  // mode: 'MOCK';
  mode: 'RAG_SERVICE';

  outcome: 'SUCCEEDED' | 'SKIPPED';

  assistantMessageId: number | null;
};