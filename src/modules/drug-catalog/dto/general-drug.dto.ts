import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class DrugIngredientInputDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ingredientId!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  strengthValue!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;
}

export class CreateGeneralDrugDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dosageFormId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  tradeName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  barcode!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitsPerBox!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  netPrice!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  consumerPrice!: number;

  @IsOptional()
  @IsBoolean()
  isRx?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DrugIngredientInputDto)
  ingredients!: DrugIngredientInputDto[];

  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  categoryIds!: number[];
}

export class UpdateGeneralDrugDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dosageFormId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  barcode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitsPerBox?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  netPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  consumerPrice?: number;

  @IsOptional()
  @IsBoolean()
  isRx?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrugIngredientInputDto)
  ingredients?: DrugIngredientInputDto[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  categoryIds?: number[];
}