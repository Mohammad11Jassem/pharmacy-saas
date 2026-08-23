import { Injectable } from '@nestjs/common';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../../common/pagination/pagination.util';
import { Prisma } from '../../../generated/prisma/client';
import {
  OfferScope,
  PharmacySubscriptionStatus,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { ListSubscriptionPharmaciesDto } from '../dto/list-subscription-pharmacies.dto';
import {
  calculateFinalPrice,
  decimalToNumber,
} from '../helpers/subscription-pricing.helper';
import {
  addCalendarDays,
  compareCalendarDates,
  getSubscriptionToday,
} from '../helpers/subscription-date.helper';

@Injectable()
export class ListPharmaciesWithOffersUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    dto: ListSubscriptionPharmaciesDto,
  ) {
    const today = getSubscriptionToday();
    const tomorrow = addCalendarDays(today, 1);

    const {
      page,
      limit,
      skip,
      take,
    } = getPaginationParams(
      dto.page,
      dto.limit,
    );

    const where:
      Prisma.PharmacyWhereInput = {
      ...(dto.search && {
        OR: [
          {
            pharmacyName: {
              contains:
                dto.search,

              mode:
                'insensitive',
            },
          },

          {
            email: {
              contains:
                dto.search,

              mode:
                'insensitive',
            },
          },
        ],
      }),
    };

    const [
      pharmacies,
      total,
    ] =
      await this.prisma.$transaction([
        this.prisma.pharmacy.findMany({
          where,

          skip,

          take,

          orderBy: {
            pharmacyName: 'asc',
          },

          select: {
            pharmacyId: true,

            pharmacyName: true,

            email: true,

            status: true,

            /*
             * نجلب الاشتراكات الحالية
             * والمجدولة التي لم تنته.
             */
            subscriptions: {
              where: {
                endsAt: {
                  gte: tomorrow,
                },

                status: {
                  not: PharmacySubscriptionStatus.CANCELLED,
                },
              },

              orderBy: {
                startsAt: 'asc',
              },

              select: {
                pharmacySubscriptionId:
                  true,

                status: true,

                startsAt: true,

                endsAt: true,

                plan: {
                  select: {
                    planId: true,

                    code: true,

                    name: true,
                  },
                },
              },
            },

            /*
             * فقط العروض الخاصة المتاحة الآن.
             */
            offerGrants: {
              where: {
                redeemedAt: null,

                validFrom: {
                  lt: tomorrow,
                },

                validUntil: {
                  gte: today,
                },

                offer: {
                  scope:
                    OfferScope.PRIVATE,

                  isActive: true,

                  startsAt: {
                    lt: tomorrow,
                  },

                  endsAt: {
                    gte: today,
                  },
                },
              },

              orderBy: {
                validUntil: 'asc',
              },

              select: {
                pharmacyOfferGrantId:
                  true,

                grantReason: true,

                validFrom: true,

                validUntil: true,

                offer: {
                  select: {
                    offerId: true,

                    code: true,

                    title: true,

                    discountType:
                      true,

                    discountValue:
                      true,

                    plan: {
                      select: {
                        planId: true,

                        code: true,

                        name: true,

                        planPrice:
                          true,

                        currency:
                          true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),

        this.prisma.pharmacy.count({
          where,
        }),
      ]);

    const items =
      pharmacies.map(
        (pharmacy) => {
          const activeSubscriptionRow =
            pharmacy.subscriptions.find(
              (subscription) =>
                compareCalendarDates(subscription.startsAt, today) <= 0 &&
                compareCalendarDates(subscription.endsAt, today) > 0,
            ) ?? null;

          const nextSubscriptionRow =
            pharmacy.subscriptions.find(
              (subscription) =>
                compareCalendarDates(subscription.startsAt, today) > 0,
            ) ?? null;

          /*
           * Response status is derived from CALENDAR DATES, not blindly
           * copied from a possibly stale stored status.
           */
          const activeSubscription = activeSubscriptionRow
            ? {
                ...activeSubscriptionRow,
                status: PharmacySubscriptionStatus.ACTIVE,
              }
            : null;

          const nextSubscription = nextSubscriptionRow
            ? {
                ...nextSubscriptionRow,
                status: PharmacySubscriptionStatus.SCHEDULED,
              }
            : null;

          const availablePrivateOffers =
            pharmacy.offerGrants.map(
              (grant) => {
                const finalPrice =
                  calculateFinalPrice(
                    grant.offer.plan
                      .planPrice,

                    grant.offer
                      .discountType,

                    grant.offer
                      .discountValue,
                  );

                return {
                  pharmacyOfferGrantId:
                    grant
                      .pharmacyOfferGrantId,

                  grantReason:
                    grant.grantReason,

                  validFrom:
                    grant.validFrom,

                  validUntil:
                    grant.validUntil,

                  offerId:
                    grant.offer
                      .offerId,

                  code:
                    grant.offer.code,

                  title:
                    grant.offer.title,

                  plan: {
                    planId:
                      grant.offer.plan
                        .planId,

                    code:
                      grant.offer.plan
                        .code,

                    name:
                      grant.offer.plan
                        .name,
                  },

                  pricing: {
                    basePrice:
                      decimalToNumber(
                        grant.offer
                          .plan
                          .planPrice,
                      ),

                    discountType:
                      grant.offer
                        .discountType,

                    discountValue:
                      decimalToNumber(
                        grant.offer
                          .discountValue,
                      ),

                    finalPrice:
                      decimalToNumber(
                        finalPrice,
                      ),

                    currency:
                      grant.offer.plan
                        .currency,
                  },
                };
              },
            );

          return {
            pharmacyId:
              pharmacy.pharmacyId,

            pharmacyName:
              pharmacy.pharmacyName,

            email:
              pharmacy.email,

            status:
              pharmacy.status,

            activeSubscription,

            nextSubscription,

            hasAvailablePrivateOffers:
              availablePrivateOffers.length >
              0,

            availablePrivateOffers,
          };
        },
      );

    return toPaginatedResult(
      items,
      total,
      page,
      limit,
    );
  }
}