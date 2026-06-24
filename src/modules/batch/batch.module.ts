import { Module } from '@nestjs/common';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { ListAvailableBatchesUseCase } from '../pharmacy-drug/use-cases/list-available-batches.usecase';

@Module({
  exports: [BatchService],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
