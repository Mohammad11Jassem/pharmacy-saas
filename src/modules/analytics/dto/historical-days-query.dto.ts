import { Type } from 'class-transformer';

import { IsInt, Max, Min } from 'class-validator';

export class HistoricalDaysQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pharmacy_id: number;

  /**
   * Number of calendar days to analyze.
   *
   * Example:
   * 30 -> today + previous 29 days.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days: number;
}
