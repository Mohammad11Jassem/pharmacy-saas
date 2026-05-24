import { Module } from '@nestjs/common';
import { PharmacyDocumentsService } from './pharmacy-documents.service';
import { PharmacyDocumentsController } from './pharmacy-documents.controller';

@Module({
  controllers: [PharmacyDocumentsController],
  providers: [PharmacyDocumentsService],
})
export class PharmacyDocumentsModule {}
