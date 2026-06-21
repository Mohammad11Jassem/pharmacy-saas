import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatePharmacyDrugBatchDto } from './create-pharmacy-drug-batch.dto';
import { Type } from 'class-transformer';
import { DrugIngredientInputDto } from '../../drug-catalog/dto/general-drug.dto';

export class AddPrivateDrugDto {
  @IsInt()
  @IsPositive()
  dosageFormId: number;

  @IsString()
  @MaxLength(255)
  tradeName: string;

  @IsString()
  @MaxLength(255)
  barcode: string;

  @IsInt()
  @IsPositive()
  unitsPerBox: number;

  @IsOptional()
  @IsBoolean()
  isRx?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStockAlert?: number;

  @IsOptional()
  @IsBoolean()
  sellPart?: boolean;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  netPrice?: number;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  consumerPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  storageLocation?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({
    each: true,
  })
  @Type(() => CreatePharmacyDrugBatchDto)
  batches?: CreatePharmacyDrugBatchDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({
    each: true,
  })
  @IsPositive({
    each: true,
  })
  categoryIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique(
    (item: DrugIngredientInputDto) =>
      item.ingredientId,
  )
  @ValidateNested({
    each: true,
  })
  @Type(() => DrugIngredientInputDto)
  ingredients?: DrugIngredientInputDto[];
}