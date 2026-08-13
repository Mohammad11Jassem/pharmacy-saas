import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { DailyWindowController } from './controllers/daily-window.controller';

import { CurrentInventoryAlertsService } from './services/current-inventory-alerts.service';
import { DailyWindowService } from './services/daily-window.service';

import { GetDailyAlertCountUseCase } from './use-cases/get-daily-alert-count.use-case';
import { GetDailyGrossProfitUseCase } from './use-cases/get-daily-gross-profit.use-case';
import { GetDailyGrossSalesUseCase } from './use-cases/get-daily-gross-sales.use-case';
import { GetDailyInvoiceCountUseCase } from './use-cases/get-daily-invoice-count.use-case';
import { GetIncomingAlertsUseCase } from './use-cases/get-incoming-alerts.use-case';
import { EnsureOwnerPharmacyAccessUseCase } from '../../common/use-cases/ensure-owner-pharmacy-access.use-case';
// import { GetInvoiceActivitiesUseCase } from './use-cases/get-invoice-activities.use-case';

@Module({
  imports: [PrismaModule],

  controllers: [DailyWindowController],

  providers: [
    DailyWindowService,
    EnsureOwnerPharmacyAccessUseCase,
    CurrentInventoryAlertsService,
    GetDailyAlertCountUseCase,
    GetDailyInvoiceCountUseCase,
    GetDailyGrossSalesUseCase,
    GetDailyGrossProfitUseCase,
    GetIncomingAlertsUseCase,
    // GetInvoiceActivitiesUseCase,
  ],
})
export class DailyWindowModule {}
