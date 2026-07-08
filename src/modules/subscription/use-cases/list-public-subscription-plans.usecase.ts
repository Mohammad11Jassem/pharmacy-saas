import { Injectable } from '@nestjs/common';
import {
  OfferScope,
  SubscriptionPlanStatus,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  calculateFinalPrice,
  decimalToNumber,
} from '../helpers/subscription-pricing.helper';

@Injectable()
export class ListPublicSubscriptionPlansUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute() {
    const now = new Date();

    const plans =
      await this.prisma.subscriptionPlan.findMany({
        where: {
          status:
            SubscriptionPlanStatus.ACTIVE,
        },

        orderBy: {
          planPrice: 'asc',
        },

        select: {
          planId: true,
          code: true,
          name: true,
          description: true,
          durationMonths: true,
          planPrice: true,
          currency: true,
          type: true,

          offers: {
            where: {
              scope: OfferScope.PUBLIC,

              isActive: true,

              startsAt: {
                lte: now,
              },

              endsAt: {
                gte: now,
              },
            },

            orderBy: {
              discountValue: 'desc',
            },

            select: {
              offerId: true,
              code: true,
              title: true,
              description: true,
              discountType: true,
              discountValue: true,
              startsAt: true,
              endsAt: true,
            },
          },
        },
      });

    return plans.map((plan) => {
      const publicOffers =
        plan.offers.map((offer) => {
          const finalPrice =
            calculateFinalPrice(
              plan.planPrice,
              offer.discountType,
              offer.discountValue,
            );

          return {
            offerId: offer.offerId,

            code: offer.code,

            title: offer.title,

            description:
              offer.description,

            discountType:
              offer.discountType,

            discountValue:
              decimalToNumber(
                offer.discountValue,
              ),

            finalPrice:
              decimalToNumber(
                finalPrice,
              ),

            startsAt:
              offer.startsAt,

            endsAt:
              offer.endsAt,
          };
        });

      const bestOffer =
        publicOffers.length > 0
          ? publicOffers.reduce(
              (best, current) =>
                current.finalPrice <
                best.finalPrice
                  ? current
                  : best,
            )
          : null;

      return {
        planId: plan.planId,

        code: plan.code,

        name: plan.name,

        description:
          plan.description,

        durationMonths:
          plan.durationMonths,

        type: plan.type,

        currency: plan.currency,

        basePrice:
          decimalToNumber(
            plan.planPrice,
          ),

        currentPrice:
          bestOffer
            ? bestOffer.finalPrice
            : decimalToNumber(
                plan.planPrice,
              ),

        hasActiveOffer:
          publicOffers.length > 0,

        bestOfferId:
          bestOffer?.offerId ?? null,

        publicOffers,
      };
    });
  }
}