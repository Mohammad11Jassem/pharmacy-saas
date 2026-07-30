import { Injectable } from '@nestjs/common';

import { setTimeout as delay } from 'node:timers/promises';

import { RagServiceClient } from './rag-service-client.js';

import {
  GenerateRagAnswerInput,
  GenerateRagAnswerOutput,
} from './rag-service-client.types.js';

const MOCK_RESPONSE_DELAY_MS = 1_500;

@Injectable()
export class MockRagServiceClient
  implements RagServiceClient
{
  async generateAnswer(
    input: GenerateRagAnswerInput,
  ): Promise<GenerateRagAnswerOutput> {
    /*
     * محاكاة وقت معالجة خدمة Python.
     */
    await delay(MOCK_RESPONSE_DELAY_MS);

    const title = input.isFirstTurn
      ? this.createConversationTitle(
          input.question,
        )
      : null;

    return {
      answer:
        'هذه إجابة تجريبية من Mock RAG Service للسؤال التالي:\n\n' +
        input.question +
        '\n\nسيتم لاحقاً استبدال هذه الإجابة بنتيجة خدمة Python RAG الحقيقية.',

      conversationTitle: title,

      /*
       * نعيد Citation تجريبية حتى نتأكد أن جدول
       * rag_message_citations يعمل أيضاً.
       */
      citations: [
        {
          position: 1,
          sourceType: 'MOCK_DOCUMENT',
          documentId: 'mock-document-1',
          chunkId: 'mock-chunk-1',
          title: 'Mock RAG Source',
          page: 1,
          snippet:
            'This is a temporary mock citation used for backend testing.',
          score: 1,
        },
      ],
    };
  }

  private createConversationTitle(
    question: string,
  ): string {
    const normalized = question
      .replace(/\s+/g, ' ')
      .trim();

    const maximumLength = 100;

    if (normalized.length <= maximumLength) {
      return normalized;
    }

    return `${normalized
      .slice(0, maximumLength - 3)
      .trimEnd()}...`;
  }
}