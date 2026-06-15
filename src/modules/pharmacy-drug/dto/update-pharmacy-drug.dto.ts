import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePharmacyDrugDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStockAlert?: number;

  @IsOptional()
  @IsBoolean()
  sellPart?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {
      maxDecimalPlaces: 2,
    },
  )
  @Min(0)
  consumerPrice?: number | null;

  /*
   * هذا الحقل في الداتابيز اسمه expiry_date_alarm ونوعه Date.
   * لكن في الـ API سنرسله كعدد أيام قبل انتهاء الصلاحية.
   *
   * أمثلة:
   * 10 أيام = 10
   * أسبوعين = 14
   * شهرين تقريبًا = 60
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  expiryDateAlarm?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}