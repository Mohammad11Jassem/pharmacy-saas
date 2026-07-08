import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class SearchMyPharmacyDrugsByNameDto extends PaginationQueryDto {
  // Remove extra spaces from the drug name
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}