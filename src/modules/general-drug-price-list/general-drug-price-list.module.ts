import { Module } from '@nestjs/common';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeneralDrugPriceListController } from './general-drug-price-list.controller';
import { GeneralDrugPriceListService } from './general-drug-price-list.service';
import { NotificationModule } from '../../notification/notification.module';

@Module({
  imports: [PrismaModule,NotificationModule],
  controllers: [GeneralDrugPriceListController],
  providers: [GeneralDrugPriceListService, UnitOfWork],
})
export class GeneralDrugPriceListModule {}
