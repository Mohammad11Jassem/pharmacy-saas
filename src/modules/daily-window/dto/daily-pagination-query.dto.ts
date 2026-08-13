import { Type } from 'class-transformer';

import { IsInt, Max, Min } from 'class-validator';

import { DailyDateQueryDto } from './daily-date-query.dto';

export class DailyAlertsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pharmacy_id: number;

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

export class DailyActivitiesQueryDto extends DailyDateQueryDto {
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
