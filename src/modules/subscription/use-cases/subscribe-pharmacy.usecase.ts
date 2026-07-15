// import {
//   BadRequestException,
//   ConflictException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';

// import { Prisma } from '../../../generated/prisma/client';

// import {
//   OfferScope,
//   PharmacySubscriptionStatus,
//   SubscriptionPlanStatus,
// } from '../../../generated/prisma/enums';

// import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';

// import {
//   SubscribePharmacyDto,
//   SubscriptionActivationMode,
// } from '../dto/subscribe-pharmacy.dto';

// import {
//   addCalendarMonths,
//   calculateFinalPrice,
//   decimalToNumber,
// } from '../helpers/subscription-pricing.helper';

// @Injectable()
// export class SubscribePharmacyUseCase {
//   constructor(private readonly unitOfWork: UnitOfWork) {}

//   async execute(pharmacyId: number, dto: SubscribePharmacyDto) {
//     /*
//      * نستخدم Transaction لأن العملية تتكون من عدة خطوات:
//      *
//      * 1- فحص الاشتراك الحالي
//      * 2- فحص العرض
//      * 3- استهلاك العرض الخاص
//      * 4- إنشاء الاشتراك
//      *
//      * يجب أن تنجح كلها أو تفشل كلها.
//      */
//     return this.unitOfWork.executeSerializable(async (tx) => {
//       const now = new Date();

//       const pharmacy = await tx.pharmacy.findUnique({
//         where: {
//           pharmacyId,
//         },

//         select: {
//           pharmacyId: true,
//         },
//       });

//       if (!pharmacy) {
//         throw new NotFoundException('Pharmacy not found.');
//       }

//       // نجلب الخطة التي اختارها الإداري

//       const plan = await tx.subscriptionPlan.findFirst({
//         where: {
//           planId: dto.planId,

//           // لا نسمح بالاشتراك بخطة غير مفعلة
//           status: SubscriptionPlanStatus.ACTIVE,
//         },

//         select: {
//           planId: true,
//           code: true,
//           name: true,

//           // نحتاج المدة لحساب endsAt
//           durationMonths: true,

//           // نحتاج السعر لحساب finalPrice
//           planPrice: true,

//           currency: true,
//         },
//       });

//       if (!plan) {
//         throw new NotFoundException('Active subscription plan not found.');
//       }

//       // نبحث عن آخر اشتراك فعال أو مجدول للصيدلية

//       /*
//        * مثال:
//        *
//        * اشتراك حالي:
//        * 01-01-2026 → 01-09-2026
//        *
//        * اشتراك مجدول:
//        * 01-09-2026 → 01-09-2027
//        *
//        * نريد آخر endsAt
//        *
//        * أي:
//        * 01-09-2027
//        */
//       const latestSubscription = await tx.pharmacySubscription.findFirst({
//         where: {
//           pharmacyId,

//           // نريد فقط الاشتراكات التي لم تنته بعد
//           endsAt: {
//             gt: now,
//           },

//           status: {
//             in: [
//               PharmacySubscriptionStatus.ACTIVE,
//               PharmacySubscriptionStatus.SCHEDULED,
//             ],
//           },
//         },

//         // نرتب حسب آخر تاريخ انتهاء
//         orderBy: {
//           endsAt: 'desc',
//         },

//         select: {
//           pharmacySubscriptionId: true,
//           startsAt: true,
//           endsAt: true,
//           status: true,
//         },
//       });

//       // STEP 4
//       // تحديد متى يبدأ الاشتراك الجديد

//       let startsAt: Date;

//       /*
//        * AFTER_CURRENT:
//        *
//        * إذا يوجد اشتراك:
//        * يبدأ الجديد بعد نهاية آخر اشتراك
//        *
//        * إذا لا يوجد اشتراك:
//        * يبدأ الآن
//        */
//       if (dto.activationMode === SubscriptionActivationMode.AFTER_CURRENT) {
//         startsAt = latestSubscription?.endsAt ?? now;
//       } else {
//         /*
//          * IMMEDIATE:
//          *
//          * إذا الصيدلية لديها اشتراك حالي أو مجدول
//          * نرفض العملية.
//          *
//          * لأننا لا نريد اشتراكين متداخلين.
//          */
//         if (latestSubscription) {
//           throw new ConflictException(
//             'Pharmacy already has an active or scheduled subscription.',
//           );
//         }

