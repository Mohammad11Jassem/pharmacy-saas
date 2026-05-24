import { Module } from '@nestjs/common';
import { PharmacyDocumentTypesService } from './pharmacy-document-types.service';
import { PharmacyDocumentTypesController } from './pharmacy-document-types.controller';

@Module({
  controllers: [PharmacyDocumentTypesController],
  providers: [PharmacyDocumentTypesService],
})
export class PharmacyDocumentTypesModule {}
