import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';

import { PharmacySubscriptionStatus } from '../../../generated/prisma/enums';

import { PrismaService } from '../../../prisma/prisma.service';

import {
  PharmacySubscriptionHistoryItemResponseDto,
  PharmacySubscriptionsResponseDto,
} from '../dto/pharmacy-subscriptions-response.dto';

import { decimalToNumber } from '../helpers/subscription-pricing.helper';
import { ListPharmacySubscriptionsDto } from '../dto/list-pharmacy-subscriptions.dto';

/*
 * Centralized Prisma select.
 *
 * We use the same select for:
 *
 * 1- The paginated subscriptions list.
 * 2- The current subscription.
 *
 * This prevents the two responses
 * from returning different fields.
 */
const pharmacySubscriptionSelect = {
  pharmacySubscriptionId: true,

  status: true,

  startsAt: true,

  endsAt: true,

  basePrice: true,

  finalPrice: true,

  currency: true,

  createdAt: true,

  updatedAt: true,

  plan: {
    select: {
      planId: true,

      code: true,

      name: true,

      type: true,

      durationMonths: true,
    },
  },

  appliedOffer: {
    select: {
      appliedOfferId: true,

      offer: {
        select: {
          offerId: true,

          code: true,

          title: true,

          scope: true,

          discountType: true,

          discountValue: true,
        },
      },
    },
  },
};

/*
 * Prisma generates this type from the select above.
 *
 * This means mapSubscription receives exactly
 * the fields selected from the database.
 */
type SelectedPharmacySubscription = Prisma.PharmacySubscriptionGetPayload<{
  select: typeof pharmacySubscriptionSelect;
}>;

