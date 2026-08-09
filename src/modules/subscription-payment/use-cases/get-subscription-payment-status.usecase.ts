import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class GetSubscriptionPaymentStatusUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    pharmacyId: number,
    subscriptionPaymentId: number,
  ) {
    const payment =
      await this.prisma.subscriptionPayment.findFirst({
        where: {
          subscriptionPaymentId,
          pharmacyId,
        },

        select: {
          subscriptionPaymentId: true,

          status: true,

          amount: true,
          currency: true,

          paidAt: true,

          pharmacySubscriptionId: true,

          pharmacySubscription: {
            select: {
              pharmacySubscriptionId: true,
              status: true,
              startsAt: true,
              endsAt: true,
            },
          },
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Subscription payment not found.',
      );
    }

    return {
      subscriptionPaymentId:
        payment.subscriptionPaymentId,

      status:
        payment.status,

      amount:
        Number(payment.amount),

      currency:
        payment.currency,

      paidAt:
        payment.paidAt,

      pharmacySubscriptionId:
        payment.pharmacySubscriptionId,

      subscription:
        payment.pharmacySubscription,
    };
  }
}