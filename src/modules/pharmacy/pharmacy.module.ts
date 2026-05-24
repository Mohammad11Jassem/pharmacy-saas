import { Module } from '@nestjs/common';
import { CodeGenerationModule } from '../../common/code-generation/code-generation.module';
import { PharmacyOwnersModule } from '../pharmacy-owners/pharmacy-owners.module';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { PharmacyAccountResponseMapper } from './mappers/pharmacy-account-response.mapper';
import { PharmacyCredentialsModule } from '../pharmacy-credentials/pharmacy-credentials.module';

@Module({
  imports: [CodeGenerationModule, PharmacyOwnersModule , PharmacyCredentialsModule] ,
  controllers: [PharmacyController],
  providers: [PharmacyService ,PharmacyAccountResponseMapper],
})
export class PharmacyModule {}