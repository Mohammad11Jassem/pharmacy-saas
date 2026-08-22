import { Logger } from '@nestjs/common';

import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { AnalyticsEtlService } from '../etl/analytics.etl.service';

@Processor('analytics')
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private readonly analyticsEtlService: AnalyticsEtlService) {
    super();
  }

  /**
   * BullMQ يستدعي هذا التابع
   * عندما يصل Job إلى Queue.
   */
  async process(job: Job) {
    this.logger.log(`Received analytics job: ${job.name}`);

    switch (job.name) {
      case 'load-warehouse':
        /*
         * تنفيذ ETL.
         */
        await this.analyticsEtlService.execute();

        break;

      default:
        throw new Error(`Unknown analytics job: ${job.name}`);
    }
  }
}
