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
export class ListUnexpiredPrivateOffersUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute() {
    const now = new Date();

    /*
     * نجلب كل العروض الخاصة غير المنتهية في النظام.
     *
     * لا نهتم هنا:
     * - هل تم إسناد العرض إلى صيدلية أم لا.
     * - بعدد الصيدليات التي حصلت عليه.
     * - بحالة الـ PharmacyOfferGrant.
     *
     * مصدر البيانات هو PlanOffer فقط.
     */
    const offers =
      await this.prisma.planOffer.findMany({
        where: {
          scope: OfferScope.PRIVATE,

          isActive: true,

          /*
           * العرض لم تنتهِ صلاحيته بعد.
           *
           * هذا الشرط يعيد:
           * - العروض الفعالة حاليًا.
           * - العروض المجدولة للمستقبل.
           */
          endsAt: {
            gte: now,
          },

          /*
           * لا نعرض عروض خطة غير فعالة.
           */
          plan: {
            status:
              SubscriptionPlanStatus.ACTIVE,
          },
        },

        orderBy: [
          {
            startsAt: 'asc',
          },
          {
            endsAt: 'asc',
          },
        ],

        select: {
          offerId: true,

          code: true,

          title: true,

          description: true,

          scope: true,

          discountType: true,

          discountValue: true,

          isActive: true,

          startsAt: true,

          endsAt: true,

          createdAt: true,

          plan: {
            select: {
              planId: true,

              code: true,

              name: true,

              description: true,

              durationMonths: true,

              planPrice: true,

              currency: true,

              type: true,
            },
          },
        },
      });

    return offers.map((offer) => {
      const finalPrice =
        calculateFinalPrice(
          offer.plan.planPrice,
          offer.discountType,
          offer.discountValue,
        );

      /*
       * يساعد الفرونت على معرفة هل العرض:
       * - فعال حاليًا.
       * - أم مجدول للمستقبل.
       */
      const status =
        offer.startsAt > now
          ? 'SCHEDULED'
          : 'ACTIVE';

      return {
        offerId:
          offer.offerId,

        code:
          offer.code,

        title:
          offer.title,

        description:
          offer.description,

        scope:
          offer.scope,

        status,

        isActive:
          offer.isActive,

        startsAt:
          offer.startsAt,

        endsAt:
          offer.endsAt,

        plan: {
          planId:
            offer.plan.planId,

          code:
            offer.plan.code,

          name:
            offer.plan.name,

          description:
            offer.plan.description,

          durationMonths:
            offer.plan.durationMonths,

          type:
            offer.plan.type,
        },

        pricing: {
          basePrice:
            decimalToNumber(
              offer.plan.planPrice,
            ),

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

          currency:
            offer.plan.currency,
        },

        createdAt:
          offer.createdAt,
      };
    });
  }
}