import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { PharmacySubscriptionStatus } from '../../../generated/prisma/enums';

@Injectable()
export class SubscriptionStatusScheduler {
  private readonly logger = new Logger(SubscriptionStatusScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'subscription-status-sync',
  })
  async syncSubscriptionStatuses(): Promise<void> {
    const now = new Date();
    console.log(`[${now.toISOString()}] Running subscription status sync...`);
    // SCHEDULED -> ACTIVE
    const activated = await this.prisma.pharmacySubscription.updateMany({
      where: {
        status: PharmacySubscriptionStatus.SCHEDULED,

        startsAt: {
          lte: now,
        },

        endsAt: {
          gt: now,
        },
      },

      data: {
        status: PharmacySubscriptionStatus.ACTIVE,
      },
    });

    
    // ACTIVE/SCHEDULED -> EXPIRED
    const expired = await this.prisma.pharmacySubscription.updateMany({
      where: {
        status: {
          in: [
            PharmacySubscriptionStatus.ACTIVE,
            PharmacySubscriptionStatus.SCHEDULED,
          ],
        },

        endsAt: {
          lte: now,
        },
      },

      data: {
        status: PharmacySubscriptionStatus.EXPIRED,
      },
    });

    if (activated.count > 0 || expired.count > 0) {
      this.logger.log(
        `Subscription statuses synchronized: activated=${activated.count}, expired=${expired.count}`,
      );
    }
  }
}
