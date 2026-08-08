import { IsDateString, IsEnum } from 'class-validator';

import { AnalyticsLevel } from '../enums/analytics-level.enum';

export class SalesPeriodQueryDto {
  /**
   * Reference date selected by the frontend.
   *
   * Example:
   * 2026-08-10
   */
  @IsDateString()
  date: string;

  /**
   * Selected analytics level.
   *
   * DAY   -> one day
   * WEEK  -> week-of-month
   * MONTH -> one month
   * YEAR  -> one year
   */
  @IsEnum(AnalyticsLevel)
  level: AnalyticsLevel;
}
