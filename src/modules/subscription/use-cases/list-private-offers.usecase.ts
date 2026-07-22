import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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
export class ListPrivateOffersUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    pharmacyId: number,
    planId: number,
  ) {
    const now = new Date();

    /*
     * نتحقق أولاً من وجود الصيدلية.
     *
     * بدون هذا التحقق، إذا كان pharmacyId غير موجود
     * فقد نرجع الخطة مع privateOffers فارغة،
     * وهذا Response مضلل.
     */
    const pharmacy =
      await this.prisma.pharmacy.findUnique({
        where: {
          pharmacyId,
        },

        select: {
          pharmacyId: true,
        },
      });

    if (!pharmacy) {
      throw new NotFoundException(
        'Pharmacy not found.',
      );
    }

    /*
     * نجلب خطة واحدة فقط حسب planId.
     *
     * داخل الخطة نجلب فقط العروض الخاصة التي:
     *
     * 1. فعالة.
     * 2. ضمن فترة العرض الحالية.
     * 3. تم إسنادها للصيدلية المطلوبة.
     * 4. لم تُستخدم بعد.
     * 5. ما زالت صلاحية الإسناد فعالة.
     */
    const plan =
      await this.prisma.subscriptionPlan.findUnique({
        where: {
          planId,
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
          status: true,

          offers: {
            where: {
              scope:
                OfferScope.PRIVATE,

              isActive: true,

              startsAt: {
                lte: now,
              },

              endsAt: {
                gte: now,
              },

              grants: {
                some: {
                  pharmacyId,

                  redeemedAt: null,

                  validFrom: {
                    lte: now,
                  },

                  validUntil: {
                    gte: now,
                  },
                },
              },
            },

            /*
             * ترتيب العروض حسب أقرب تاريخ انتهاء.
             *
             * هذا الترتيب للعرض فقط،
             * أما أفضل عرض فيتم حسابه لاحقاً حسب finalPrice.
             */
            orderBy: {
              endsAt: 'asc',
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

              /*
               * نجلب Grant الصيدلية المطلوبة فقط.
               */
              grants: {
                where: {
                  pharmacyId,

                  redeemedAt: null,

                  validFrom: {
                    lte: now,
                  },

                  validUntil: {
                    gte: now,
                  },
                },

                take: 1,

                select: {
                  pharmacyOfferGrantId: true,
                  grantReason: true,
                  validFrom: true,
                  validUntil: true,
                  note: true,
                },
              },
            },
          },
        },
      });

    if (!plan) {
      throw new NotFoundException(
        'Subscription plan not found.',
      );
    }

    /*
     * لا نعرض عروض خطة غير فعالة.
     */
    if (
      plan.status !==
      SubscriptionPlanStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Subscription plan is inactive.',
      );
    }

    const privateOffers =
      plan.offers.map((offer) => {
        /*
         * وجود grants.some في الاستعلام الخارجي
         * يضمن وجود Grant فعال للصيدلية.
         */
        const grant =
          offer.grants[0];

        const finalPrice =
          calculateFinalPrice(
            plan.planPrice,
            offer.discountType,
            offer.discountValue,
          );

        return {
          offerId:
            offer.offerId,

          code:
            offer.code,

          title:
            offer.title,

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

          grant: {
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
          },
        };
      });

    /*
     * نختار العرض الذي ينتج أقل سعر نهائي.
     *
     * لا نقارن discountValue مباشرةً لأن أحد العروض
     * قد يكون نسبة مئوية والآخر مبلغاً ثابتاً.
     */
    const bestOffer =
      privateOffers.length > 0
        ? privateOffers.reduce(
            (best, current) =>
              current.finalPrice <
              best.finalPrice
                ? current
                : best,
          )
        : null;

    const basePrice =
      decimalToNumber(
        plan.planPrice,
      );

    return {
      planId:
        plan.planId,

      code:
        plan.code,

      name:
        plan.name,

      description:
        plan.description,

      durationMonths:
        plan.durationMonths,

      type:
        plan.type,

      currency:
        plan.currency,

      basePrice,

      /*
       * إذا وُجد عرض خاص، نستخدم سعر أفضل عرض.
       * وإلا نستخدم السعر الأساسي للخطة.
       */
      currentPrice:
        bestOffer
          ? bestOffer.finalPrice
          : basePrice,

      hasActiveOffer:
        privateOffers.length > 0,

      bestOfferId:
        bestOffer?.offerId ??
        null,

      privateOffers,
    };
  }
}