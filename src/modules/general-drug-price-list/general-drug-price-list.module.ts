import { Module } from '@nestjs/common';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeneralDrugPriceListController } from './general-drug-price-list.controller';
import { GeneralDrugPriceListService } from './general-drug-price-list.service';

@Module({
  imports: [PrismaModule],
  controllers: [GeneralDrugPriceListController],
  providers: [GeneralDrugPriceListService, UnitOfWork],
})
export class GeneralDrugPriceListModule {}
