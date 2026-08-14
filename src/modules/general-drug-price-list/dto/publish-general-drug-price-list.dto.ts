import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';

export class PublishGeneralDrugPriceListItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  generalDrugId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  netPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  consumerPrice?: number;
}

export class PublishGeneralDrugPriceListDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PublishGeneralDrugPriceListItemDto)
  items: PublishGeneralDrugPriceListItemDto[];
}
