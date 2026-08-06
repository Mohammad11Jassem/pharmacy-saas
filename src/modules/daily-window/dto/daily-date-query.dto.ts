import { Matches } from 'class-validator';

export class DailyDateQueryDto {
  /**
   * Example: 2026-08-06
   */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message:
      'date must use YYYY-MM-DD format',
  })
  date: string;
}