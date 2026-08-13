// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';

// import { RagServiceClient } from './rag-service-client.js';

// import {
//   GenerateRagAnswerInput,
//   GenerateRagAnswerOutput,
// } from './rag-service-client.types.js';

// import { RagServiceClientError } from './rag-service-client.error.js';

// type PythonRagResponse = {
//   answer?: unknown;
//   conversationTitle?: unknown;
//   citations?: unknown;
// };

// @Injectable()
// export class HttpRagServiceClient implements RagServiceClient {
//   private readonly logger = new Logger(
//     HttpRagServiceClient.name,
//   );

//   constructor(
//     private readonly configService: ConfigService,
//   ) {}

//   async generateAnswer(
//     input: GenerateRagAnswerInput,
//   ): Promise<GenerateRagAnswerOutput> {
//     const baseUrl = this.getRequiredConfig(
//       'RAG_SERVICE_BASE_URL',
//     );

//     const path =
//       this.configService.get<string>(
//         'RAG_SERVICE_ANSWER_PATH',
//       ) ?? '/api/v1/chat/answer';

//     const apiKey = this.getRequiredConfig(
//       'RAG_SERVICE_API_KEY',
//     );

//     const timeoutMs = this.resolveTimeoutMs();

//     const url = new URL(path, baseUrl).toString();

//     const abortController = new AbortController();

//     const timeout = setTimeout(() => {
//       abortController.abort();
//     }, timeoutMs);

//     try {
//       const response = await fetch(url, {
//         method: 'POST',

//         headers: {
//           'Content-Type': 'application/json',
//           Accept: 'application/json',
//           'X-RAG-API-Key': apiKey,
//         },

//         body: JSON.stringify(input),

//         signal: abortController.signal,
//       });

//       const responseBody =
//         await this.readResponseBody(response);

//       if (!response.ok) {
//         throw this.createHttpError(
//           response.status,
//           responseBody,
//         );
//       }

//       return this.mapResponse(responseBody);
//     } catch (error: unknown) {
//       if (error instanceof RagServiceClientError) {
//         throw error;
//       }

//       if (
//         error instanceof Error &&
//         error.name === 'AbortError'
//       ) {
//         throw new RagServiceClientError(
//           'RAG_SERVICE_TIMEOUT',
//           `RAG Service did not respond within ${timeoutMs} ms.`,
//           {
//             cause: error,
//           },
//         );
//       }

//       throw new RagServiceClientError(
//         'RAG_SERVICE_UNAVAILABLE',
//         'Could not connect to RAG Service.',
//         {
//           cause: error,
//         },
//       );
//     } finally {
//       clearTimeout(timeout);
//     }
//   }

//   private async readResponseBody(
//     response: Response,
//   ): Promise<unknown> {
//     const contentType =
//       response.headers.get('content-type') ?? '';

//     if (
//       contentType.includes(
//         'application/json',
//       )
//     ) {
//       try {
//         return await response.json();
//       } catch (error: unknown) {
//         throw new RagServiceClientError(
//           'INVALID_RAG_RESPONSE',
//           'RAG Service returned invalid JSON.',
//           {
//             cause: error,
//           },
//         );
//       }
//     }

//     return await response.text();
//   }

//   private mapResponse(
//     body: unknown,
//   ): GenerateRagAnswerOutput {
//     if (
//       typeof body !== 'object' ||
//       body === null
//     ) {
//       throw new RagServiceClientError(
//         'INVALID_RAG_RESPONSE',
//         'RAG Service response must be an object.',
//       );
//     }

//     const response =
//       body as PythonRagResponse;

//     if (
//       typeof response.answer !== 'string'
//     ) {
//       throw new RagServiceClientError(
//         'INVALID_RAG_RESPONSE',
//         'RAG Service response does not contain a valid answer.',
//       );
//     }

//     const conversationTitle =
//       typeof response.conversationTitle ===
//       'string'
//         ? response.conversationTitle
//         : null;

//     const citations = Array.isArray(
//       response.citations,
//     )
//       ? response.citations
//       : [];

//     return {
//       answer: response.answer,
//       conversationTitle,
//       citations:
//         citations as GenerateRagAnswerOutput['citations'],
//     };
//   }

//   private createHttpError(
//     status: number,
//     responseBody: unknown,
//   ): RagServiceClientError {
//     const details = this.stringifySafely(
//       responseBody,
//     );

//     if (
//       status === 401 ||
//       status === 403
//     ) {
//       return new RagServiceClientError(
//         'RAG_SERVICE_UNAUTHORIZED',
//         `RAG Service rejected authentication. HTTP ${status}. ${details}`,
//       );
//     }

