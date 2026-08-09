export type RagServiceFailureCode =
  | 'RAG_SERVICE_TIMEOUT'
  | 'RAG_SERVICE_UNAVAILABLE'
  | 'RAG_SERVICE_UNAUTHORIZED'
  | 'RAG_SERVICE_BAD_REQUEST'
  | 'INVALID_RAG_RESPONSE';

export class RagServiceClientError extends Error {
  constructor(
    public readonly code: RagServiceFailureCode,
    message: string,
    options?: {
      cause?: unknown;
    },
  ) {
    super(message, options);

    this.name = RagServiceClientError.name;
  }
}