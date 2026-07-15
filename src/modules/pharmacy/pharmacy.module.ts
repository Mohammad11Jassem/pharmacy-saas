import { Module } from '@nestjs/common';
import { CodeGenerationModule } from '../../common/code-generation/code-generation.module';
import { PharmacyOwnersModule } from '../pharmacy-owners/pharmacy-owners.module';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { PharmacyAccountResponseMapper } from './mappers/pharmacy-account-response.mapper';
import { PharmacyCredentialsModule } from '../pharmacy-credentials/pharmacy-credentials.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    CodeGenerationModule,
    PharmacyOwnersModule,
    PharmacyCredentialsModule,
    SubscriptionModule,
  ],
  controllers: [PharmacyController],
  providers: [PharmacyService, PharmacyAccountResponseMapper],
})
export class PharmacyModule {}
