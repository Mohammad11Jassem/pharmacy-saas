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
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsScheduler } from './scheduler/analytics.scheduler';
import { AnalyticsProcessor } from './jobs/analytics.processor';
import { AnalyticsEtlService } from './etl/analytics.etl.service';
import { DimensionLoader } from './etl/dimension.loader';
import { FactLoader } from './etl/fact.loader';

@Module({
  imports: [

    BullModule.registerQueue({
      name: 'analytics',
    }),
  ],
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
    AnalyticsScheduler,

    AnalyticsProcessor,

    AnalyticsEtlService,

    DimensionLoader,

    FactLoader,
  ],

  exports: [HistoricalAnalyticsService],
})
export class AnalyticsModule {}
