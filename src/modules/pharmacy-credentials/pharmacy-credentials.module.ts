import { Module } from '@nestjs/common';
import { CodeGenerationModule } from '../../common/code-generation/code-generation.module';
import { PharmacyCredentialsController } from './pharmacy-credentials.controller';
import { PharmacyCredentialsService } from './pharmacy-credentials.service';

@Module({
  imports: [CodeGenerationModule],
  controllers: [PharmacyCredentialsController],
  providers: [PharmacyCredentialsService],
  exports: [PharmacyCredentialsService],
})
export class PharmacyCredentialsModule {}