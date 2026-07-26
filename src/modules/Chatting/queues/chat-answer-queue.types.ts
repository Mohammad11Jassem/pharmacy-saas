export type GenerateChatAnswerJobData = {
  /**
   * The database request that the worker must process.
   *
   * We intentionally send only the ID through Redis.
   * The worker will read the rest from PostgreSQL.
   */
  ragRequestId: number;
};

export type GenerateChatAnswerJobResult = {
  ragRequestId: number;
  processedAt: string;
  mode: 'MOCK';
};