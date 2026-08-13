import { Controller, Get, Query } from '@nestjs/common';

import { AccountType } from '../../../generated/prisma/enums';

import { Auth } from '../../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../../iam/authentication/enums/auth-type.enum';

import { Roles } from '../../../iam/authorization/decorators/roles.decorator';

import { ActiveUser } from '../../../iam/decorators/active-user.decorator';

import { DrugPerformanceQueryDto } from '../dto/drug-performance-query.dto';

import { HistoricalDaysQueryDto } from '../dto/historical-days-query.dto';

import { SalesPeriodQueryDto } from '../dto/sales-period-query.dto';

import { HistoricalAnalyticsService } from '../services/historical-analytics.service';

@Auth(AuthType.Bearer)
@Roles(AccountType.PHARMACY_OWNER)
@Controller('analytics/historical')
export class HistoricalAnalyticsController {
  constructor(
    private readonly historicalAnalyticsService: HistoricalAnalyticsService,
  ) {}

  @Get('invoice-activity')
  getInvoiceActivity(
    @ActiveUser('sub')
    ownerUserId: number,

    @Query()
    query: HistoricalDaysQueryDto,
  ) {
    return this.historicalAnalyticsService.getInvoiceActivity(
      ownerUserId,
      query.pharmacy_id,
      query,
    );
  }

  @Get('expired-drugs')
  getExpiredDrugs(
    @ActiveUser('sub')
    ownerUserId: number,

    @Query()
    query: HistoricalDaysQueryDto,
  ) {
    return this.historicalAnalyticsService.getExpiredDrugs(
      ownerUserId,
      query.pharmacy_id,
      query,
    );
  }

  @Get('stagnant-drugs')
  getStagnantDrugs(
    @ActiveUser('sub')
    ownerUserId: number,

    @Query()
    query: HistoricalDaysQueryDto,
  ) {
    return this.historicalAnalyticsService.getStagnantDrugs(
      ownerUserId,
      query.pharmacy_id,
      query,
    );
  }

  @Get('drug-performance')
  getDrugPerformance(
    @ActiveUser('sub')
    ownerUserId: number,

    @Query()
    query: DrugPerformanceQueryDto,
  ) {
    return this.historicalAnalyticsService.getDrugPerformance(
      ownerUserId,
      query.pharmacy_id,
      query,
    );
  }

  @Get('sales-trend')
  getSalesTrend(
    @ActiveUser('sub')
    ownerUserId: number,

    @Query()
    query: SalesPeriodQueryDto,
  ) {
    return this.historicalAnalyticsService.getSalesTrend(
      ownerUserId,
      query.pharmacy_id,
      query,
    );
  }

  @Get('sales-summary')
  getSalesSummary(
    @ActiveUser('sub')
    ownerUserId: number,

    @Query()
    query: SalesPeriodQueryDto,
  ) {
    return this.historicalAnalyticsService.getSalesSummary(
      ownerUserId,
      query.pharmacy_id,
      query,
    );
  }
}
