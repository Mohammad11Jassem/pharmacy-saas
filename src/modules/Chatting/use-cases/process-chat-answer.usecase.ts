import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import {
  RagMessageRole,
  RagRequestStatus,
} from '../../../generated/prisma/enums.js';

import { PrismaService } from '../../../prisma/prisma.service.js';

import { RagServiceClient } from '../clients/rag-service-client.js';

import {
  GenerateRagAnswerOutput,
} from '../clients/rag-service-client.types.js';

import {
  RagSubscriptionPolicyService,
} from '../services/rag-subscription-policy.service.js';

const DEFAULT_CONVERSATION_TITLE =
  'New conversation';

export type ProcessChatAnswerResult = {
  ragRequestId: number;

  outcome: 'SUCCEEDED' | 'SKIPPED';

  assistantMessageId: number | null;
};

@Injectable()
export class ProcessChatAnswerUseCase {
  private readonly logger = new Logger(
    ProcessChatAnswerUseCase.name,
  );

  constructor(
    private readonly prisma: PrismaService,

    private readonly ragServiceClient:
      RagServiceClient,

    private readonly ragSubscriptionPolicyService:
      RagSubscriptionPolicyService,
  ) {}

  async execute(
    ragRequestId: number,
  ): Promise<ProcessChatAnswerResult> {
    const request =
      await this.prisma.ragRequest.findUnique({
        where: {
          ragRequestId,
        },

        select: {
          ragRequestId: true,
          ragConversationId: true,
          pharmacySubscriptionId: true,

          turnNumber: true,
          status: true,

          startedAt: true,
          leaseExpiresAt: true,

          conversation: {
            select: {
              pharmacyId: true,
              title: true,

              memory: {
                select: {
                  summaryText: true,
                },
              },
            },
          },

          pharmacySubscription: {
            select: {
              startsAt: true,
              endsAt: true,
            },
          },

          messages: {
            where: {
              role: RagMessageRole.USER,
            },

            take: 1,

            select: {
              content: true,
            },
          },
        },
      });

    if (!request) {
      throw new NotFoundException(
        `RagRequest ${ragRequestId} was not found.`,
      );
    }

    /*
     * حماية Idempotency.
     *
     * في حال وصلت Job مكررة بعد نجاح الطلب،
     * لا نستدعي RAG مرة أخرى.
     */
    if (
      request.status !==
      RagRequestStatus.PROCESSING
    ) {
      this.logger.warn(
        `Skipping RagRequest ${ragRequestId} because its status is ${request.status}.`,
      );

      return {
        ragRequestId,
        outcome: 'SKIPPED',
        assistantMessageId: null,
      };
    }

    const userMessage =
      request.messages[0];

    if (!userMessage) {
      throw new Error(
        `RagRequest ${ragRequestId} does not contain a USER message.`,
      );
    }

    const ragResponse =
      await this.ragServiceClient.generateAnswer({
        ragRequestId:
          request.ragRequestId,

        ragConversationId:
          request.ragConversationId,

        pharmacyId:
          request.conversation.pharmacyId,

        turnNumber:
          request.turnNumber,

        isFirstTurn:
          request.turnNumber === 1,

        question:
          userMessage.content,

        conversationSummary:
          request.conversation.memory
            ?.summaryText ?? null,

        /*
         * سنملؤها من تاريخ المحادثة لاحقاً.
         */
        recentMessages: [],
      });

    const normalizedResponse =
      this.validateAndNormalizeResponse(
        ragResponse,
        request.turnNumber,
      );

    const finishedAt = new Date();

    const usagePeriod =
      this.ragSubscriptionPolicyService
        .resolveCurrentMonthlyUsagePeriod(
          request.pharmacySubscription
            .startsAt,

          request.pharmacySubscription
            .endsAt,

          request.startedAt,
        );

    const usageDate =
      this.toUtcDateOnly(
        request.startedAt,
      );

    const latencyMs = Math.max(
      0,
      finishedAt.getTime() -
        request.startedAt.getTime(),
    );

    return this.prisma.$transaction(
      async (tx): Promise<ProcessChatAnswerResult> => {
        /*
         * نقفل الطلب حتى لا يستطيع Worker آخر
         * حفظ إجابة ثانية للطلب نفسه.
         */
        await tx.$queryRaw`
          SELECT rag_request_id
          FROM rag_requests
          WHERE rag_request_id = ${ragRequestId}
          FOR UPDATE
        `;

        const lockedRequest =
          await tx.ragRequest.findUnique({
            where: {
              ragRequestId,
            },

            select: {
              status: true,
              turnNumber: true,
              ragConversationId: true,
            },
          });

        if (!lockedRequest) {
          throw new NotFoundException(
            `RagRequest ${ragRequestId} was not found while finalizing.`,
          );
        }

        /*
         * قد يكون Worker آخر أكمل الطلب أثناء
         * استدعاء خدمة RAG.
         */
        if (
          lockedRequest.status !==
          RagRequestStatus.PROCESSING
        ) {
          return {
            ragRequestId,
            outcome: 'SKIPPED',
            assistantMessageId: null,
          };
        }

        const assistantMessage =
          await tx.ragMessage.create({
            data: {
              ragRequestId,

              role:
                RagMessageRole.ASSISTANT,

              content:
                normalizedResponse.answer,

              citations:
                normalizedResponse
                  .citations.length > 0
                  ? {
                      create:
                        normalizedResponse
                          .citations.map(
                            (citation) => ({
                              position:
                                citation.position,

                              sourceType:
                                citation.sourceType,

                              documentId:
                                citation.documentId,

                              chunkId:
                                citation.chunkId,

                              title:
                                citation.title,

                              page:
                                citation.page,

                              snippet:
                                citation.snippet,

                              score:
                                citation.score,
                            }),
                          ),
                    }
                  : undefined,
            },

            select: {
              ragMessageId: true,
            },
          });

        await tx.ragRequest.update({
          where: {
            ragRequestId,
          },

          data: {
            status:
              RagRequestStatus.SUCCEEDED,

            finishedAt,

            failureCode: null,

            latencyMs,
          },
        });

        /*
         * يتم تعيين عنوان Python فقط لأول Turn،
         * وفقط إذا كان العنوان ما زال Default.
         *
         * هذا يمنع الكتابة فوق عنوان عدله المستخدم.
         */
        if (
          lockedRequest.turnNumber === 1 &&
          normalizedResponse
            .conversationTitle
        ) {
          await tx.ragConversation.updateMany({
            where: {
              ragConversationId:
                lockedRequest
                  .ragConversationId,

              title:
                DEFAULT_CONVERSATION_TITLE,
            },

            data: {
              title:
                normalizedResponse
                  .conversationTitle,
            },
          });
        }

        await tx.ragConversation.update({
          where: {
            ragConversationId:
              lockedRequest
                .ragConversationId,
          },

          data: {
            lastMessageAt:
              finishedAt,
          },
        });

        /*
         * تحديث جدول الاستخدام التجميعي.
         *
         * RagRequest يبقى المصدر الأساسي للحقيقة.
         */
        await tx.ragUsageDaily.upsert({
          where: {
            pharmacySubscriptionId_usageDate_usagePeriodStart:
              {
                pharmacySubscriptionId:
                  request
                    .pharmacySubscriptionId,

                usageDate,

                usagePeriodStart:
                  usagePeriod.start,
              },
          },

          create: {
            pharmacySubscriptionId:
              request
                .pharmacySubscriptionId,

            usageDate,

            usagePeriodStart:
              usagePeriod.start,

            usagePeriodEnd:
              usagePeriod.end,

            successfulRequests: 1,
          },

          update: {
            usagePeriodEnd:
              usagePeriod.end,

            successfulRequests: {
              increment: 1,
            },
          },
        });

        return {
          ragRequestId,
          outcome: 'SUCCEEDED',

          assistantMessageId:
            assistantMessage
              .ragMessageId,
        };
      },
      {
        timeout: 10_000,
      },
    );
  }