//     if (
//       status >= 400 &&
//       status < 500
//     ) {
//       return new RagServiceClientError(
//         'RAG_SERVICE_BAD_REQUEST',
//         `RAG Service rejected the request. HTTP ${status}. ${details}`,
//       );
//     }

//     return new RagServiceClientError(
//       'RAG_SERVICE_UNAVAILABLE',
//       `RAG Service failed. HTTP ${status}. ${details}`,
//     );
//   }

//   private resolveTimeoutMs(): number {
//     const value = Number(
//       this.configService.get<string>(
//         'RAG_SERVICE_TIMEOUT_MS',
//       ) ?? '60000',
//     );

//     if (
//       !Number.isInteger(value) ||
//       value <= 0
//     ) {
//       throw new Error(
//         'RAG_SERVICE_TIMEOUT_MS must be a positive integer.',
//       );
//     }

//     return value;
//   }

//   private getRequiredConfig(
//     key: string,
//   ): string {
//     const value =
//       this.configService
//         .get<string>(key)
//         ?.trim();

//     if (!value) {
//       throw new Error(
//         `${key} environment variable is required.`,
//       );
//     }

//     return value;
//   }

//   private stringifySafely(
//     value: unknown,
//   ): string {
//     if (typeof value === 'string') {
//       return value.slice(0, 1_000);
//     }

//     try {
//       return JSON.stringify(value).slice(
//         0,
//         1_000,
//       );
//     } catch {
//       return 'Unable to serialize response body.';
//     }
//   }
// }


import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RagServiceClient } from './rag-service-client.js';

import {
  GenerateRagAnswerInput,
  GenerateRagAnswerOutput,
  RagServiceCitation,
} from './rag-service-client.types.js';

type RagApiSource = {
  rank?: unknown;
  distance?: unknown;

  source?: unknown;
  documentKind?: unknown;

  excelRow?: unknown;

  tradeName?: unknown;
  genericName?: unknown;
  dosageForm?: unknown;

  pageRef?: unknown;
  content?: unknown;
};

type RagApiResponse = {
  question?: unknown;
  answer?: unknown;

  collection?: unknown;
  embeddingModel?: unknown;
  chatModel?: unknown;

  topK?: unknown;
  retrievedDocuments?: unknown;

  sources?: unknown;
};

@Injectable()
export class HttpRagServiceClient implements RagServiceClient {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  async generateAnswer(
    input: GenerateRagAnswerInput,
  ): Promise<GenerateRagAnswerOutput> {
    const baseUrl = this.getRequiredConfig(
      'RAG_SERVICE_BASE_URL',
    ).replace(/\/+$/, '');

    const configuredPath =
      this.configService
        .get<string>('RAG_SERVICE_ANSWER_PATH')
        ?.trim() || '/rag-test/ask';

    const path = configuredPath.startsWith('/')
      ? configuredPath
      : `/${configuredPath}`;

    const url = `${baseUrl}${path}`;

    const timeoutMs = this.getTimeoutMs();

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',

        /*
         * JSON.stringify + fetch سيرسلان النص العربي
         * بترميز UTF-8.
         */
        'Content-Type':
          'application/json; charset=utf-8',
      };

      /*
       * مطلوب أثناء استخدام ngrok المجاني.
       */
      if (baseUrl.includes('ngrok-free.app')) {
        headers['ngrok-skip-browser-warning'] =
          'true';
      }

      /*
       * اختياري حالياً، إلى أن تضيف الحماية
       * داخل خدمة RAG.
       */
      const apiKey =
        this.configService
          .get<string>('RAG_SERVICE_API_KEY')
          ?.trim();

      if (apiKey) {
        headers['X-RAG-API-Key'] = apiKey;
      }

      const response = await fetch(url, {
        method: 'POST',

        headers,

        /*
         * نرسل كامل العقد.
         *
         * حالياً قد تستخدم خدمة RAG السؤال فقط،
         * لكن هذه الحقول ستكون ضرورية لفهم
         * الأسئلة اللاحقة.
         */
        body: JSON.stringify({
          ragRequestId:
            input.ragRequestId,

          ragConversationId:
            input.ragConversationId,

          pharmacyId:
            input.pharmacyId,

          turnNumber:
            input.turnNumber,

          isFirstTurn:
            input.isFirstTurn,

          question:
            input.question,

          conversationSummary:
            input.conversationSummary,

          recentMessages:
            input.recentMessages,
        }),

        signal: controller.signal,
      });

      const responseBody =
        await this.parseResponse(response);

      if (!response.ok) {
        throw new Error(
          `RAG_SERVICE_HTTP_${response.status}: ${this.stringifySafely(
            responseBody,
          )}`,
        );
      }

