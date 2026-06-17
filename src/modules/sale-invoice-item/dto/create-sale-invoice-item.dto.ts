import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  PaymentStatus,
  SaleType,
  UnitType,
} from '../../../generated/prisma/client';

export class CreateSaleInvoiceItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pharmacyDrugId: number;

  @IsEnum(UnitType)
  unitType: UnitType;

  /**
   * الكمية التي أدخلها الصيدلي حسب الوحدة المختارة.
   * مثال:
   * 2 BOX
   * 3 STRIP
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayQuantity: number;

  /**
   * عامل التحويل إلى الوحدة الأساسية وقت البيع.
   * مثال:
   * BOX => 4 STRIP
   * STRIP => 1 STRIP
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitFactorToBase: number;

  /**
   * سعر الوحدة المختارة.
   * مثال:
   * سعر BOX أو سعر STRIP حسب unitType.
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalUnitPrice: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  extraPercentage?: number;
}
