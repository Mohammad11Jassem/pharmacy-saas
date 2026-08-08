import { Controller, Get, Query } from '@nestjs/common';

import { HistoricalAnalyticsService } from '../services/historical-analytics.service';

import { HistoricalDaysQueryDto } from '../dto/historical-days-query.dto';

import { DrugPerformanceQueryDto } from '../dto/drug-performance-query.dto';
import { ActiveUser } from '../../../iam/decorators/active-user.decorator';
import { Auth } from '../../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../../iam/authentication/enums/auth-type.enum';
import { Roles } from '../../../iam/authorization/decorators/roles.decorator';
import { AccountType } from '../../../generated/prisma/enums';
import { SalesPeriodQueryDto } from '../dto/sales-period-query.dto';

@Auth(AuthType.Bearer)
@Roles(AccountType.PHARMACY)
@Controller('analytics/historical')
export class HistoricalAnalyticsController {
  constructor(
    private readonly historicalAnalyticsService: HistoricalAnalyticsService,
  ) {}

  /**
   * Returns counts for:
   * SALE, RETURN, DAMAGE and SUPPLIER invoices.
   */
  @Get('invoice-activity')
  getInvoiceActivity(
    @ActiveUser('sub')
    pharmacyId: number,

    @Query()
    query: HistoricalDaysQueryDto,
  ) {
    return this.historicalAnalyticsService.getInvoiceActivity(
      pharmacyId,
      query,
    );
  }

  /**
   * Returns expired batches that still
   * have available stock.
   */
  @Get('expired-drugs')
  getExpiredDrugs(
    @ActiveUser('sub')
    pharmacyId: number,

    @Query()
    query: HistoricalDaysQueryDto,
  ) {
    return this.historicalAnalyticsService.getExpiredDrugs(pharmacyId, query);
  }

  /**
   * Returns drugs with no sales
   * during the selected period.
   */
  @Get('stagnant-drugs')
  getStagnantDrugs(
    @ActiveUser('sub')
    pharmacyId: number,

    @Query()
    query: HistoricalDaysQueryDto,
  ) {
    return this.historicalAnalyticsService.getStagnantDrugs(pharmacyId, query);
  }

  /**
   * Returns top-selling and
   * least-selling drugs.
   */
  @Get('drug-performance')
  getDrugPerformance(
    @ActiveUser('sub')
    pharmacyId: number,

    @Query()
    query: DrugPerformanceQueryDto,
  ) {
    return this.historicalAnalyticsService.getDrugPerformance(
      pharmacyId,
      query,
    );
  }

  /**
   * Returns gross sales data for the chart.
   *
   * Supports:
   * YEAR -> MONTH
   * MONTH -> WEEK
   * WEEK -> DAY
   */
  @Get('sales-trend')
  getSalesTrend(
    @ActiveUser('sub')
    pharmacyId: number,

    @Query()
    query: SalesPeriodQueryDto,
  ) {
    return this.historicalAnalyticsService.getSalesTrend(pharmacyId, query);
  }

  /**
   * Returns sales summary for the selected period.
   */
  @Get('sales-summary')
  getSalesSummary(
    @ActiveUser('sub')
    pharmacyId: number,

    @Query()
    query: SalesPeriodQueryDto,
  ) {
    return this.historicalAnalyticsService.getSalesSummary(pharmacyId, query);
  }
}
