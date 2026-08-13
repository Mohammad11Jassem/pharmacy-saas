import { Injectable } from '@nestjs/common';

import { EnsureOwnerPharmacyAccessUseCase } from '../../../common/use-cases/ensure-owner-pharmacy-access.use-case';

import { DrugPerformanceQueryDto } from '../dto/drug-performance-query.dto';

import { HistoricalDaysQueryDto } from '../dto/historical-days-query.dto';

import { SalesPeriodQueryDto } from '../dto/sales-period-query.dto';

import { GetDrugPerformanceUseCase } from '../use-cases/get-drug-performance.use-case';

import { GetExpiredDrugsUseCase } from '../use-cases/get-expired-drugs.use-case';

import { GetInvoiceActivityUseCase } from '../use-cases/get-invoice-activity.use-case';

import { GetSalesSummaryUseCase } from '../use-cases/get-sales-summary.use-case';

import { GetSalesTrendUseCase } from '../use-cases/get-sales-trend.use-case';

import { GetStagnantDrugsUseCase } from '../use-cases/get-stagnant-drugs.use-case';

import { ResolveAnalyticsPharmacyUseCase } from '../use-cases/resolve-analytics-pharmacy.use-case';

import { resolveAnalyticsPeriod } from '../utils/analytics-period.util';

@Injectable()
export class HistoricalAnalyticsService {
  constructor(
    private readonly ensureOwnerPharmacyAccess: EnsureOwnerPharmacyAccessUseCase,

    private readonly resolveAnalyticsPharmacy: ResolveAnalyticsPharmacyUseCase,

    private readonly getInvoiceActivityUseCase: GetInvoiceActivityUseCase,

    private readonly getExpiredDrugsUseCase: GetExpiredDrugsUseCase,

    private readonly getStagnantDrugsUseCase: GetStagnantDrugsUseCase,

    private readonly getDrugPerformanceUseCase: GetDrugPerformanceUseCase,

    private readonly getSalesTrendUseCase: GetSalesTrendUseCase,

    private readonly getSalesSummaryUseCase: GetSalesSummaryUseCase,
  ) {}

  async getInvoiceActivity(
    ownerUserId: number,
    pharmacyId: number,
    query: HistoricalDaysQueryDto,
  ) {
    await this.ensureAccess(ownerUserId, pharmacyId);

    const pharmacyKey = await this.resolveAnalyticsPharmacy.execute(pharmacyId);

    return this.getInvoiceActivityUseCase.execute(pharmacyKey, query.days);
  }

  async getExpiredDrugs(
    ownerUserId: number,
    pharmacyId: number,
    query: HistoricalDaysQueryDto,
  ) {
    await this.ensureAccess(ownerUserId, pharmacyId);

    return this.getExpiredDrugsUseCase.execute(pharmacyId, query.days);
  }

  async getStagnantDrugs(
    ownerUserId: number,
    pharmacyId: number,
    query: HistoricalDaysQueryDto,
  ) {
    await this.ensureAccess(ownerUserId, pharmacyId);

    const pharmacyKey = await this.resolveAnalyticsPharmacy.execute(pharmacyId);

    return this.getStagnantDrugsUseCase.execute({
      pharmacyId,
      pharmacyKey,
      days: query.days,
    });
  }

  async getDrugPerformance(
    ownerUserId: number,
    pharmacyId: number,
    query: DrugPerformanceQueryDto,
  ) {
    await this.ensureAccess(ownerUserId, pharmacyId);

    const pharmacyKey = await this.resolveAnalyticsPharmacy.execute(pharmacyId);

    return this.getDrugPerformanceUseCase.execute({
      pharmacyId,
      pharmacyKey,
      days: query.days,
      limit: query.limit,
    });
  }

  async getSalesTrend(
    ownerUserId: number,
    pharmacyId: number,
    query: SalesPeriodQueryDto,
  ) {
    await this.ensureAccess(ownerUserId, pharmacyId);

    const pharmacyKey = await this.resolveAnalyticsPharmacy.execute(pharmacyId);

    const period = resolveAnalyticsPeriod(query.date, query.level);

    return this.getSalesTrendUseCase.execute({
      pharmacyKey,
      level: query.level,
      period,
    });
  }

  async getSalesSummary(
    ownerUserId: number,
    pharmacyId: number,
    query: SalesPeriodQueryDto,
  ) {
    await this.ensureAccess(ownerUserId, pharmacyId);

    const pharmacyKey = await this.resolveAnalyticsPharmacy.execute(pharmacyId);

    const period = resolveAnalyticsPeriod(query.date, query.level);

    return this.getSalesSummaryUseCase.execute({
      pharmacyKey,
      period,
    });
  }

  private ensureAccess(ownerUserId: number, pharmacyId: number) {
    return this.ensureOwnerPharmacyAccess.execute(ownerUserId, pharmacyId);
  }
}