  /**
   * يستدعى فقط بعد انتهاء جميع محاولات BullMQ.
   */
  async markFailedAfterFinalAttempt(
    ragRequestId: number,
    failureCode: string,
  ): Promise<void> {
    const finishedAt = new Date();

    await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT rag_request_id
          FROM rag_requests
          WHERE rag_request_id = ${ragRequestId}
          FOR UPDATE
        `;

        const request =
          await tx.ragRequest.findUnique({
            where: {
              ragRequestId,
            },

            select: {
              status: true,
              turnNumber: true,

              startedAt: true,

              ragConversationId: true,

              pharmacySubscriptionId:
                true,

              pharmacySubscription: {
                select: {
                  startsAt: true,
                  endsAt: true,
                },
              },

              messages: {
                where: {
                  role:
                    RagMessageRole.USER,
                },

                take: 1,

                select: {
                  content: true,
                },
              },
            },
          });

        if (!request) {
          this.logger.error(
            `Cannot mark RagRequest ${ragRequestId} as FAILED because it does not exist.`,
          );

          return;
        }

        /*
         * لا نكتب فوق SUCCEEDED أو FAILED سابقاً.
         */
        if (
          request.status !==
          RagRequestStatus.PROCESSING
        ) {
          return;
        }

        const normalizedFailureCode =
          failureCode
            .trim()
            .slice(0, 100) ||
          'RAG_PROCESSING_FAILED';

        const latencyMs = Math.max(
          0,
          finishedAt.getTime() -
            request.startedAt.getTime(),
        );

        const usagePeriod =
          this.ragSubscriptionPolicyService
            .resolveCurrentMonthlyUsagePeriod(
              request
                .pharmacySubscription
                .startsAt,

              request
                .pharmacySubscription
                .endsAt,

              request.startedAt,
            );

        const usageDate =
          this.toUtcDateOnly(
            request.startedAt,
          );

        await tx.ragRequest.update({
          where: {
            ragRequestId,
          },

          data: {
            status:
              RagRequestStatus.FAILED,

            finishedAt,

            failureCode:
              normalizedFailureCode,

            latencyMs,
          },
        });

        /*
         * عند فشل أول سؤال نهائياً نستخدم السؤال
         * نفسه عنواناً احتياطياً.
         */
        if (request.turnNumber === 1) {
          const userMessage =
            request.messages[0];

          if (userMessage) {
            await tx.ragConversation
              .updateMany({
                where: {
                  ragConversationId:
                    request
                      .ragConversationId,

                  title:
                    DEFAULT_CONVERSATION_TITLE,
                },

                data: {
                  title:
                    this.createFallbackTitle(
                      userMessage.content,
                    ),
                },
              });
          }
        }

        await tx.ragUsageDaily.upsert({
          where: {
            pharmacySubscriptionId_usageDate_usagePeriodStart:
              {
                pharmacySubscriptionId:
                  request
                    .pharmacySubscriptionId,

                usageDate,

                usagePeriodStart:
                  usagePeriod.start,
              },
          },

          create: {
            pharmacySubscriptionId:
              request
                .pharmacySubscriptionId,

            usageDate,

            usagePeriodStart:
              usagePeriod.start,

            usagePeriodEnd:
              usagePeriod.end,

            failedRequests: 1,
          },

          update: {
            usagePeriodEnd:
              usagePeriod.end,

            failedRequests: {
              increment: 1,
            },
          },
        });
      },
      {
        timeout: 10_000,
      },
    );
  }

  private validateAndNormalizeResponse(
    response: GenerateRagAnswerOutput,
    turnNumber: number,
  ): GenerateRagAnswerOutput {
    const answer =
      response.answer?.trim();

    if (!answer) {
      throw new Error(
        'INVALID_RAG_RESPONSE: answer is empty.',
      );
    }

    const conversationTitle =
      turnNumber === 1
        ? this.normalizeTitle(
            response.conversationTitle,
          )
        : null;

    const citations =
      Array.isArray(response.citations)
        ? response.citations.map(
            (citation, index) => ({
              ...citation,

              position:
                Number.isInteger(
                  citation.position,
                ) &&
                citation.position > 0
                  ? citation.position
                  : index + 1,

              sourceType:
                citation.sourceType
                  ?.trim()
                  .slice(0, 50) ||
                'UNKNOWN',

              documentId:
                citation.documentId
                  ?.trim()
                  .slice(0, 255) ??
                null,

              chunkId:
                citation.chunkId
                  ?.trim()
                  .slice(0, 255) ??
                null,

              title:
                citation.title
                  ?.trim()
                  .slice(0, 255) ??
                null,

              snippet:
                citation.snippet
                  ?.trim() ??
                null,
            }),
          )
        : [];

    return {
      answer,

      conversationTitle,

      citations,
    };
  }

  private normalizeTitle(
    title: string | null,
  ): string | null {
    if (!title) {
      return null;
    }

    const normalized =
      title
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150);

    return normalized || null;
  }

  private createFallbackTitle(
    question: string,
  ): string {
    const normalized = question
      .replace(/\s+/g, ' ')
      .trim();

    if (normalized.length <= 100) {
      return normalized;
    }

    return `${normalized
      .slice(0, 97)
      .trimEnd()}...`;
  }

  /**
   * يحول DateTime إلى قيمة مناسبة لحقل PostgreSQL DATE.
   */
  private toUtcDateOnly(
    value: Date,
  ): Date {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
      ),
    );
  }
}