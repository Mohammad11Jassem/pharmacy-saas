import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { RagRequestStatus } from '../../../generated/prisma/enums';

import { RagSubscriptionPolicy } from '../types/rag-subscription-policy.type';

@Injectable()
export class RagUsageService {
  /**
   * يتحقق من حد المحادثة وحد الاشتراك الشهري.
   *
   * RagRequest هو المصدر الأساسي للحقيقة.
   * أما RagUsageDaily فهو جدول تجميعي سنحدثه عند نجاح أو فشل الطلب.
   */
  async assertCanReserveRequest(
    tx: Prisma.TransactionClient,
    policy: RagSubscriptionPolicy,
    ragConversationId?: number,
  ): Promise<void> {
    /*
     * في السؤال الأول لا توجد محادثة سابقة،
     * لذلك لا يوجد حد محادثة مستهلك بعد.
     */
    if (
      ragConversationId !== undefined &&
      policy.maxCompletedTurnsPerConversation !== null
    ) {
      const completedTurns = await tx.ragRequest.count({
        where: {
          ragConversationId,
          status: RagRequestStatus.SUCCEEDED,
        },
      });

      if (completedTurns >= policy.maxCompletedTurnsPerConversation) {
        throw new ForbiddenException(
          'The conversation request limit has been reached.',
        );
      }
    }

    /*
     * PROCESSING يعتبر حجزاً مؤقتاً ضمن الحد الشهري،
     * وSUCCEEDED استهلاكاً نهائياً.
     */
    if (policy.monthlyRequestLimit !== null) {
      const reservedMonthlyRequests = await tx.ragRequest.count({
        where: {
          pharmacySubscriptionId: policy.pharmacySubscriptionId,

          startedAt: {
            gte: policy.usagePeriodStart,
            lt: policy.usagePeriodEnd,
          },

          status: {
            in: [RagRequestStatus.PROCESSING, RagRequestStatus.SUCCEEDED],
          },
        },
      });

      if (reservedMonthlyRequests >= policy.monthlyRequestLimit) {
        throw new HttpException(
          'The monthly RAG request limit has been reached.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  //   async assertCanReserveRequest(
  //     tx: Prisma.TransactionClient,
  //     policy: RagSubscriptionPolicy,
  //     ragConversationId: number,
  //   ): Promise<void> {
  //     await this.assertConversationLimit(
  //       tx,
  //       policy,
  //       ragConversationId,
  //     );

  //     await this.assertMonthlyLimit(tx, policy);
  //   }

  /**
   * حد المحادثة يعتمد فقط على الطلبات الناجحة.
   *
   * PROCESSING / FAILED / EXPIRED
   * لا تعتبر Turns ناجحة.
   */
  private async assertConversationLimit(
    tx: Prisma.TransactionClient,
    policy: RagSubscriptionPolicy,
    ragConversationId: number,
  ): Promise<void> {
    const limit = policy.maxCompletedTurnsPerConversation;

    /*
     * null تعني Unlimited.
     */
    if (limit === null) {
      return;
    }

    const completedTurns = await tx.ragRequest.count({
      where: {
        ragConversationId,
        status: RagRequestStatus.SUCCEEDED,
      },
    });

    if (completedTurns >= limit) {
      throw new ForbiddenException(
        'The conversation has reached the maximum number of completed turns allowed by the subscription plan.',
      );
    }
  }

  /**
   * نحجز مكاناً للطلب PROCESSING حتى لا تتجاوز عدة طلبات
   * متزامنة الحد الشهري.
   *
   * الطلبات التي تدخل في الحد:
   * - PROCESSING
   * - SUCCEEDED
   *
   * الطلبات التي لا تدخل:
   * - FAILED
   * - EXPIRED
   */
  private async assertMonthlyLimit(
    tx: Prisma.TransactionClient,
    policy: RagSubscriptionPolicy,
  ): Promise<void> {
    const limit = policy.monthlyRequestLimit;

    /*
     * null تعني Unlimited.
     */
    if (limit === null) {
      return;
    }

    const reservedAndSuccessfulRequests = await tx.ragRequest.count({
      where: {
        pharmacySubscriptionId: policy.pharmacySubscriptionId,

        startedAt: {
          gte: policy.usagePeriodStart,
          lt: policy.usagePeriodEnd,
        },

        status: {
          in: [RagRequestStatus.PROCESSING, RagRequestStatus.SUCCEEDED],
        },
      },
    });

    if (reservedAndSuccessfulRequests >= limit) {
      throw new HttpException(
        'The monthly RAG request limit has been reached.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
