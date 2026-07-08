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

@Injectable()
export class ListPharmaciesWithOffersUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    dto: ListSubscriptionPharmaciesDto,
  ) {
    const now = new Date();

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
                  gt: now,
                },

                status: {
                  in: [
                    PharmacySubscriptionStatus.ACTIVE,
                    PharmacySubscriptionStatus.SCHEDULED,
                  ],
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
                  lte: now,
                },

                validUntil: {
                  gte: now,
                },

                offer: {
                  scope:
                    OfferScope.PRIVATE,

                  isActive: true,

                  startsAt: {
                    lte: now,
                  },

                  endsAt: {
                    gte: now,
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
          const activeSubscription =
            pharmacy.subscriptions.find(
              (subscription) =>
                subscription.startsAt <=
                  now &&
                subscription.endsAt >
                  now,
            ) ?? null;

          const nextSubscription =
            pharmacy.subscriptions.find(
              (subscription) =>
                subscription.startsAt >
                now,
            ) ?? null;

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