import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';

import {
  DiscountType,
  SubscriptionPlanStatus,
} from '../../../generated/prisma/enums';

import { PrismaService } from '../../../prisma/prisma.service';

import { CreatePlanOfferDto } from '../dto/create-plan-offer.dto';

import {
  calculateFinalPrice,
  decimalToNumber,
} from '../helpers/subscription-pricing.helper';

@Injectable()
export class CreatePlanOfferUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(planId: number, dto: CreatePlanOfferDto) {
    // =========================================================
    // STEP 1
    // جلب الخطة التي نريد إنشاء العرض عليها
    // =========================================================

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: {
        planId,
      },

      select: {
        planId: true,

        code: true,

        name: true,

        planPrice: true,

        currency: true,

        status: true,
      },
    });

    /*
     * الخطة غير موجودة.
     */
    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }

    /*
     * لا نسمح بإنشاء عرض لخطة غير فعالة.
     */
    if (plan.status !== SubscriptionPlanStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot create an offer for an inactive subscription plan.',
      );
    }

    // =========================================================
    // STEP 2
    // ترتيب code الخاص بالعرض
    // =========================================================

    /*
     * مثال:
     *
     * المستخدم أرسل:
     *
     *   summer 30
     *
     * يصبح:
     *
     *   SUMMER_30
     */
    const normalizedCode = dto.code.trim().toUpperCase().replace(/\s+/g, '_');

    /*
     * منع code فارغ.
     */
    if (!normalizedCode) {
      throw new BadRequestException('Offer code is required.');
    }

    // =========================================================
    // STEP 3
    // التأكد أن code العرض غير مستخدم مسبقاً
    // =========================================================

    const existingOffer = await this.prisma.planOffer.findUnique({
      where: {
        code: normalizedCode,
      },

      select: {
        offerId: true,
      },
    });

    if (existingOffer) {
      throw new ConflictException('An offer with this code already exists.');
    }

    // =========================================================
    // STEP 4
    // تحويل تواريخ العرض إلى Date
    // =========================================================

    const startsAt = new Date(dto.startsAt);

    const endsAt = new Date(dto.endsAt);

    /*
     * حماية إضافية للتواريخ.
     */
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid offer validity dates.');
    }

    // =========================================================
    // STEP 5
    // التأكد أن endsAt بعد startsAt
    // =========================================================

    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('Offer end date must be after start date.');
    }

    // =========================================================
    // STEP 6
    // تحويل قيمة الخصم إلى Decimal
    // =========================================================

    const discountValue = new Prisma.Decimal(dto.discountValue.toString());

    // =========================================================
    // STEP 7
    // التحقق من قيمة الخصم
    // =========================================================

    /*
     * إذا الخصم نسبة:
     *
     * لا يمكن أن يتجاوز 100%.
     */
    if (
      dto.discountType === DiscountType.PERCENTAGE &&
      discountValue.greaterThan(100)
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100.');
    }

    /*
     * إذا الخصم قيمة ثابتة:
     *
     * لا نسمح أن تكون قيمة الخصم
     * أكبر من سعر الخطة.
     *
     * مثال:
     *
     * سعر الخطة = 1,000,000
     * الخصم = 2,000,000
     *
     * هذا غير منطقي.
     */
    if (
      dto.discountType === DiscountType.FIXED_AMOUNT &&
      discountValue.greaterThan(plan.planPrice)
    ) {
      throw new BadRequestException(
        'Fixed discount cannot exceed the plan price.',
      );
    }

    // =========================================================
    // STEP 8
    // حساب السعر بعد الخصم
    // =========================================================

    /*
     * نحن لا نخزن finalPrice داخل PlanOffer.
     *
     * فقط نحسبه هنا للـ Response.
     *
     * مثال:
     *
     * planPrice = 1,000,000
     * discount = 30%
     *
     * finalPrice = 700,000
     */
    const finalPrice = calculateFinalPrice(
      plan.planPrice,
      dto.discountType,
      discountValue,
    );

    // =========================================================
    // STEP 9
    // إنشاء العرض
    // =========================================================

    const offer = await this.prisma.planOffer.create({
      data: {
        /*
         * الخطة التي ينتمي لها العرض.
         */
        planId: plan.planId,

        code: normalizedCode,

        title: dto.title.trim(),

        description: dto.description?.trim() || null,

        /*
         * PUBLIC أو PRIVATE.
         */
        scope: dto.scope,

        discountType: dto.discountType,

        discountValue,

        /*
         * إذا لم يرسل isActive:
         *
         * نعتبر العرض فعالاً.
         */
        isActive: dto.isActive ?? true,

        startsAt,

        endsAt,
      },

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
      },
    });

    // =========================================================
    // STEP 10
    // ترتيب Response
    // =========================================================

    return {
      offerId: offer.offerId,

      code: offer.code,

      title: offer.title,

      description: offer.description,

      scope: offer.scope,

      discountType: offer.discountType,

      discountValue: decimalToNumber(offer.discountValue),

      isActive: offer.isActive,

      startsAt: offer.startsAt,

      endsAt: offer.endsAt,
      /*
       * معلومات السعر.
       */
    //   pricing: {
        basePrice: decimalToNumber(plan.planPrice),

        finalPrice: decimalToNumber(finalPrice),

        currency: plan.currency,
    //   },

      /*
       * معلومات الخطة.
       */
      plan: {
        planId: plan.planId,

        code: plan.code,

        name: plan.name,

        currency: plan.currency,
      },

      createdAt: offer.createdAt,
    };
  }
}
