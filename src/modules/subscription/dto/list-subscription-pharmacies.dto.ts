import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListSubscriptionPharmaciesDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim() || undefined
      : value,
  )
  @IsString()
  @MaxLength(255)
  search?: string;
}