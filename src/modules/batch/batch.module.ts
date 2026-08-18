import { Module } from '@nestjs/common';

import { BullModule } from '@nestjs/bullmq';

import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';



import { ExpireBatchesUseCase } from './use-cases/expire-batches.usecase';
import { BATCH_MAINTENANCE_QUEUE } from './queue/batch.queue';
import { BatchScheduler } from './scheduler/batch.scheduler';
import { BatchProcessor } from './processor/batch.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BATCH_MAINTENANCE_QUEUE,
    }),
  ],

  controllers: [BatchController],

  providers: [
    BatchService,

    // Scheduler -> creates job
    BatchScheduler,

    // Worker -> consumes job
    BatchProcessor,

    // Business operation
    ExpireBatchesUseCase,
  ],

  exports: [BatchService],
})
export class BatchModule {}