//         startsAt = now;
//       }

//       // =========================================================
//       // STEP 5
//       // نحسب تاريخ نهاية الاشتراك
//       // =========================================================

//       /*
//        * مثال:
//        *
//        * startsAt = 01-09-2026
//        * durationMonths = 12
//        *
//        * endsAt = 01-09-2027
//        */
//       const endsAt = addCalendarMonths(startsAt, plan.durationMonths);

//       // =========================================================
//       // STEP 6
//       // السعر الافتراضي هو سعر الخطة بدون خصم
//       // =========================================================

//       let finalPrice = new Prisma.Decimal(plan.planPrice.toString());

//       /*
//        * سنخزن offerId هنا إذا تم استعمال عرض.
//        *
//        * إذا لم يتم استعمال عرض:
//        * appliedOfferId = null
//        */
//       let appliedOfferId: number | null = null;

//       /*
//        * إذا العرض PRIVATE
//        * نحتاج أن نعرف أي Grant سيتم استهلاكه.
//        */
//       let privateOfferGrantId: number | null = null;

//       // =========================================================
//       // STEP 7
//       // إذا الإداري أرسل offerId
//       // نفحص العرض ونحسب السعر
//       // =========================================================

//       if (dto.offerId) {
//         const offer = await tx.planOffer.findUnique({
//           where: {
//             offerId: dto.offerId,
//           },

//           select: {
//             offerId: true,

//             // العرض يجب أن يكون تابعاً لنفس الخطة
//             planId: true,

//             scope: true,

//             discountType: true,
//             discountValue: true,

//             isActive: true,

//             startsAt: true,
//             endsAt: true,
//           },
//         });

//         // العرض غير موجود
//         if (!offer) {
//           throw new NotFoundException('Offer not found.');
//         }

//         // =======================================================
//         // نتأكد أن العرض تابع للخطة المختارة
//         // =======================================================

//         /*
//          * مثال خطأ:
//          *
//          * planId = Professional
//          * offerId = عرض Starter
//          *
//          * لا نسمح بذلك.
//          */
//         if (offer.planId !== plan.planId) {
//           throw new BadRequestException(
//             'Offer does not belong to selected plan.',
//           );
//         }

//         // =======================================================
//         // نتأكد أن العرض مفعّل
//         // =======================================================

//         if (!offer.isActive) {
//           throw new BadRequestException('Offer is inactive.');
//         }

//         // =======================================================
//         // نتأكد أن العرض صالح الآن
//         // =======================================================

//         /*
//          * العرض صالح عندما:
//          *
//          * startsAt <= now
//          * endsAt >= now
//          */
//         if (offer.startsAt > now || offer.endsAt < now) {
//           throw new BadRequestException(
//             'Offer is outside its validity period.',
//           );
//         }

//         // =======================================================
//         // إذا العرض PRIVATE
//         // يجب أن يكون ممنوحاً لهذه الصيدلية
//         // =======================================================

//         if (offer.scope === OfferScope.PRIVATE) {
//           const grant = await tx.pharmacyOfferGrant.findFirst({
//             where: {
//               pharmacyId,

//               offerId: offer.offerId,

//               // لم يتم استعماله سابقاً
//               redeemedAt: null,

//               // الـ Grant صالح الآن
//               validFrom: {
//                 lte: now,
//               },

//               validUntil: {
//                 gte: now,
//               },
//             },

//             select: {
//               pharmacyOfferGrantId: true,
//             },
//           });

//           /*
//            * لا يوجد Grant صالح.
//            *
//            * يعني العرض الخاص ليس متاحاً
//            * لهذه الصيدلية.
//            */
//           if (!grant) {
//             throw new BadRequestException(
//               'Private offer is not available for this pharmacy.',
//             );
//           }

//           privateOfferGrantId = grant.pharmacyOfferGrantId;
//         }

//         // =======================================================
//         // نحسب السعر بعد الخصم
//         // =======================================================

//         /*
//          * مثال:
//          *
//          * planPrice = 1,000,000
//          * discount = 30%
//          *
//          * finalPrice = 700,000
//          */
//         finalPrice = calculateFinalPrice(
//           plan.planPrice,
//           offer.discountType,
//           offer.discountValue,
//         );

