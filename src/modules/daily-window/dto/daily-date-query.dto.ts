import { Type } from 'class-transformer';

import { IsInt, Matches, Min } from 'class-validator';

export class DailyDateQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pharmacy_id: number;

  /**
   * Example: 2026-08-06
   */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must use YYYY-MM-DD format',
  })
  date: string;
}
