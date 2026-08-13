import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  OfferScope,
  SubscriptionPaymentStatus,
  SubscriptionPlanStatus,
} from '../../../generated/prisma/enums';

import { Prisma } from '../../../generated/prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';

import {
  calculateFinalPrice,
  decimalToNumber,
} from '../../subscription/helpers/subscription-pricing.helper';

import { CreateSubscriptionCheckoutDto } from '../dto/create-subscription-checkout.dto';

import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class CreateSubscriptionCheckoutUseCase {
  private readonly logger = new Logger(CreateSubscriptionCheckoutUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  async execute(pharmacyId: number, dto: CreateSubscriptionCheckoutDto) {
    /*
     * STEP 1
     * Idempotency على مستوى MediXa.
     *
     * إذا تم إرسال نفس request مرة ثانية،
     * لا ننشئ SubscriptionPayment جديداً.
     */
    const existingPayment = await this.prisma.subscriptionPayment.findUnique({
      where: {
        idempotencyKey: dto.idempotencyKey,
      },

      include: {
        plan: {
          select: {
            planId: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (existingPayment) {
      return this.handleExistingPayment(pharmacyId, dto, existingPayment);
    }

    const now = new Date();

    /*
     * STEP 2
     * التأكد أن الصيدلية موجودة.
     */
    const pharmacy = await this.prisma.pharmacy.findUnique({
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

    /*
     * STEP 3
     * جلب الخطة والتأكد أنها ACTIVE.
     */
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        planId: dto.planId,

        status: SubscriptionPlanStatus.ACTIVE,
      },

      select: {
        planId: true,
        code: true,
        name: true,

        durationMonths: true,

        planPrice: true,

        currency: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Active subscription plan not found.');
    }

    /*
     * السعر الافتراضي:
     * سعر الخطة بدون عرض.
     */
    let finalAmount = new Prisma.Decimal(plan.planPrice.toString());

    let selectedOfferId: number | null = null;

    let selectedGrantId: number | null = null;
    /*
     * STEP 4
     * إذا أرسلت الصيدلية offerId،
     * نتحقق منه.
     */
    if (dto.offerId) {
      const offer = await this.prisma.planOffer.findUnique({
        where: {
          offerId: dto.offerId,
        },

        select: {
          offerId: true,

          planId: true,

          scope: true,

          discountType: true,
          discountValue: true,

          isActive: true,

          startsAt: true,
          endsAt: true,
        },
      });

      if (!offer) {
        throw new NotFoundException('Offer not found.');
      }

      /*
       * العرض يجب أن يكون للخطة نفسها.
       */
      if (offer.planId !== plan.planId) {
        throw new BadRequestException(
          'Offer does not belong to selected plan.',
        );
      }

      if (!offer.isActive) {
        throw new BadRequestException('Offer is inactive.');
      }

      /*
       * العرض يجب أن يكون صالحاً
       * وقت بدء عملية الدفع.
       */
      if (offer.startsAt > now || offer.endsAt < now) {
        throw new BadRequestException('Offer is outside its validity period.');
      }

      /*
       * PRIVATE offer:
       *
       * يجب أن يكون هناك Grant صالح
       * لهذه الصيدلية ولم يستخدم سابقاً.
       *
       * ملاحظة:
       * لا نضع redeemedAt الآن.
       * الاستهلاك الفعلي سيتم فقط
       * بعد نجاح الدفع في الـWebhook.
       */
      //   if (offer.scope === OfferScope.PRIVATE) {
      //     const grant =
      //       await this.prisma.pharmacyOfferGrant.findFirst({
      //         where: {
      //           pharmacyId,

      //           offerId: offer.offerId,

      //           redeemedAt: null,

      //           validFrom: {
      //             lte: now,
      //           },

      //           validUntil: {
      //             gte: now,
      //           },
      //         },

      //         select: {
      //           pharmacyOfferGrantId: true,
      //         },
      //       });

      //     if (!grant) {
      //       throw new BadRequestException(
      //         'Private offer is not available for this pharmacy.',
      //       );
      //     }
      //   }
      if (offer.scope === OfferScope.PRIVATE) {
        const grant = await this.prisma.pharmacyOfferGrant.findFirst({
          where: {
            pharmacyId,

            offerId: offer.offerId,

            redeemedAt: null,

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

        if (!grant) {
          throw new BadRequestException(
            'Private offer is not available for this pharmacy.',
          );
        }

        selectedGrantId = grant.pharmacyOfferGrantId;
      }

      finalAmount = calculateFinalPrice(
        plan.planPrice,
        offer.discountType,
        offer.discountValue,
      );

      selectedOfferId = offer.offerId;
    }

    /*
     * Stripe Checkout في مسار الدفع الحالي
     * يجب أن يكون له مبلغ فعلي > 0.
     */
    if (finalAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'The final subscription amount must be greater than zero for Stripe payment.',
      );
    }

    /*
     * في مرحلة Stripe Test الحالية
     * سنستخدم USD فقط لتبسيط التعامل
     * مع minor units.
     */
    const currency = plan.currency.trim().toUpperCase();

    if (currency !== 'USD') {
      throw new BadRequestException(
        'Stripe test checkout currently supports USD plans only.',
      );
    }

    /*
     * STEP 5
     * إنشاء Purchase Intent داخلياً.
     */
    let payment;

    try {
      payment = await this.prisma.subscriptionPayment.create({
        data: {
          pharmacyId,

          planId: plan.planId,

          offerId: selectedOfferId,

          pharmacyOfferGrantId: selectedGrantId,

          amount: finalAmount,

          currency,

          durationMonths: plan.durationMonths,

          idempotencyKey: dto.idempotencyKey,

          status: SubscriptionPaymentStatus.PENDING,
        },

        select: {
          subscriptionPaymentId: true,

          pharmacyId: true,
          planId: true,
          offerId: true,

          amount: true,
          currency: true,

          durationMonths: true,

          status: true,

          stripeCheckoutSessionId: true,
        },
      });
    } catch (error) {
      /*
       * حماية من Request متزامنين
       * بنفس idempotencyKey.
       */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const racedPayment = await this.prisma.subscriptionPayment.findUnique({
          where: {
            idempotencyKey: dto.idempotencyKey,
          },

          include: {
            plan: {
              select: {
                planId: true,
                code: true,
                name: true,
              },
            },
          },
        });

        if (racedPayment) {
          return this.handleExistingPayment(pharmacyId, dto, racedPayment);
        }
        if (selectedGrantId) {
          throw new ConflictException(
            'This private offer is already reserved by another payment.',
          );
        }
      }

      throw error;
    }

    /*
     * STEP 6
     * إنشاء Stripe Checkout Session.
     */
    return this.createStripeSession(payment, {
      code: plan.code,
      name: plan.name,
    });
  }

  private async handleExistingPayment(
    pharmacyId: number,
    dto: CreateSubscriptionCheckoutDto,
    payment: {
      subscriptionPaymentId: number;
      pharmacyId: number;
      planId: number;
      offerId: number | null;
      status: SubscriptionPaymentStatus;
      amount: Prisma.Decimal;
      currency: string;
      durationMonths: number;
      stripeCheckoutSessionId: string | null;

      plan: {
        planId: number;
        code: string;
        name: string;
      };
    },
  ) {
    /*
     * نفس idempotencyKey لا يجوز استعماله
     * لعملية شراء مختلفة.
     */
    const requestedOfferId = dto.offerId ?? null;

    if (
      payment.pharmacyId !== pharmacyId ||
      payment.planId !== dto.planId ||
      payment.offerId !== requestedOfferId
    ) {
      throw new ConflictException(
        'Idempotency key has already been used for another subscription purchase.',
      );
    }

    if (payment.status === SubscriptionPaymentStatus.SUCCEEDED) {
      throw new ConflictException(
        'This subscription payment has already succeeded.',
      );
    }

    if (payment.status === SubscriptionPaymentStatus.PROCESSING) {
      throw new ConflictException(
        'This subscription payment is currently being processed.',
      );
    }

    if (payment.status === SubscriptionPaymentStatus.EXPIRED) {
      throw new ConflictException(
        'This checkout has expired. Start a new payment with a new idempotency key.',
      );
    }

    if (payment.status === SubscriptionPaymentStatus.FAILED) {
      throw new ConflictException(
        'This payment attempt failed. Start a new payment with a new idempotency key.',
      );
    }
    /*
     * إذا Stripe Session موجودة بالفعل،
     * نسترجعها بدلاً من إنشاء واحدة ثانية.
     */
    if (payment.stripeCheckoutSessionId) {
      const session = await this.stripeService.retrieveCheckoutSession(
        payment.stripeCheckoutSessionId,
      );

      //   if (session.status === 'expired') {
      //     await this.prisma.subscriptionPayment.update({
      //       where: {
      //         subscriptionPaymentId: payment.subscriptionPaymentId,
      //       },

      //       data: {
      //         status: SubscriptionPaymentStatus.EXPIRED,
      //       },
      //     });

      //     throw new ConflictException(
      //       'This checkout has expired. Start a new payment with a new idempotency key.',
      //     );
      //   }
      if (session.status === 'expired') {
        await this.prisma.subscriptionPayment.update({
          where: {
            subscriptionPaymentId: payment.subscriptionPaymentId,
          },

          data: {
            status: SubscriptionPaymentStatus.EXPIRED,

            pharmacyOfferGrantId: null,
          },
        });

        throw new ConflictException(
          'This checkout has expired. Start a new payment with a new idempotency key.',
        );
      }

      /*
       * Stripe Session URL تكون موجودة
       * عندما تكون Session ما زالت active.
       */
      if (session.url) {
        return {
          subscriptionPaymentId: payment.subscriptionPaymentId,

          status: payment.status,

          amount: decimalToNumber(payment.amount),

          currency: payment.currency,

          checkoutUrl: session.url,
        };
      }

      throw new ConflictException(
        'Stripe checkout session is no longer available.',
      );
    }

    /*
     * حالة مهمة:
     *
     * سجل الدفع موجود ولكن Stripe Session
     * لم يتم حفظها، مثلاً بسبب خطأ شبكة.
     *
     * نعيد نفس Stripe request
     * باستخدام نفس idempotency key الخاص بالدفع.
     */
    return this.createStripeSession(payment, payment.plan);
  }

  private async createStripeSession(
    payment: {
      subscriptionPaymentId: number;

      pharmacyId: number;
      planId: number;
      offerId: number | null;

      amount: Prisma.Decimal;
      currency: string;

      durationMonths: number;

      status: SubscriptionPaymentStatus;

      stripeCheckoutSessionId: string | null;
    },

    plan: {
      code: string;
      name: string;
    },
  ) {
    const frontendUrl = this.configService
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/+$/, '');

    /*
     * Stripe تستقبل USD بالسنت.
     *
     * مثال:
     * 10.00 USD => 1000
     */
    const stripeAmount = payment.amount.mul(100);

    if (!stripeAmount.isInteger()) {
      throw new BadRequestException(
        'Subscription amount has more than two decimal places.',
      );
    }

    const unitAmount = stripeAmount.toNumber();

    if (!Number.isSafeInteger(unitAmount) || unitAmount <= 0) {
      throw new BadRequestException('Invalid Stripe payment amount.');
    }

    try {
      const session = await this.stripeService.createCheckoutSession(
        {
          mode: 'payment',

          payment_method_types: ['card'],

          client_reference_id: payment.subscriptionPaymentId.toString(),

          metadata: {
            subscriptionPaymentId: payment.subscriptionPaymentId.toString(),

            pharmacyId: payment.pharmacyId.toString(),

            planId: payment.planId.toString(),

            offerId: payment.offerId?.toString() ?? '',
          },

          line_items: [
            {
              quantity: 1,

              price_data: {
                currency: payment.currency.toLowerCase(),

                unit_amount: unitAmount,

                product_data: {
                  name: `MediXa - ${plan.name}`,

                  description: `${payment.durationMonths} month subscription`,
                },
              },
            },
          ],

          //   success_url:
          //     `${frontendUrl}/subscription/payment/success` +
          //     `?paymentId=${payment.subscriptionPaymentId}` +
          //     `&session_id={CHECKOUT_SESSION_ID}`,

          //   cancel_url:
          //     `${frontendUrl}/subscription/payment/cancel` +
          //     `?paymentId=${payment.subscriptionPaymentId}`,

          success_url:
            `${frontendUrl}/subscription/payment/result` +
            `?paymentId=${payment.subscriptionPaymentId}` +
            `&source=success`,

          cancel_url:
            `${frontendUrl}/subscription/payment/result` +
            `?paymentId=${payment.subscriptionPaymentId}` +
            `&source=cancel`,
        },

        /*
         * Idempotency على Stripe أيضاً.
         *
         * حتى لو تعطل الاتصال بعد إنشاء Session،
         * إعادة نفس الطلب لا تنشئ Session ثانية.
         */
        `subscription-payment-${payment.subscriptionPaymentId}`,
      );

      if (!session.url) {
        throw new BadGatewayException('Stripe did not return a checkout URL.');
      }

      await this.prisma.subscriptionPayment.update({
        where: {
          subscriptionPaymentId: payment.subscriptionPaymentId,
        },

        data: {
          stripeCheckoutSessionId: session.id,

          status: SubscriptionPaymentStatus.PENDING,
        },
      });

      return {
        subscriptionPaymentId: payment.subscriptionPaymentId,

        status: SubscriptionPaymentStatus.PENDING,

        amount: decimalToNumber(payment.amount),

        currency: payment.currency,

        checkoutUrl: session.url,
      };
    } catch (error) {
      this.logger.error(
        'Failed to create Stripe Checkout Session.',
        error instanceof Error ? error.stack : undefined,
      );

      /*
       * نبقي السجل لأغراض التتبع.
       *
       * وإذا أعيد نفس idempotencyKey
       * وكان sessionId ما زال null،
       * سنحاول إنشاء Session من جديد.
       */
      await this.prisma.subscriptionPayment.updateMany({
        where: {
          subscriptionPaymentId: payment.subscriptionPaymentId,

          stripeCheckoutSessionId: null,
        },

        data: {
          status: SubscriptionPaymentStatus.FAILED,

          pharmacyOfferGrantId: null,
        },
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadGatewayException(
        'Unable to create Stripe Checkout session.',
      );
    }
  }
}
