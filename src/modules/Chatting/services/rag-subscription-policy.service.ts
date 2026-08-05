import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { PharmacySubscriptionStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

import { addCalendarMonths } from '../../subscription/helpers/subscription-pricing.helper';

import { RagSubscriptionPolicy } from '../types/rag-subscription-policy.type';

@Injectable()
export class RagSubscriptionPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the active RAG policy for the current pharmacy.
   *
   * This is the single reusable entry point for:
   *
   * - creating conversations;
   * - sending messages;
   * - checking conversation limits;
   * - checking monthly limits;
   * - storing daily usage.
   */
  async getPolicyOrThrow(
    pharmacyId: number,
    now: Date = new Date(),
  ): Promise<RagSubscriptionPolicy> {
    const subscription =
      await this.prisma.pharmacySubscription.findFirst({
        where: {
          pharmacyId,

          status: PharmacySubscriptionStatus.ACTIVE,

          startsAt: {
            lte: now,
          },

          endsAt: {
            gt: now,
          },
        },

        orderBy: [
          {
            startsAt: 'desc',
          },
          {
            pharmacySubscriptionId: 'desc',
          },
        ],

        select: {
          pharmacySubscriptionId: true,
          pharmacyId: true,
          startsAt: true,
          endsAt: true,
          status: true,
          plan: {
            select: {
              planId: true,
              code: true,
              name: true,

              ragEnabled: true,
              ragMaxCompletedTurnsPerConversation: true,
              ragMonthlyRequestLimit: true,
            },
          },
        },
      });

      // console.log('subscription', subscription);
    if (!subscription) {
      throw new ForbiddenException(
        'An active pharmacy subscription is required to use RAG.',
      );
    }

    if (!subscription.plan.ragEnabled) {
      throw new ForbiddenException(
        'RAG is not available for the current subscription plan.',
      );
    }

    const usagePeriod = this.resolveCurrentMonthlyUsagePeriod(
      subscription.startsAt,
      subscription.endsAt,
      now,
    );

    return {
      pharmacySubscriptionId:
        subscription.pharmacySubscriptionId,

      pharmacyId: subscription.pharmacyId,

      planId: subscription.plan.planId,
      planCode: subscription.plan.code,
      planName: subscription.plan.name,

      ragEnabled: subscription.plan.ragEnabled,

      maxCompletedTurnsPerConversation:
        subscription.plan
          .ragMaxCompletedTurnsPerConversation,

      monthlyRequestLimit:
        subscription.plan.ragMonthlyRequestLimit,

      usagePeriodStart: usagePeriod.start,
      usagePeriodEnd: usagePeriod.end,

      subscriptionStartsAt: subscription.startsAt,
      subscriptionEndsAt: subscription.endsAt,
    };
  }

  /**
   * Calculates the current monthly usage period.
   *
   * Example:
   *
   * subscription startsAt:
   * 2026-01-15T10:00:00Z
   *
   * current period:
   * 2026-03-15T10:00:00Z
   * →
   * 2026-04-15T10:00:00Z
   *
   * The final period is capped at subscription.endsAt.
   */
  resolveCurrentMonthlyUsagePeriod(
    subscriptionStartsAt: Date,
    subscriptionEndsAt: Date,
    now: Date,
  ): {
    start: Date;
    end: Date;
  } {
    const startsAtMs = subscriptionStartsAt.getTime();
    const endsAtMs = subscriptionEndsAt.getTime();
    const nowMs = now.getTime();

    if (
      Number.isNaN(startsAtMs) ||
      Number.isNaN(endsAtMs) ||
      Number.isNaN(nowMs)
    ) {
      throw new InternalServerErrorException(
        'Invalid subscription dates.',
      );
    }

    if (nowMs < startsAtMs || nowMs >= endsAtMs) {
      throw new ForbiddenException(
        'The pharmacy subscription is outside its active period.',
      );
    }

    /*
     * We always calculate each boundary from the original startsAt.
     *
     * This prevents calendar drift:
     *
     * Jan 31 → Feb 28 → Mar 31
     *
     * instead of:
     *
     * Jan 31 → Feb 28 → Mar 28
     */
    for (let cycleIndex = 0; cycleIndex < 1200; cycleIndex++) {
      const periodStart = addCalendarMonths(
        subscriptionStartsAt,
        cycleIndex,
      );

      const uncappedPeriodEnd = addCalendarMonths(
        subscriptionStartsAt,
        cycleIndex + 1,
      );

      const periodEnd =
        uncappedPeriodEnd.getTime() < endsAtMs
          ? uncappedPeriodEnd
          : new Date(subscriptionEndsAt);

      if (
        nowMs >= periodStart.getTime() &&
        nowMs < periodEnd.getTime()
      ) {
        return {
          start: periodStart,
          end: periodEnd,
        };
      }

      if (periodEnd.getTime() >= endsAtMs) {
        break;
      }
    }

    throw new InternalServerErrorException(
      'Unable to resolve the current RAG usage period.',
    );
  }
}