//         // نحفظ offerId كي نربطه بالاشتراك
//         appliedOfferId = offer.offerId;
//       }

//       // =========================================================
//       // STEP 8
//       // إذا العرض PRIVATE نستهلك الـ Grant
//       // =========================================================

//       if (privateOfferGrantId) {
//         /*
//          * نستخدم updateMany بدلاً من update.
//          *
//          * لماذا؟
//          *
//          * حتى نضع شرط:
//          * redeemedAt = null
//          *
//          * إذا طلبان حاولا استخدام نفس العرض
//          * واحد فقط سينجح.
//          */
//         const redeemedGrant = await tx.pharmacyOfferGrant.updateMany({
//           where: {
//             pharmacyOfferGrantId: privateOfferGrantId,

//             redeemedAt: null,
//           },

//           data: {
//             redeemedAt: now,
//           },
//         });

//         /*
//          * إذا count = 0
//          *
//          * يعني العرض تم استخدامه من Request آخر
//          * أو لم يعد متاحاً.
//          */
//         if (redeemedGrant.count !== 1) {
//           throw new ConflictException(
//             'Private offer has already been redeemed.',
//           );
//         }
//       }

//       // =========================================================
//       // STEP 9
//       // تحديد حالة الاشتراك
//       // =========================================================

//       /*
//        * إذا startsAt في المستقبل:
//        * SCHEDULED
//        *
//        * إذا يبدأ الآن:
//        * ACTIVE
//        */
//       const subscriptionStatus =
//         startsAt.getTime() > now.getTime()
//           ? PharmacySubscriptionStatus.SCHEDULED
//           : PharmacySubscriptionStatus.ACTIVE;

//       // =========================================================
//       // STEP 10
//       // إنشاء الاشتراك
//       // =========================================================

//       const subscription = await tx.pharmacySubscription.create({
//         data: {
//           pharmacyId,

//           planId: plan.planId,

//           status: subscriptionStatus,

//           startsAt,
//           endsAt,

//           /*
//            * basePrice:
//            * سعر الخطة الأصلي وقت الاشتراك.
//            */
//           basePrice: plan.planPrice,

//           /*
//            * finalPrice:
//            * السعر الفعلي بعد الخصم.
//            *
//            * إذا لا يوجد عرض:
//            * finalPrice = basePrice
//            */
//           finalPrice,

//           currency: plan.currency,

//           /*
//            * إذا يوجد عرض:
//            *
//            * ننشئ SubscriptionAppliedOffer
//            * ونربطه بالاشتراك.
//            *
//            * إذا لا يوجد عرض:
//            * لا يتم إنشاء شيء.
//            */
//           ...(appliedOfferId && {
//             appliedOffer: {
//               create: {
//                 offerId: appliedOfferId,
//               },
//             },
//           }),
//         },

//         select: {
//           pharmacySubscriptionId: true,
//           pharmacyId: true,

//           status: true,

//           startsAt: true,
//           endsAt: true,

//           basePrice: true,
//           finalPrice: true,
//           currency: true,

//           plan: {
//             select: {
//               planId: true,
//               code: true,
//               name: true,
//               durationMonths: true,
//             },
//           },

//           appliedOffer: {
//             select: {
//               appliedOfferId: true,

//               offer: {
//                 select: {
//                   offerId: true,
//                   code: true,
//                   title: true,
//                   scope: true,

//                   discountType: true,
//                   discountValue: true,
//                 },
//               },
//             },
//           },
//         },
//       });

//       // =========================================================
//       // STEP 11
//       // ترتيب الـ Response
//       // =========================================================

//       return {
//         pharmacySubscriptionId: subscription.pharmacySubscriptionId,

//         pharmacyId: subscription.pharmacyId,

//         status: subscription.status,

//         startsAt: subscription.startsAt,

//         endsAt: subscription.endsAt,

//         plan: subscription.plan,

//         pricing: {
//           basePrice: decimalToNumber(subscription.basePrice),

//           finalPrice: decimalToNumber(subscription.finalPrice),

//           currency: subscription.currency,
//         },

//         appliedOffer: subscription.appliedOffer
//           ? {
//               appliedOfferId: subscription.appliedOffer.appliedOfferId,

//               offerId: subscription.appliedOffer.offer.offerId,

//               code: subscription.appliedOffer.offer.code,

