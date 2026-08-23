import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { PharmacySubscriptionStatus } from '../../../generated/prisma/enums';
import {
  addCalendarDays,
  getSubscriptionToday,
  SUBSCRIPTION_BUSINESS_TIME_ZONE,
} from '../helpers/subscription-date.helper';

@Injectable()
export class SubscriptionStatusScheduler implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionStatusScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Repair/synchronize statuses immediately after backend startup too.
   * This covers a server that was offline at midnight.
   */
  async onModuleInit(): Promise<void> {
    await this.syncSubscriptionStatuses();
  }

  /**
   * Runs at midnight of the BUSINESS timezone, never server timezone.
   * All state transitions are CALENDAR-DATE based.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'subscription-status-sync',
    timeZone: SUBSCRIPTION_BUSINESS_TIME_ZONE,
  })
  async syncSubscriptionStatuses(): Promise<void> {
    const today = getSubscriptionToday();
    const tomorrow = addCalendarDays(today, 1);

    /*
     * Synchronize all derived statuses atomically.
     * CANCELLED is the only manual terminal state and is never overwritten.
     */
    const [activated, expired, scheduled] = await this.prisma.$transaction([
      /*
       * ACTIVE date rule:
       *   startsAt DATE <= today < endsAt DATE
       */
      this.prisma.pharmacySubscription.updateMany({
        where: {
          status: {
            in: [
              PharmacySubscriptionStatus.SCHEDULED,
              PharmacySubscriptionStatus.EXPIRED,
            ],
          },
          startsAt: {
            lt: tomorrow,
          },
          endsAt: {
            gte: tomorrow,
          },
        },
        data: {
          status: PharmacySubscriptionStatus.ACTIVE,
        },
      }),

      /*
       * EXPIRED date rule:
       *   endsAt DATE <= today
       * The end date is exclusive for subscriptions.
       */
      this.prisma.pharmacySubscription.updateMany({
        where: {
          status: {
            in: [
              PharmacySubscriptionStatus.ACTIVE,
              PharmacySubscriptionStatus.SCHEDULED,
            ],
          },
          endsAt: {
            lt: tomorrow,
          },
        },
        data: {
          status: PharmacySubscriptionStatus.EXPIRED,
        },
      }),

      /*
       * SCHEDULED date rule:
       *   startsAt DATE > today
       */
      this.prisma.pharmacySubscription.updateMany({
        where: {
          status: {
            in: [
              PharmacySubscriptionStatus.ACTIVE,
              PharmacySubscriptionStatus.EXPIRED,
            ],
          },
          startsAt: {
            gte: tomorrow,
          },
        },
        data: {
          status: PharmacySubscriptionStatus.SCHEDULED,
        },
      }),
    ]);

    this.logger.log(
      `Subscription status sync for ${today.toISOString().slice(0, 10)}: ` +
        `active=${activated.count}, expired=${expired.count}, scheduled=${scheduled.count}`,
    );
  }
}
