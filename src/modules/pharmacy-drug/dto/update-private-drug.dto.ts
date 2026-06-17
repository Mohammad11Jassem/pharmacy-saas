import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePrivateDrugDto {
  /*
   * Fields from private_drugs table
   */

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

  /*
   * Shared field:
   * إذا وصلت isActive سنعدلها في الجدولين:
   * private_drugs.is_active
   * pharmacy_drugs.is_active
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /*
   * Fields from pharmacy_drugs table
   */

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStockAlert?: number | null;

  @IsOptional()
  @IsBoolean()
  sellPart?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  consumerPrice?: number | null;

  /*
   * عدد الأيام قبل انتهاء الصلاحية.
   * 10 = تنبيه قبل 10 أيام
   * 14 = تنبيه قبل أسبوعين
   * 30 = شهر تقريبًا
   * 60 = شهرين تقريبًا
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  expiryDateAlarm?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}