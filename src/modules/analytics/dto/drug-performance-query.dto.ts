import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { HistoricalDaysQueryDto } from './historical-days-query.dto';

export class DrugPerformanceQueryDto
  extends HistoricalDaysQueryDto {

  /**
   * Number of drugs returned
   * in each performance group.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 3;
}