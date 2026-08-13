import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import Stripe from 'stripe';

import {
  OfferScope,
  PharmacySubscriptionStatus,
  SubscriptionPaymentStatus,
} from '../../../generated/prisma/enums';

import { PrismaService } from '../../../prisma/prisma.service';

import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';

import { addCalendarMonths } from '../../subscription/helpers/subscription-pricing.helper';

import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class HandleStripeWebhookUseCase {
  constructor(
    private readonly prisma: PrismaService,

    private readonly unitOfWork: UnitOfWork,

    private readonly stripeService: StripeService,
  ) {}

  async execute(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        return this.handleCompletedSession(
          session,
          new Date(event.created * 1000),
        );
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;

        return this.handleExpiredSession(session);
      }

      default:
        return {
          handled: false,
          eventType: event.type,
        };
    }
  }

  private async handleCompletedSession(
    eventSession: Stripe.Checkout.Session,
    paidAt: Date,
  ) {
    /*
     * نعيد جلب الـSession من Stripe.
     *
     * لا نعتمد فقط على البيانات الموجودة
     * داخل الـevent.
     */
    const session = await this.stripeService.retrieveCheckoutSession(
      eventSession.id,
    );

    /*
     * حالياً نحن نستخدم:
     *
     * mode = payment
     * payment_method_types = ['card']
     */
    if (session.mode !== 'payment') {
      throw new BadRequestException('Unexpected Stripe Checkout mode.');
    }

    /*
     * لا ننشئ الاشتراك إلا إذا كان الدفع
     * مؤكداً فعلياً.
     */
    if (session.payment_status !== 'paid') {
      return {
        handled: false,
        reason: 'PAYMENT_NOT_PAID',
      };
    }

    const subscriptionPaymentId = this.extractSubscriptionPaymentId(session);

    /*
     * نحصل على Payment من MediXa.
     */
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: {
        subscriptionPaymentId,
      },

      select: {
        subscriptionPaymentId: true,

        pharmacyId: true,

        planId: true,

        offerId: true,

        pharmacyOfferGrantId: true,

        status: true,

        amount: true,

        currency: true,

        durationMonths: true,

        stripeCheckoutSessionId: true,

        pharmacySubscriptionId: true,

        plan: {
          select: {
            planPrice: true,
          },
        },

        offer: {
          select: {
            offerId: true,

            scope: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Subscription payment not found.');
    }

    /*
     * حماية إضافية:
     *
     * Stripe Session القادمة يجب أن تكون
     * هي نفسها التي خزناها عند إنشاء Checkout.
     */
    if (payment.stripeCheckoutSessionId !== session.id) {
      throw new ConflictException(
        'Stripe Checkout Session does not match the payment record.',
      );
    }

    /*
     * إذا وصل Webhook مرة ثانية بعد نجاح
     * العملية، لا ننشئ اشتراكاً جديداً.
     */
    if (payment.status === SubscriptionPaymentStatus.SUCCEEDED) {
      return {
        handled: true,
        idempotentReplay: true,

        subscriptionPaymentId: payment.subscriptionPaymentId,

        pharmacySubscriptionId: payment.pharmacySubscriptionId,
      };
    }

    /*
     * مقارنة العملة.
     */
    if (session.currency?.toUpperCase() !== payment.currency.toUpperCase()) {
      throw new ConflictException(
        'Stripe payment currency does not match MediXa payment record.',
      );
    }

    /*
     * Stripe ترسل USD بالسنت.
     *
     * 30 USD => 3000
     */
    const expectedAmount = payment.amount.mul(100);

    if (!expectedAmount.isInteger()) {
      throw new ConflictException(
        'Payment amount cannot be represented in Stripe minor units.',
      );
    }

    if (session.amount_total !== expectedAmount.toNumber()) {
      throw new ConflictException(
        'Stripe payment amount does not match MediXa payment record.',
      );
    }

    /*
     * الآن تبدأ العملية الحرجة.
     *
     * Payment + Subscription + Offer
     * يجب أن تنجح كلها أو تفشل كلها.
     */
    return this.unitOfWork.executeSerializable(async (tx) => {
      /*
       * Claim ذري للعملية.
       *
       * يمنع Webhook مكرر من معالجة
       * نفس Payment بالتوازي.
       */
      const claimed = await tx.subscriptionPayment.updateMany({
        where: {
          subscriptionPaymentId: payment.subscriptionPaymentId,

          status: SubscriptionPaymentStatus.PENDING,

          stripeCheckoutSessionId: session.id,
        },

        data: {
          status: SubscriptionPaymentStatus.PROCESSING,
        },
      });

      if (claimed.count !== 1) {
        const current = await tx.subscriptionPayment.findUnique({
          where: {
            subscriptionPaymentId: payment.subscriptionPaymentId,
          },

          select: {
            status: true,

            pharmacySubscriptionId: true,
          },
        });

        if (current?.status === SubscriptionPaymentStatus.SUCCEEDED) {
          return {
            handled: true,
            idempotentReplay: true,

            subscriptionPaymentId: payment.subscriptionPaymentId,

            pharmacySubscriptionId: current.pharmacySubscriptionId,
          };
        }

        throw new ConflictException(
          'Subscription payment cannot be processed in its current state.',
        );
      }

      const now = new Date();

      /*
       * نبحث عن آخر اشتراك ACTIVE أو SCHEDULED.
       *
       * الاشتراك الجديد سيبدأ بعد نهايته.
       */
      const latestSubscription = await tx.pharmacySubscription.findFirst({
        where: {
          pharmacyId: payment.pharmacyId,

          status: {
            in: [
              PharmacySubscriptionStatus.ACTIVE,
              PharmacySubscriptionStatus.SCHEDULED,
            ],
          },

          endsAt: {
            gt: now,
          },
        },

        orderBy: {
          endsAt: 'desc',
        },

        select: {
          endsAt: true,
        },
      });

      /*
       * إذا لا يوجد اشتراك قائم:
       * يبدأ الآن.
       *
       * إذا يوجد:
       * يبدأ بعد آخر اشتراك.
       */
      const startsAt = latestSubscription?.endsAt ?? now;

      const endsAt = addCalendarMonths(startsAt, payment.durationMonths);

      const subscriptionStatus =
        startsAt.getTime() > now.getTime()
          ? PharmacySubscriptionStatus.SCHEDULED
          : PharmacySubscriptionStatus.ACTIVE;

      /*
       * إذا العرض PRIVATE،
       * نستهلك Grant هذه الصيدلية الآن فقط،
       * أي بعد نجاح Stripe.
       */
      //   if (payment.offer && payment.offer.scope === OfferScope.PRIVATE) {
      //     const redeemed = await tx.pharmacyOfferGrant.updateMany({
      //       where: {
      //         pharmacyId: payment.pharmacyId,

      //         offerId: payment.offer.offerId,

      //         redeemedAt: null,
      //       },

      //       data: {
      //         redeemedAt: paidAt,
      //       },
      //     });

      //     if (redeemed.count !== 1) {
      //       throw new ConflictException(
      //         'Private offer has already been redeemed.',
      //       );
      //     }
      //   }
      if (payment.offer && payment.offer.scope === OfferScope.PRIVATE) {
        if (!payment.pharmacyOfferGrantId) {
          throw new ConflictException(
            'Private offer payment does not have a reserved grant.',
          );
        }

        const redeemed = await tx.pharmacyOfferGrant.updateMany({
          where: {
            pharmacyOfferGrantId: payment.pharmacyOfferGrantId,

            pharmacyId: payment.pharmacyId,

            offerId: payment.offerId!,

            redeemedAt: null,
          },

          data: {
            redeemedAt: paidAt,
          },
        });

        if (redeemed.count !== 1) {
          throw new ConflictException(
            'Private offer grant cannot be redeemed.',
          );
        }
      }

      /*
       * إنشاء الاشتراك الحقيقي.
       */
      const subscription = await tx.pharmacySubscription.create({
        data: {
          pharmacyId: payment.pharmacyId,

          planId: payment.planId,

          status: subscriptionStatus,

          startsAt,

          endsAt,

          /*
           * في Schema الحالية لم نخزن
           * baseAmount داخل Payment،
           * لذلك نأخذ السعر الأساسي الحالي
           * للخطة.
           *
           * finalPrice يأتي من Payment
           * لأنه المبلغ الذي دُفع فعلاً.
           */
          basePrice: payment.plan.planPrice,

          finalPrice: payment.amount,

          currency: payment.currency,

          ...(payment.offerId && {
            appliedOffer: {
              create: {
                offerId: payment.offerId,
              },
            },
          }),
        },

        select: {
          pharmacySubscriptionId: true,

          status: true,

          startsAt: true,

          endsAt: true,
        },
      });

      /*
       * إغلاق Payment بنجاح
       * وربطها بالاشتراك الناتج.
       */
      await tx.subscriptionPayment.update({
        where: {
          subscriptionPaymentId: payment.subscriptionPaymentId,
        },

        data: {
          status: SubscriptionPaymentStatus.SUCCEEDED,

          pharmacySubscriptionId: subscription.pharmacySubscriptionId,

          paidAt,
        },
      });

      return {
        handled: true,

        idempotentReplay: false,

        subscriptionPaymentId: payment.subscriptionPaymentId,

        pharmacySubscriptionId: subscription.pharmacySubscriptionId,

        subscriptionStatus: subscription.status,

        startsAt: subscription.startsAt,

        endsAt: subscription.endsAt,
      };
    });
  }

  private async handleExpiredSession(session: Stripe.Checkout.Session) {
    const subscriptionPaymentId = this.extractSubscriptionPaymentId(session);

    await this.prisma.subscriptionPayment.updateMany({
      where: {
        subscriptionPaymentId,

        stripeCheckoutSessionId: session.id,

        status: SubscriptionPaymentStatus.PENDING,
      },

      data: {
        status: SubscriptionPaymentStatus.EXPIRED,
        pharmacyOfferGrantId: null,
      },
    });

    return {
      handled: true,

      subscriptionPaymentId,

      status: SubscriptionPaymentStatus.EXPIRED,
    };
  }

  private extractSubscriptionPaymentId(
    session: Stripe.Checkout.Session,
  ): number {
    const rawId = session.metadata?.subscriptionPaymentId;

    const subscriptionPaymentId = Number(rawId);

    if (
      !Number.isSafeInteger(subscriptionPaymentId) ||
      subscriptionPaymentId <= 0
    ) {
      throw new BadRequestException(
        'Stripe Checkout Session does not contain a valid subscriptionPaymentId.',
      );
    }

    return subscriptionPaymentId;
  }
}