@Injectable()
export class FindPharmacySubscriptionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pharmacyId: number,
    dto: ListPharmacySubscriptionsDto,
  ): Promise<PharmacySubscriptionsResponseDto> {
    /*
     * Apply safe defaults even when the method
     * is called internally without query values.
     */
    const page = dto.page ?? 1;

    const limit = dto.limit ?? 20;

    /*
     * Calculate how many records Prisma
     * must skip before returning this page.
     *
     * page 1:
     * skip = 0
     *
     * page 2 with limit 20:
     * skip = 20
     */
    const skip = (page - 1) * limit;

    /*
     * Use one time value for all status calculations.
     *
     * This prevents small time differences between
     * items during the same request.
     */
    const now = new Date();

    // =========================================================
    // STEP 1
    // Verify that the pharmacy exists
    // =========================================================

    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: {
        pharmacyId,
      },

      select: {
        pharmacyId: true,

        pharmacyName: true,

        pharmacyCode: true,
      },
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found.');
    }

    // =========================================================
    // STEP 2
    // Get count, paginated list and current subscription
    // =========================================================

    /*
     * These queries run inside one database transaction
     * to produce a consistent read result.
     */
    const [totalItems, subscriptions, currentSubscription] =
      await this.prisma.$transaction(
        [
          /*
           * Count all pharmacy subscriptions.
           *
           * Pagination does not affect this count.
           */
          this.prisma.pharmacySubscription.count({
            where: {
              pharmacyId,
            },
          }),

          /*
           * Get only the requested page.
           */
          this.prisma.pharmacySubscription.findMany({
            where: {
              pharmacyId,
            },

            skip,

            take: limit,

            /*
             * Return the newest subscriptions first.
             */
            orderBy: [
              {
                startsAt: 'desc',
              },

              {
                pharmacySubscriptionId: 'desc',
              },
            ],

            select: pharmacySubscriptionSelect,
          }),

          /*
           * Get the subscription that is running now.
           *
           * This query is independent from pagination.
           * Therefore, currentSubscription is returned
           * even when it is not inside the current page.
           */
          this.prisma.pharmacySubscription.findFirst({
            where: {
              pharmacyId,

              /*
               * A cancelled subscription must never
               * be considered the current subscription.
               */
              status: {
                not: PharmacySubscriptionStatus.CANCELLED,
              },

              /*
               * The subscription has already started.
               */
              startsAt: {
                lte: now,
              },

              /*
               * The subscription has not ended yet.
               */
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

            select: pharmacySubscriptionSelect,
          }),
        ],
        // to take advantage of repeatable read isolation level, we need to set it explicitly, this take a snapshot of the database at the start of the transaction and all queries will see the same data, this is important for pagination and current subscription
        {
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        },
      );

    // =========================================================
    // STEP 3
    // Map the paginated subscriptions
    // =========================================================

    const mappedSubscriptions = subscriptions.map((subscription) =>
      this.mapSubscription(subscription, now),
    );

    // =========================================================
    // STEP 4
    // Map the current subscription
    // =========================================================

    /*
     * currentSubscription can be null when:
     *
     * 1- The pharmacy has no subscription.
     * 2- All subscriptions are expired.
     * 3- The next subscription is still scheduled.
     * 4- The current subscription was cancelled.
     */
    console.log('currentSubscription', currentSubscription)
    const mappedCurrentSubscription = currentSubscription
      ? this.mapSubscription(currentSubscription, now)
      : null;

    // =========================================================
    // STEP 5
    // Calculate pagination metadata
    // =========================================================

    /*
     * Math.ceil guarantees that a partial last page
     * is counted as a complete page.
     *
     * Example:
     *
     * totalItems = 21
     * limit = 20
     *
     * totalPages = 2
     */
    const totalPages = Math.ceil(totalItems / limit);

    // =========================================================
    // STEP 6
    // Return the complete response
    // =========================================================

    return {
      pharmacy,

      currentSubscription: mappedCurrentSubscription,

      subscriptions: mappedSubscriptions,

      pagination: {
        page,

        limit,

        totalItems,

        totalPages,

        hasNextPage: page < totalPages,

        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Convert one Prisma subscription
   * to the public API response.
   */
  private mapSubscription(
    subscription: SelectedPharmacySubscription,
    now: Date,
  ): PharmacySubscriptionHistoryItemResponseDto {
      console.log('subscription.status', subscription.status)
    return {
      pharmacySubscriptionId: subscription.pharmacySubscriptionId,

      /*
       * Return the effective status according
       * to the subscription dates.
       */
      status: this.resolveEffectiveStatus(
        subscription.status,
        subscription.startsAt,
        subscription.endsAt,
        now,
      ),

      startsAt: subscription.startsAt,

      endsAt: subscription.endsAt,

      plan: subscription.plan,

      basePrice: decimalToNumber(subscription.basePrice),

      finalPrice: decimalToNumber(subscription.finalPrice),

      currency: subscription.currency,

      appliedOffer: subscription.appliedOffer
        ? {
            appliedOfferId: subscription.appliedOffer.appliedOfferId,

            offerId: subscription.appliedOffer.offer.offerId,

            code: subscription.appliedOffer.offer.code,

            title: subscription.appliedOffer.offer.title,

            scope: subscription.appliedOffer.offer.scope,

            discountType: subscription.appliedOffer.offer.discountType,

            discountValue: decimalToNumber(
              subscription.appliedOffer.offer.discountValue,
            ),
          }
        : null,

      createdAt: subscription.createdAt,

      updatedAt: subscription.updatedAt,
    };
  }

  /**
   * Calculate the real subscription status
   * according to the current date.
   */
  private resolveEffectiveStatus(
    storedStatus: PharmacySubscriptionStatus,
    startsAt: Date,
    endsAt: Date,
    now: Date,
  ): PharmacySubscriptionStatus {
    /*
     * Cancellation is a manual business decision.
     *
     * A cancelled subscription remains cancelled
     * regardless of its dates.
     */
    if (storedStatus === PharmacySubscriptionStatus.CANCELLED) {
      return PharmacySubscriptionStatus.CANCELLED;
    }

    /*
     * The subscription starts in the future.
     */
    if (startsAt.getTime() > now.getTime()) {
      return PharmacySubscriptionStatus.SCHEDULED;
    }

    /*
     * The end date is exclusive.
     *
     * When now equals endsAt,
     * the subscription is expired.
     */
    if (endsAt.getTime() <= now.getTime()) {
      return PharmacySubscriptionStatus.EXPIRED;
    }

    /*
     * startsAt <= now < endsAt
     *
     * The subscription is currently running.
     */
    return PharmacySubscriptionStatus.ACTIVE;
  }
}