      return this.mapResponse(
        responseBody,
        input,
      );
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        throw new Error(
          `RAG_SERVICE_TIMEOUT: RAG Service did not respond within ${timeoutMs} ms.`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseResponse(
    response: Response,
  ): Promise<unknown> {
    const rawBody = await response.text();

    if (!rawBody.trim()) {
      return null;
    }

    try {
      return JSON.parse(rawBody);
    } catch (error: unknown) {
      throw new Error(
        'INVALID_RAG_RESPONSE: RAG Service returned invalid JSON.',
        {
          cause: error,
        },
      );
    }
  }

  private mapResponse(
    body: unknown,
    input: GenerateRagAnswerInput,
  ): GenerateRagAnswerOutput {
    if (
      typeof body !== 'object' ||
      body === null
    ) {
      throw new Error(
        'INVALID_RAG_RESPONSE: Response must be an object.',
      );
    }

    const response = body as RagApiResponse;

    const answer =
      this.toOptionalString(response.answer)
        ?.trim();

    if (!answer) {
      throw new Error(
        'INVALID_RAG_RESPONSE: answer is empty.',
      );
    }

    const sources = Array.isArray(
      response.sources,
    )
      ? response.sources
      : [];

    return {
      answer,

      /*
       * خدمة RAG الحالية لا تعيد عنواناً.
       * لذلك نولد عنواناً احتياطياً من أول سؤال.
       */
      conversationTitle:
        input.isFirstTurn
          ? this.createConversationTitle(
              input.question,
            )
          : null,

      citations: sources
        .filter(
          (
            source,
          ): source is Record<
            string,
            unknown
          > =>
            typeof source === 'object' &&
            source !== null,
        )
        .map((source, index) =>
          this.mapSourceToCitation(
            source as RagApiSource,
            index,
          ),
        ),
    };
  }

  private mapSourceToCitation(
    source: RagApiSource,
    index: number,
  ): RagServiceCitation {
    const sourceFile =
      this.toOptionalString(
        source.source,
      );

    const excelRow =
      this.toPositiveInteger(
        source.excelRow,
      );

    const tradeName =
      this.toOptionalString(
        source.tradeName,
      );

    const genericName =
      this.toOptionalString(
        source.genericName,
      );

    const sourceType =
      this.toOptionalString(
        source.documentKind,
      ) || 'RAG_DOCUMENT';

    const content =
      this.toOptionalString(
        source.content,
      );

    return {
      /*
       * نستخدم index لضمان عدم تكرار position
       * داخل نفس رسالة المساعد.
       */
      position: index + 1,

      sourceType,

      documentId:
        sourceFile ?? null,

      chunkId:
        excelRow !== null
          ? `excel-row-${excelRow}`
          : null,

      title:
        tradeName ??
        genericName ??
        sourceFile ??
        null,

      page:
        this.toPositiveInteger(
          source.pageRef,
        ),

      /*
       * المحتوى المعاد من Python طويل جداً،
       * لذلك نخزن مقتطفاً مناسباً للواجهة.
       */
      snippet:
        content
          ? content.slice(0, 1_500)
          : null,

      /*
       * distance ليست score:
       * في distance القيمة الأقل أفضل،
       * بينما score عادة القيمة الأعلى أفضل.
       *
       * لذلك لا نخزنها كـscore بشكل مضلل.
       */
      score: null,
    };
  }

  private createConversationTitle(
    question: string,
  ): string {
    const normalized = question
      .replace(/\s+/g, ' ')
      .trim();

    const maximumLength = 100;

    if (
      normalized.length <= maximumLength
    ) {
      return normalized;
    }

    return `${normalized
      .slice(0, maximumLength - 3)
      .trimEnd()}...`;
  }

  private getRequiredConfig(
    key: string,
  ): string {
    const value =
      this.configService
        .get<string>(key)
        ?.trim();

    if (!value) {
      throw new Error(
        `${key} environment variable is required.`,
      );
    }

    return value;
  }

  private getTimeoutMs(): number {
    const value = Number(
      this.configService.get<string>(
        'RAG_SERVICE_TIMEOUT_MS',
      ) ?? '60000',
    );

    if (
      !Number.isInteger(value) ||
      value <= 0
    ) {
      throw new Error(
        'RAG_SERVICE_TIMEOUT_MS must be a positive integer.',
      );
    }

    return value;
  }

  private toOptionalString(
    value: unknown,
  ): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
  }

  private toPositiveInteger(
    value: unknown,
  ): number | null {
    if (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value > 0
    ) {
      return value;
    }

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      const parsed = Number(value);

      if (
        Number.isInteger(parsed) &&
        parsed > 0
      ) {
        return parsed;
      }
    }

    return null;
  }

  private stringifySafely(
    value: unknown,
  ): string {
    try {
      return JSON.stringify(value)
        .slice(0, 1_000);
    } catch {
      return String(value).slice(
        0,
        1_000,
      );
    }
  }
}