import { ConflictException, Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client.js';

import {
  RagMessageRole,
  RagRequestStatus,
} from '../../../generated/prisma/enums.js';

import { PrismaService } from '../../../prisma/prisma.service.js';

import { StartChatConversationDto } from '../dto/start-chat-conversation.dto.js';

import { RagSubscriptionPolicyService } from '../services/rag-subscription-policy.service.js';

import { RagUsageService } from '../services/rag-usage.service.js';

import { StartChatConversationResponse } from '../types/start-chat-conversation-response.type.js';

import {
  CHAT_ANSWER_REQUESTED_EVENT,
  RAG_REQUEST_AGGREGATE_TYPE,
} from '../outbox/chat-outbox.constants.js';

const RAG_REQUEST_LEASE_DURATION_MS = 5 * 60 * 1_000;

@Injectable()
export class StartChatConversationUseCase {
  constructor(
    private readonly prisma: PrismaService,

    private readonly ragSubscriptionPolicyService: RagSubscriptionPolicyService,

    private readonly ragUsageService: RagUsageService,
  ) {}

  async execute(
    pharmacyId: number,
    dto: StartChatConversationDto,
  ): Promise<StartChatConversationResponse> {
    /*
     * نفحص Idempotency قبل فحص الاشتراك.
     *
     * إذا كان الطلب نفسه موجوداً مسبقاً،
     * يجب إعادة نتيجته حتى لو تغير الاشتراك لاحقاً.
     */
    const existingRequest = await this.findExistingRequest(
      pharmacyId,
      dto.clientRequestId,
    );

    if (existingRequest) {
      return existingRequest;
    }

    const policy =
      await this.ragSubscriptionPolicyService.getPolicyOrThrow(pharmacyId);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          /*
           * قد يكون الطلب نفسه قد أُنشئ بين
           * الفحص الخارجي وبدء Transaction.
           */
          const existingInsideTransaction =
            await this.findExistingRequestWithTx(
              tx,
              pharmacyId,
              dto.clientRequestId,
            );

          if (existingInsideTransaction) {
            return existingInsideTransaction;
          }

          /*
           * قفل الاشتراك يجعل عمليات حجز الحد الشهري
           * لنفس الاشتراك متسلسلة.
           */
          await tx.$queryRaw`
            SELECT pharmacy_subscription_id
            FROM pharmacy_subscriptions
            WHERE pharmacy_subscription_id =
              ${policy.pharmacySubscriptionId}
            FOR UPDATE
          `;

          await this.ragUsageService.assertCanReserveRequest(tx, policy);

          const now = new Date();

          const leaseExpiresAt = new Date(
            now.getTime() + RAG_REQUEST_LEASE_DURATION_MS,
          );

          /*
           * لا نرسل title، لذلك:
           *
           * - إذا كان له default سيستخدمه Prisma.
           * - إذا كان Nullable فسيبقى null.
           */
          const conversation = await tx.ragConversation.create({
            data: {
              pharmacyId,
              lastMessageAt: now,
            },

            select: {
              ragConversationId: true,
              title: true,
            },
          });

          const request = await tx.ragRequest.create({
            data: {
              pharmacySubscriptionId: policy.pharmacySubscriptionId,

              ragConversationId: conversation.ragConversationId,

              turnNumber: 1,

              clientRequestId: dto.clientRequestId,

              status: RagRequestStatus.PROCESSING,

              leaseExpiresAt,

              messages: {
                create: {
                  role: RagMessageRole.USER,
                  content: dto.content,
                },
              },
            },

            select: {
              ragRequestId: true,
              turnNumber: true,
              status: true,

              messages: {
                where: {
                  role: RagMessageRole.USER,
                },

                take: 1,

                select: {
                  ragMessageId: true,
                  role: true,
                  content: true,
                  createdAt: true,
                },
              },
            },
          });

          const userMessage = request.messages[0];

          if (!userMessage) {
            throw new Error('The USER message was not created.');
          }

          /*
           * إنشاء OutboxEvent داخل Transaction نفسها.
           *
           * إذا فشل إنشاء الحدث، تفشل أيضاً عملية
           * إنشاء المحادثة والطلب والرسالة.
           */
          await tx.outboxEvent.create({
            data: {
              aggregateType: RAG_REQUEST_AGGREGATE_TYPE,

              aggregateId: String(request.ragRequestId),

              eventType: CHAT_ANSWER_REQUESTED_EVENT,

              payload: {
                ragRequestId: request.ragRequestId,
              },
            },
          });

          return {
            ragConversationId: conversation.ragConversationId,

            ragRequestId: request.ragRequestId,

            turnNumber: request.turnNumber,

            status: request.status,

            title: conversation.title,

            idempotentReplay: false,

            userMessage: {
              ragMessageId: userMessage.ragMessageId,

              role: 'USER' as const,

              content: userMessage.content,

              createdAt: userMessage.createdAt,
            },
          };
        },
        {
          timeout: 10_000,
        },
      );
    } catch (error: unknown) {
      /*
       * طلبان متزامنان بنفس clientRequestId:
       *
       * أحدهما سينجح، والثاني سيحصل على P2002.
       * عندها نعيد الطلب الذي تم إنشاؤه.
       */
      if (this.isUniqueConstraintError(error)) {
        const replay = await this.findExistingRequest(
          pharmacyId,
          dto.clientRequestId,
        );

        if (replay) {
          return replay;
        }
      }

      throw error;
    }
  }

  private async findExistingRequest(
    pharmacyId: number,
    clientRequestId: string,
  ): Promise<StartChatConversationResponse | null> {
    return this.findExistingRequestWithTx(
      this.prisma,
      pharmacyId,
      clientRequestId,
    );
  }

  private async findExistingRequestWithTx(
    database: PrismaService | Prisma.TransactionClient,

    pharmacyId: number,
    clientRequestId: string,
  ): Promise<StartChatConversationResponse | null> {
    const request = await database.ragRequest.findUnique({
      where: {
        clientRequestId,
      },

      select: {
        ragRequestId: true,
        turnNumber: true,
        status: true,

        conversation: {
          select: {
            ragConversationId: true,
            pharmacyId: true,
            title: true,
          },
        },

        messages: {
          where: {
            role: RagMessageRole.USER,
          },

          take: 1,

          select: {
            ragMessageId: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!request) {
      return null;
    }

    /*
     * نحمي بيانات الصيدليات من التصادم أو إعادة استخدام
     * clientRequestId من صيدلية مختلفة.
     */
    if (request.conversation.pharmacyId !== pharmacyId) {
      throw new ConflictException('clientRequestId has already been used.');
    }

    const userMessage = request.messages[0];

    if (!userMessage) {
      throw new Error('The existing request does not contain a USER message.');
    }

    return {
      ragConversationId: request.conversation.ragConversationId,

      ragRequestId: request.ragRequestId,

      turnNumber: request.turnNumber,

      status: request.status,

      title: request.conversation.title,

      idempotentReplay: true,

      userMessage: {
        ragMessageId: userMessage.ragMessageId,

        role: 'USER',

        content: userMessage.content,

        createdAt: userMessage.createdAt,
      },
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
