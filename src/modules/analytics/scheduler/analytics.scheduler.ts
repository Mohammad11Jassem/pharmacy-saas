import { Injectable, Logger } from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';

import { InjectQueue } from '@nestjs/bullmq';

import { Queue } from 'bullmq';

@Injectable()
export class AnalyticsScheduler {
  private readonly logger = new Logger(AnalyticsScheduler.name);

  constructor(
    @InjectQueue('analytics')
    private readonly analyticsQueue: Queue,
  ) {}

  /**
   * تشغيل ETL يومياً الساعة 2 صباحاً.
   *
   * Scheduler
   *    ↓
   * Queue
   *    ↓
   * Job
   *    ↓
   * Processor
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    /*
     * حتى يعمل الساعة 2 صباحاً
     */
    timeZone: 'Asia/Damascus',
  })
  async run() {
    this.logger.log('Adding Analytics ETL job to queue...');
    console.log('Adding Analytics ETL job to queue...');
    await this.analyticsQueue.add(
      'load-warehouse',

      {},

      {
        /*
         * إذا حدث خطأ، حاول 3 مرات.
         */
        attempts: 3,

        /*
         * التأخير بين المحاولات.
         */
        backoff: {
          type: 'exponential',
          delay: 5000,
        },

        /*
         * الاحتفاظ بعدد صغير من
         * الـ Jobs المكتملة للمراقبة.
         */
        removeOnComplete: {
          count: 20,
        },

        /*
         * الاحتفاظ بالـ failed jobs
         * حتى نستطيع معرفة سبب الخطأ.
         */
        removeOnFail: {
          count: 50,
        },
      },
    );
  }
}
