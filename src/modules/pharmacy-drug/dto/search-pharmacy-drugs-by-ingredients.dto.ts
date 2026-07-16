import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class SearchPharmacyDrugsByIngredientsDto extends PaginationQueryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  ingredientIds!: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dosageFormId?: number;

  @IsOptional()
  @IsBoolean()
  availableOnly = true;
}
