import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePrivateDrugDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  dosageFormId?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim()
      : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  tradeName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim()
      : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  barcode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  unitsPerBox?: number;

  @IsOptional()
  @IsBoolean()
  isRx?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}