import { Type } from 'class-transformer';

import { IsDateString, IsInt, Max, Min } from 'class-validator';

export class GetInvoiceActivitiesQueryDto {
  /**
   * Example: 2026-08-07
   */
  @IsDateString(
    {
      strict: true,
    },
    {
      message: 'date must use YYYY-MM-DD format',
    },
  )
  date: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
