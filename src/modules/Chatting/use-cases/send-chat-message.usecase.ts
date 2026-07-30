import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import {
  RagMessageRole,
  RagRequestStatus,
} from '../../../generated/prisma/enums';

import { PrismaService } from '../../../prisma/prisma.service';

import {
  RAG_REQUEST_LEASE_DURATION_MS,
  RAG_STALE_REQUEST_FAILURE_CODE,
} from '../chatting.constants';

import { SendChatMessageDto } from '../dto/send-chat-message.dto';

import { RagSubscriptionPolicyService } from '../services/rag-subscription-policy.service';
import { RagUsageService } from '../services/rag-usage.service';

const reservedRequestSelect = {
  ragRequestId: true,
  ragConversationId: true,
  pharmacySubscriptionId: true,

  turnNumber: true,
  clientRequestId: true,
  status: true,

  leaseExpiresAt: true,
  finishedAt: true,
  failureCode: true,

  startedAt: true,
  updatedAt: true,

  messages: {
    orderBy: {
      createdAt: 'asc' as const,
    },

    select: {
      ragMessageId: true,
      role: true,
      content: true,
      createdAt: true,
    },
  },
} satisfies Prisma.RagRequestSelect;

type ReservedRequest = Prisma.RagRequestGetPayload<{
  select: typeof reservedRequestSelect;
}>;

type LockedConversationRow = {
  ragConversationId: number;
  archivedAt: Date | null;
};

type LockedSubscriptionRow = {
  pharmacySubscriptionId: number;
};

@Injectable()
export class SendChatMessageUseCase {
  constructor(
    private readonly prisma: PrismaService,

    private readonly ragSubscriptionPolicyService:
      RagSubscriptionPolicyService,

    private readonly ragUsageService: RagUsageService,
  ) {}

  async execute(
    pharmacyId: number,
    ragConversationId: number,
    dto: SendChatMessageDto,
  ) {
    const now = new Date();

    /*
     * نتحقق أولاً من الاشتراك الفعال وسياسة RAG.
     */
    const policy =
      await this.ragSubscriptionPolicyService.getPolicyOrThrow(
        pharmacyId,
        now,
      );

    const result = await this.prisma.$transaction(
      async (tx) => {
        /*
         * يجب أن يكون ترتيب Locks ثابتاً:
         *
         * 1. PharmacySubscription
         * 2. RagConversation
         *
         * هذا يقلل احتمال حدوث Deadlocks.
         */

        await this.lockSubscription(
          tx,
          policy.pharmacySubscriptionId,
          pharmacyId,
        );

        const conversation =
          await this.lockConversation(
            tx,
            ragConversationId,
            pharmacyId,
          );

        if (conversation.archivedAt) {
          throw new ConflictException(
            'Messages cannot be sent to an archived conversation.',
          );
        }

        /*
         * Idempotency:
         *
         * إذا أرسل Frontend نفس clientRequestId مرة ثانية،
         * نعيد الطلب الموجود ولا ننشئ Turn جديداً.
         */
        const existingRequest =
          await tx.ragRequest.findUnique({
            where: {
              ragConversationId_clientRequestId: {
                ragConversationId,
                clientRequestId: dto.clientRequestId,
              },
            },

            select: reservedRequestSelect,
          });

        if (existingRequest) {
          const normalizedExistingRequest =
            await this.expireExistingRequestIfStale(
              tx,
              existingRequest,
              now,
            );

          return this.buildResponse(
            normalizedExistingRequest,
            true,
          );
        }

        /*
         * نتحقق من وجود طلب آخر قيد المعالجة.
         *
         * يوجد أيضاً Partial Unique Index في PostgreSQL يمنع
         * وجود طلبين PROCESSING للمحادثة نفسها.
         */
        const processingRequest =
          await tx.ragRequest.findFirst({
            where: {
              ragConversationId,
              status: RagRequestStatus.PROCESSING,
            },

            select: reservedRequestSelect,
          });

        if (processingRequest) {
          if (
            processingRequest.leaseExpiresAt.getTime() >
            now.getTime()
          ) {
            throw new ConflictException(
              'Another message is currently being processed for this conversation.',
            );
          }

          /*
           * الطلب عالق وانتهت مدة الـ Lease.
           * نحوله إلى EXPIRED قبل السماح بطلب جديد.
           */
          await tx.ragRequest.update({
            where: {
              ragRequestId:
                processingRequest.ragRequestId,
            },

            data: {
              status: RagRequestStatus.EXPIRED,
              finishedAt: now,
              failureCode:
                RAG_STALE_REQUEST_FAILURE_CODE,
            },
          });
        }

        await this.ragUsageService.assertCanReserveRequest(
          tx,
          policy,
          ragConversationId,
        );

        const lastTurn =
          await tx.ragRequest.aggregate({
            where: {
              ragConversationId,
            },

            _max: {
              turnNumber: true,
            },
          });

        const nextTurnNumber =
          (lastTurn._max.turnNumber ?? 0) + 1;

        const leaseExpiresAt = new Date(
          now.getTime() +
            RAG_REQUEST_LEASE_DURATION_MS,
        );

        /*
         * Nested Write:
         *
         * ينشئ RagRequest ورسالة USER معاً.
         * إذا فشل أحدهما تتراجع العملية كاملة.
         */
        const request = await tx.ragRequest.create({
          data: {
            pharmacySubscriptionId:
              policy.pharmacySubscriptionId,

            ragConversationId,

            turnNumber: nextTurnNumber,

            clientRequestId: dto.clientRequestId,

            status: RagRequestStatus.PROCESSING,

            startedAt: now,
            leaseExpiresAt,

            messages: {
              create: {
                role: RagMessageRole.USER,
                content: dto.content,
              },
            },
          },

          select: reservedRequestSelect,
        });

        await tx.ragConversation.update({
          where: {
            ragConversationId,
          },

          data: {
            lastMessageAt: now,
          },
        });

        return this.buildResponse(request, false);
      },
      {
        maxWait: 5_000,
        timeout: 10_000,
      },
    );

    return result;
  }

