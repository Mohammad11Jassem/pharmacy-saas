import { Module } from '@nestjs/common';

import { HistoricalAnalyticsController } from './controllers/historical-analytics.controller';

import { HistoricalAnalyticsService } from './services/historical-analytics.service';

import { ResolveAnalyticsPharmacyUseCase } from './use-cases/resolve-analytics-pharmacy.use-case';

import { GetInvoiceActivityUseCase } from './use-cases/get-invoice-activity.use-case';

import { GetExpiredDrugsUseCase } from './use-cases/get-expired-drugs.use-case';


import { GetDrugPerformanceUseCase } from './use-cases/get-drug-performance.use-case';
import { GetSalesTrendUseCase } from './use-cases/get-sales-trend.use-case';
import { GetSalesSummaryUseCase } from './use-cases/get-sales-summary.use-case';
import { GetStagnantDrugsUseCase } from './use-cases/get-stagnant-drugs.use-case';
import { EnsureOwnerPharmacyAccessUseCase } from '../../common/use-cases/ensure-owner-pharmacy-access.use-case';

@Module({
  controllers: [HistoricalAnalyticsController],

  providers: [
    HistoricalAnalyticsService,
    EnsureOwnerPharmacyAccessUseCase,
    ResolveAnalyticsPharmacyUseCase,

    GetInvoiceActivityUseCase,
    GetExpiredDrugsUseCase,
    GetStagnantDrugsUseCase,
    GetDrugPerformanceUseCase,
    GetSalesTrendUseCase,
    GetSalesSummaryUseCase,
  ],

  exports: [HistoricalAnalyticsService],
})
export class AnalyticsModule {}
