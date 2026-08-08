import { Injectable } from '@nestjs/common';

import { HistoricalDaysQueryDto } from '../dto/historical-days-query.dto';

import { DrugPerformanceQueryDto } from '../dto/drug-performance-query.dto';

import { ResolveAnalyticsPharmacyUseCase } from '../use-cases/resolve-analytics-pharmacy.use-case';

import { GetInvoiceActivityUseCase } from '../use-cases/get-invoice-activity.use-case';

import { GetExpiredDrugsUseCase } from '../use-cases/get-expired-drugs.use-case';

import { GetDrugPerformanceUseCase } from '../use-cases/get-drug-performance.use-case';
import { GetSalesTrendUseCase } from '../use-cases/get-sales-trend.use-case';
import { GetSalesSummaryUseCase } from '../use-cases/get-sales-summary.use-case';
import { SalesPeriodQueryDto } from '../dto/sales-period-query.dto';
import { resolveAnalyticsPeriod } from '../utils/analytics-period.util';
import { GetStagnantDrugsUseCase } from '../use-cases/get-stagnant-drugs.use-case';

@Injectable()
export class HistoricalAnalyticsService {
  constructor(
    private readonly resolveAnalyticsPharmacy: ResolveAnalyticsPharmacyUseCase,

    private readonly getInvoiceActivityUseCase: GetInvoiceActivityUseCase,

    private readonly getExpiredDrugsUseCase: GetExpiredDrugsUseCase,

    private readonly getStagnantDrugsUseCase: GetStagnantDrugsUseCase,

    private readonly getDrugPerformanceUseCase: GetDrugPerformanceUseCase,
    private readonly getSalesTrendUseCase: GetSalesTrendUseCase,

    private readonly getSalesSummaryUseCase: GetSalesSummaryUseCase,
  ) {}

  async getInvoiceActivity(pharmacyId: number, query: HistoricalDaysQueryDto) {
    const pharmacyKey = await this.resolveAnalyticsPharmacy.execute(pharmacyId);

    return this.getInvoiceActivityUseCase.execute(pharmacyKey, query.days);
  }

  async getExpiredDrugs(pharmacyId: number, query: HistoricalDaysQueryDto) {
    /*
     * This report uses OLTP,
     * so pharmacyKey is not needed.
     */
    return this.getExpiredDrugsUseCase.execute(pharmacyId, query.days);
  }

  async getStagnantDrugs(pharmacyId: number, query: HistoricalDaysQueryDto) {
    const pharmacyKey = await this.resolveAnalyticsPharmacy.execute(pharmacyId);

    return this.getStagnantDrugsUseCase.execute({
      pharmacyId,
      pharmacyKey,

      days: query.days,
    });
  }

  async getDrugPerformance(pharmacyId: number, query: DrugPerformanceQueryDto) {
    const pharmacyKey = await this.resolveAnalyticsPharmacy.execute(pharmacyId);

    return this.getDrugPerformanceUseCase.execute({
      pharmacyId,
      pharmacyKey,

      days: query.days,

      limit: query.limit,
    });
  }

  async getSalesTrend(pharmacyId: number, query: SalesPeriodQueryDto) {
    const pharmacyKey = await this.resolveAnalyticsPharmacy.execute(pharmacyId);

    const period = resolveAnalyticsPeriod(query.date, query.level);

    return this.getSalesTrendUseCase.execute({
      pharmacyKey,

      level: query.level,

      period,
    });
  }

  async getSalesSummary(pharmacyId: number, query: SalesPeriodQueryDto) {
    const pharmacyKey = await this.resolveAnalyticsPharmacy.execute(pharmacyId);

    const period = resolveAnalyticsPeriod(query.date, query.level);

    return this.getSalesSummaryUseCase.execute({
      pharmacyKey,
      period,
    });
  }
}
