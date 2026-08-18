import { Injectable, Logger } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';

import { Cron } from '@nestjs/schedule';

import { Queue } from 'bullmq';
import { BATCH_MAINTENANCE_QUEUE, EXPIRE_BATCHES_JOB, ExpireBatchesJobData } from '../queue/batch.queue';



@Injectable()
export class BatchScheduler {
  private readonly logger = new Logger(BatchScheduler.name);

  private static readonly TIME_ZONE = 'Asia/Damascus';

  constructor(
    @InjectQueue(BATCH_MAINTENANCE_QUEUE)
    private readonly batchQueue: Queue<ExpireBatchesJobData>,
  ) {}

  /**
   * كل يوم الساعة 00:05 بتوقيت دمشق.
   *
   * الصيغة:
   *
   * second minute hour day month weekday
   *
   * 0 5 0 * * *
   */
  @Cron('0 0 3 * * *', {
    name: 'expire-batches-scheduler',

    timeZone: BatchScheduler.TIME_ZONE,

    /**
     * يمنع تداخل execution لنفس Cron
     * إذا استغرق enqueue وقتاً غير متوقع.
     */
    waitForCompletion: true,
  })
  async enqueueExpireBatchesJob(): Promise<void> {
    const cutoffDate = this.getCurrentDateInTimeZone(BatchScheduler.TIME_ZONE);

    /**
     * نستخدم التاريخ داخل jobId.
     *
     * إذا كان لديك أكثر من instance للـ Backend
     * وحاول الاثنان إضافة Job لنفس اليوم،
     * نفس jobId يمنع تكرارها.
     */
    const jobId = `expire-batches-${cutoffDate}`;

    const job = await this.batchQueue.add(
      EXPIRE_BATCHES_JOB,

      {
        cutoffDate,
      },

      {
        jobId,

        /**
         * إذا حدث خطأ مؤقت في DB
         * BullMQ سيعيد المحاولة.
         */
        attempts: 3,

        backoff: {
          type: 'exponential',
          delay: 5000,
        },

        /**
         * نبقي الـ completed job لبعض الوقت
         * حتى يبقى jobId موجوداً ويمنع التكرار.
         */
        removeOnComplete: {
          age: 60 * 60 * 48,
          count: 100,
        },

        removeOnFail: {
          age: 60 * 60 * 24 * 7,
          count: 100,
        },
      },
    );

    this.logger.log(
      `Expire-batches job queued. jobId=${job.id}, cutoffDate=${cutoffDate}`,
    );
  }

  /**
   * يرجع التاريخ الحالي بالشكل:
   *
   * YYYY-MM-DD
   *
   * وفق timezone محددة، بغض النظر
   * عن timezone الخاصة بالسيرفر.
   */
  private getCurrentDateInTimeZone(timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,

      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value;

    const month = parts.find((part) => part.type === 'month')?.value;

    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Could not resolve current date.');
    }

    return `${year}-${month}-${day}`;
  }
}