  /**
   * يقفل صف الاشتراك.
   *
   * الهدف:
   * منع طلبين متزامنين تابعين للاشتراك نفسه
   * من قراءة العدد الشهري ذاته ثم تجاوزه.
   */
  private async lockSubscription(
    tx: Prisma.TransactionClient,
    pharmacySubscriptionId: number,
    pharmacyId: number,
  ): Promise<void> {
    const rows =
      await tx.$queryRaw<LockedSubscriptionRow[]>`
        SELECT
          "pharmacy_subscription_id"
            AS "pharmacySubscriptionId"
        FROM "pharmacy_subscriptions"
        WHERE
          "pharmacy_subscription_id"
            = ${pharmacySubscriptionId}
          AND "pharmacy_id" = ${pharmacyId}
        FOR UPDATE
      `;

    if (rows.length === 0) {
      throw new ForbiddenException(
        'The active subscription does not belong to the current pharmacy.',
      );
    }
  }

  /**
   * يقفل المحادثة حتى لا يحصل طلبان على turnNumber نفسه.
   */
  private async lockConversation(
    tx: Prisma.TransactionClient,
    ragConversationId: number,
    pharmacyId: number,
  ): Promise<LockedConversationRow> {
    const rows =
      await tx.$queryRaw<LockedConversationRow[]>`
        SELECT
          "rag_conversation_id"
            AS "ragConversationId",
          "archived_at"
            AS "archivedAt"
        FROM "rag_conversations"
        WHERE
          "rag_conversation_id"
            = ${ragConversationId}
          AND "pharmacy_id"
            = ${pharmacyId}
        FOR UPDATE
      `;

    const conversation = rows[0];

    if (!conversation) {
      throw new NotFoundException(
        'RAG conversation was not found.',
      );
    }

    return conversation;
  }

  /**
   * عند إعادة نفس clientRequestId:
   *
   * - إن كان الطلب ما زال صالحاً نعيده كما هو.
   * - إن كان PROCESSING وانتهت Lease نحوله إلى EXPIRED.
   *
   * لا ننشئ طلباً جديداً بنفس clientRequestId.
   */
  private async expireExistingRequestIfStale(
    tx: Prisma.TransactionClient,
    request: ReservedRequest,
    now: Date,
  ): Promise<ReservedRequest> {
    if (
      request.status !== RagRequestStatus.PROCESSING ||
      request.leaseExpiresAt.getTime() > now.getTime()
    ) {
      return request;
    }

    return tx.ragRequest.update({
      where: {
        ragRequestId: request.ragRequestId,
      },

      data: {
        status: RagRequestStatus.EXPIRED,
        finishedAt: now,
        failureCode: RAG_STALE_REQUEST_FAILURE_CODE,
      },

      select: reservedRequestSelect,
    });
  }

  private buildResponse(
    request: ReservedRequest,
    idempotentReplay: boolean,
  ) {
    const userMessage =
      request.messages.find(
        (message) =>
          message.role === RagMessageRole.USER,
      ) ?? null;

    return {
      ragRequestId: request.ragRequestId,
      ragConversationId:
        request.ragConversationId,

      turnNumber: request.turnNumber,
      clientRequestId: request.clientRequestId,

      status: request.status,

      leaseExpiresAt: request.leaseExpiresAt,
      finishedAt: request.finishedAt,
      failureCode: request.failureCode,

      startedAt: request.startedAt,
      updatedAt: request.updatedAt,

      userMessage,

      idempotentReplay,
    };
  }
}