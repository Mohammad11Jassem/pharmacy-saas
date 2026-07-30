import {
  GenerateRagAnswerInput,
  GenerateRagAnswerOutput,
} from './rag-service-client.types.js';

export abstract class RagServiceClient {
  abstract generateAnswer(
    input: GenerateRagAnswerInput,
  ): Promise<GenerateRagAnswerOutput>;
}