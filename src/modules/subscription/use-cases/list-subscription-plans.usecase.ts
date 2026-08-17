import { Injectable } from '@nestjs/common';
import { SubscriptionPlanStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { decimalToNumber } from '../helpers/subscription-pricing.helper';

@Injectable()
export class ListSubscriptionPlansUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        status: SubscriptionPlanStatus.ACTIVE,
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
      },
    });

    return plans.map((plan) => ({
      planId: plan.planId,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      durationMonths: plan.durationMonths,
      planPrice: decimalToNumber(plan.planPrice),
      currency: plan.currency,
      type: plan.type,
    }));
  }
}
