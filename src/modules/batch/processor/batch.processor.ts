import { Logger } from '@nestjs/common';

import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';
import { BATCH_MAINTENANCE_QUEUE, EXPIRE_BATCHES_JOB, ExpireBatchesJobData } from '../queue/batch.queue';
import { ExpireBatchesUseCase } from '../use-cases/expire-batches.usecase';



@Processor(BATCH_MAINTENANCE_QUEUE)
export class BatchProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchProcessor.name);

  constructor(private readonly expireBatchesUseCase: ExpireBatchesUseCase) {
    super();
  }

  async process(job: Job<ExpireBatchesJobData>) {
    this.logger.log(`Processing batch job: ${job.name} jobId=${job.id}`);

    switch (job.name) {
      case EXPIRE_BATCHES_JOB:
        return this.expireBatchesUseCase.execute(job.data.cutoffDate);

      default:
        throw new Error(`Unsupported batch job: ${job.name}`);
    }
  }
}
