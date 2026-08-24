import { Module } from '@nestjs/common';
import { CodeGenerationModule } from '../../common/code-generation/code-generation.module';
import { PharmacyOwnersController } from './pharmacy-owners.controller';
import { PharmacyOwnersService } from './pharmacy-owners.service';
import { SmsModule } from '../../common/integrations/sms/sms.module';

@Module({
  imports: [CodeGenerationModule,SmsModule],
  controllers: [PharmacyOwnersController],
  providers: [PharmacyOwnersService],
  exports: [PharmacyOwnersService],
})
export class PharmacyOwnersModule {}