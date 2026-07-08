import { Injectable } from '@nestjs/common';
import { OfferScope } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  calculateFinalPrice,
  decimalToNumber,
} from '../helpers/subscription-pricing.helper';

@Injectable()
export class ListPrivateOffersUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(pharmacyId: number) {
    const now = new Date();

    const grants =
      await this.prisma.pharmacyOfferGrant.findMany({
        where: {
          pharmacyId,

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
          pharmacyOfferGrantId: true,

          grantReason: true,

          validFrom: true,

          validUntil: true,

          note: true,

          offer: {
            select: {
              offerId: true,

              code: true,

              title: true,

              description: true,

              discountType: true,

              discountValue: true,

              startsAt: true,

              endsAt: true,

              plan: {
                select: {
                  planId: true,

                  code: true,

                  name: true,

                  durationMonths: true,

                  planPrice: true,

                  currency: true,
                },
              },
            },
          },
        },
      });

    return grants.map(
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
            grant.pharmacyOfferGrantId,

          grantReason:
            grant.grantReason,

          validFrom:
            grant.validFrom,

          validUntil:
            grant.validUntil,

          note:
            grant.note,

          offer: {
            offerId:
              grant.offer.offerId,

            code:
              grant.offer.code,

            title:
              grant.offer.title,

            description:
              grant.offer.description,

            startsAt:
              grant.offer.startsAt,

            endsAt:
              grant.offer.endsAt,
          },

          plan: {
            planId:
              grant.offer.plan.planId,

            code:
              grant.offer.plan.code,

            name:
              grant.offer.plan.name,

            durationMonths:
              grant.offer.plan
                .durationMonths,
          },

          pricing: {
            basePrice:
              decimalToNumber(
                grant.offer.plan
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
  }
}