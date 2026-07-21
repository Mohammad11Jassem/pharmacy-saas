import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class GetPharmacyDrugBatchesQueryDto extends PaginationQueryDto {
  /**
   * أقل تاريخ انتهاء مطلوب.
   * يقبل الصيغة: YYYY-MM-DD
   */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fromDate must be in YYYY-MM-DD format',
  })
  @IsDateString({ strict: true })
  fromDate?: string;

  /**
   * أعلى تاريخ انتهاء مطلوب.
   * يقبل الصيغة: YYYY-MM-DD
   */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'toDate must be in YYYY-MM-DD format',
  })
  @IsDateString({ strict: true })
  toDate?: string;

  /**
   * فلترة الدفعات بحسب المورد.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;
}