//               title: subscription.appliedOffer.offer.title,

//               scope: subscription.appliedOffer.offer.scope,

//               discountType: subscription.appliedOffer.offer.discountType,

//               discountValue: decimalToNumber(
//                 subscription.appliedOffer.offer.discountValue,
//               ),
//             }
//           : null,
//       };
//     });
//   }
// }

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';

import {
  OfferScope,
  PharmacySubscriptionStatus,
  SubscriptionPlanStatus,
} from '../../../generated/prisma/enums';

import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';

import { SubscribePharmacyDto } from '../dto/subscribe-pharmacy.dto';

import {
  addCalendarMonths,
  calculateFinalPrice,
  decimalToNumber,
} from '../helpers/subscription-pricing.helper';
import { SubscribePharmacyResponseDto } from '../dto/subscribe-pharmacy-response.dto';

@Injectable()
export class SubscribePharmacyUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  /**
   * Used by the standalone subscription API.
   * It creates a new database transaction.
   */
  execute(
    pharmacyId: number,
    dto: SubscribePharmacyDto,
  ) : Promise<SubscribePharmacyResponseDto>{
    return this.unitOfWork.executeSerializable((tx) =>
      this.executeInsideTransaction(tx, pharmacyId, dto),
    );
  }

  async executeInsideTransaction(tx: Prisma.TransactionClient ,pharmacyId: number, dto: SubscribePharmacyDto) {
    /*
     * العملية Transaction.
     *
     * لأننا:
     *
     * 1- نفحص الاشتراكات.
     * 2- نفحص العرض.
     * 3- نستهلك العرض الخاص.
     * 4- ننشئ الاشتراك.
     *
     * يجب أن تنجح كلها أو تفشل كلها.
     */
   
      const now = new Date();

      // =========================================================
      // STEP 1
      // التأكد أن الصيدلية موجودة
      // =========================================================

      const pharmacy = await tx.pharmacy.findUnique({
        where: {
          pharmacyId,
        },

        select: {
          pharmacyId: true,
        },
      });

      if (!pharmacy) {
        throw new NotFoundException('Pharmacy not found.');
      }

      // =========================================================
      // STEP 2
      // جلب الخطة
      // =========================================================

      const plan = await tx.subscriptionPlan.findFirst({
        where: {
          planId: dto.planId,

          /*
           * لا نسمح بالاشتراك بخطة غير فعالة.
           */
          status: SubscriptionPlanStatus.ACTIVE,
        },

        select: {
          planId: true,

          code: true,

          name: true,

          /*
           * نحتاج مدة الخطة
           * حتى نحسب endsAt.
           */
          durationMonths: true,

          /*
           * السعر الأساسي للخطة.
           */
          planPrice: true,

          currency: true,
        },
      });

      if (!plan) {
        throw new NotFoundException('Active subscription plan not found.');
      }

      // =========================================================
      // STEP 3
      // تحويل startsAt القادم من الأدمن إلى Date
      // =========================================================

      const startsAt = new Date(dto.startsAt);

      /*
       * حماية إضافية.
       *
       * IsISO8601 موجود في DTO،
       * لكن نضع فحص منطقي أيضاً.
       */
      if (Number.isNaN(startsAt.getTime())) {
        throw new BadRequestException('Invalid subscription start date.');
      }

      // =========================================================
      // STEP 4
      // منع إنشاء اشتراك يبدأ في الماضي
      // =========================================================

      if (startsAt.getTime() < now.getTime()) {
        throw new BadRequestException(
          'Subscription start date cannot be in the past.',
        );
      }

      // =========================================================
      // STEP 5
      // حساب تاريخ نهاية الاشتراك
      // =========================================================

      /*
       * مثال:
       *
       * startsAt = 01-09-2026
       *
       * durationMonths = 12
       *
       * endsAt = 01-09-2027
       */
      const endsAt = addCalendarMonths(startsAt, plan.durationMonths);

      // =========================================================
      // STEP 6
      // التأكد أن الفترة الجديدة لا تتداخل مع اشتراك موجود
      // =========================================================

      /*
       * قاعدة التداخل بين فترتين:
       *
       * existing.startsAt < newEndsAt
       *
       * AND
       *
       * existing.endsAt > newStartsAt
       *
       *
       * مثال:
       *
       * اشتراك موجود:
       * 01-01 → 01-09
       *
       * اشتراك جديد:
       * 01-08 → 01-10
       *
       * يوجد تداخل ❌
       */
      const overlappingSubscription = await tx.pharmacySubscription.findFirst({
        where: {
          pharmacyId,

          status: {
            in: [
              PharmacySubscriptionStatus.ACTIVE,

              PharmacySubscriptionStatus.SCHEDULED,
            ],
          },

          startsAt: {
            lt: endsAt,
          },

          endsAt: {
            gt: startsAt,
          },
        },

        select: {
          pharmacySubscriptionId: true,

          status: true,

          startsAt: true,

          endsAt: true,

          plan: {
            select: {
              planId: true,

              name: true,
            },
          },
        },
      });

      /*
       * إذا وجدنا اشتراكاً متداخلاً،
       * نرفض إنشاء الاشتراك الجديد.
       */
      if (overlappingSubscription) {
        throw new ConflictException({
          message:
            'Subscription period overlaps with an existing subscription.',

          conflictingSubscription: overlappingSubscription,
        });
      }

      // =========================================================
      // STEP 7
      // السعر الافتراضي = سعر الخطة
      // =========================================================

      /*
       * إذا لم يوجد offerId:
       *
       * finalPrice = planPrice
       */
      let finalPrice = new Prisma.Decimal(plan.planPrice.toString());

      /*
       * إذا تم تطبيق عرض،
       * نخزن offerId هنا.
       */
      let appliedOfferId: number | null = null;

      /*
       * إذا العرض PRIVATE،
       * نخزن Grant الخاص بهذه الصيدلية هنا.
       */
      let privateOfferGrantId: number | null = null;

      // =========================================================
      // STEP 8
      // إذا تم إرسال offerId
      // نفحص العرض
      // =========================================================

      if (dto.offerId) {
        const offer = await tx.planOffer.findUnique({
          where: {
            offerId: dto.offerId,
          },

          select: {
            offerId: true,

            /*
             * نحتاج planId
             * للتأكد أن العرض تابع للخطة.
             */
            planId: true,

            /*
             * PUBLIC أو PRIVATE.
             */
            scope: true,

            discountType: true,

            discountValue: true,

            isActive: true,

            startsAt: true,

            endsAt: true,
          },
        });

        // =======================================================
        // العرض غير موجود
        // =======================================================

        if (!offer) {
          throw new NotFoundException('Offer not found.');
        }

        // =======================================================
        // العرض يجب أن يكون تابعاً للخطة المختارة
        // =======================================================

        /*
         * مثال:
         *
         * planId = PROFESSIONAL
         *
         * offer = Starter Offer
         *
         * هذا غير مسموح.
         */
        if (offer.planId !== plan.planId) {
          throw new BadRequestException(
            'Offer does not belong to selected plan.',
          );
        }

        // =======================================================
        // العرض يجب أن يكون مفعلاً
        // =======================================================

        if (!offer.isActive) {
          throw new BadRequestException('Offer is inactive.');
        }

        // =======================================================
        // العرض يجب أن يكون صالحاً الآن
        // =======================================================

        /*
         * انتبه:
         *
         * نحن نفحص صلاحية العرض وقت الاشتراك الآن.
         *
         * وليس وقت startsAt الخاص بالاشتراك.
         *
         *
         * مثال:
         *
         * العرض صالح:
         * 01-07 → 01-08
         *
         * اليوم:
         * 20-07
         *
         * الاشتراك سيبدأ:
         * 01-09
         *
         * هذا مسموح ✅
         *
         * لأننا استخدمنا العرض بتاريخ 20-07
         * وهو صالح في هذا التاريخ.
         */
        if (offer.startsAt > now || offer.endsAt < now) {
          throw new BadRequestException(
            'Offer is outside its validity period.',
          );
        }

        // =======================================================
        // إذا العرض PRIVATE
        // يجب أن يكون مسنداً لهذه الصيدلية
        // =======================================================

        if (offer.scope === OfferScope.PRIVATE) {
          const grant = await tx.pharmacyOfferGrant.findFirst({
            where: {
              /*
               * نبحث عن Grant
               * خاص بهذه الصيدلية.
               */
              pharmacyId,

              /*
               * ولنفس العرض.
               */
              offerId: offer.offerId,

              /*
               * لم يتم استعمال العرض سابقاً
               * من قبل هذه الصيدلية.
               */
              redeemedAt: null,

              /*
               * Grant صالح الآن.
               */
              validFrom: {
                lte: now,
              },

              validUntil: {
                gte: now,
              },
            },

            select: {
              pharmacyOfferGrantId: true,
            },
          });

          /*
           * لا يوجد Grant صالح.
           *
           * يعني العرض الخاص غير متاح
           * لهذه الصيدلية.
           */
          if (!grant) {
            throw new BadRequestException(
              'Private offer is not available for this pharmacy.',
            );
          }

          privateOfferGrantId = grant.pharmacyOfferGrantId;
        }

        // =======================================================
        // حساب السعر بعد الخصم
        // =======================================================

        finalPrice = calculateFinalPrice(
          plan.planPrice,

          offer.discountType,

          offer.discountValue,
        );

        /*
         * نحفظ العرض الذي تم تطبيقه.
         */
        appliedOfferId = offer.offerId;
      }

      // =========================================================
      // STEP 9
      // إذا العرض PRIVATE نستهلك Grant هذه الصيدلية
      // =========================================================

      if (privateOfferGrantId) {
        /*
         * كل صيدلية لديها PharmacyOfferGrant مستقل.
         *
         * نحن هنا نستهلك Grant هذه الصيدلية فقط.
         *
         * الصيدليات الأخرى المسند لها نفس العرض
         * تستطيع استخدام العرض بشكل طبيعي.
         */
        const redeemedGrant = await tx.pharmacyOfferGrant.updateMany({
          where: {
            pharmacyOfferGrantId: privateOfferGrantId,

            /*
             * حماية من استخدام نفس Grant مرتين.
             */
            redeemedAt: null,
          },

          data: {
            redeemedAt: now,
          },
        });

        if (redeemedGrant.count !== 1) {
          throw new ConflictException(
            'Private offer has already been redeemed.',
          );
        }
      }

      // =========================================================
      // STEP 10
      // تحديد حالة الاشتراك
      // =========================================================

      /*
       * إذا startsAt في المستقبل:
       *
       * SCHEDULED
       *
       * إذا يبدأ الآن:
       *
       * ACTIVE
       */
      const subscriptionStatus =
        startsAt.getTime() > now.getTime()
          ? PharmacySubscriptionStatus.SCHEDULED
          : PharmacySubscriptionStatus.ACTIVE;

      // =========================================================
      // STEP 11
      // إنشاء الاشتراك
      // =========================================================

      const subscription = await tx.pharmacySubscription.create({
        data: {
          pharmacyId,

          planId: plan.planId,

          status: subscriptionStatus,

          /*
           * التاريخ الذي اختاره الإداري.
           */
          startsAt,

          /*
           * محسوب حسب مدة الخطة.
           */
          endsAt,

          /*
           * سعر الخطة الأصلي وقت الاشتراك.
           */
          basePrice: plan.planPrice,

          /*
           * السعر النهائي.
           *
           * إما السعر الأساسي
           * أو السعر بعد العرض.
           */
          finalPrice,

          currency: plan.currency,

          /*
           * إذا طبقنا عرضاً،
           * ننشئ SubscriptionAppliedOffer.
           */
          ...(appliedOfferId && {
            appliedOffer: {
              create: {
                offerId: appliedOfferId,
              },
            },
          }),
        },

        select: {
          pharmacySubscriptionId: true,

          pharmacyId: true,

          status: true,

          startsAt: true,

          endsAt: true,

          basePrice: true,

          finalPrice: true,

          currency: true,

          plan: {
            select: {
              planId: true,

              code: true,

              name: true,

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
        },
      });

      // =========================================================
      // STEP 12
      // ترتيب Response
      // =========================================================

      return {
        pharmacySubscriptionId: subscription.pharmacySubscriptionId,

        pharmacyId: subscription.pharmacyId,

        status: subscription.status,

        startsAt: subscription.startsAt,

        endsAt: subscription.endsAt,

        plan: subscription.plan,

        // pricing: {
        basePrice: decimalToNumber(subscription.basePrice),

        finalPrice: decimalToNumber(subscription.finalPrice),

        currency: subscription.currency,
        // },

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
      };
    
  }
}
