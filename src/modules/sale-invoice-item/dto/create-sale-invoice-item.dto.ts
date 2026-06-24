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
import { CreateSaleInvoiceBatchAllocationDto } from './create-sale-invoice-batch-allocation.dto';

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

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  extraPercentage?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleInvoiceBatchAllocationDto)
  batchAllocations?: CreateSaleInvoiceBatchAllocationDto[];

  //   /**
  //    * عامل التحويل إلى الوحدة الأساسية وقت البيع.
  //    * مثال:
  //    * BOX => 4 STRIP
  //    * STRIP => 1 STRIP
  //    */
  //   @Type(() => Number)
  //   @IsInt()
  //   @Min(1)
  //   unitFactorToBase: number;

  //   /**
  //    * سعر الوحدة المختارة.
  //    * مثال:
  //    * سعر BOX أو سعر STRIP حسب unitType.
  //    */
  //   @Type(() => Number)
  //   @IsNumber({ maxDecimalPlaces: 2 })
  //   @Min(0)
  //   finalUnitPrice: number;

  /**
   * اختياري فقط إذا النظام يسمح بتعديل السعر.
   * لا يتم اعتماده إلا بعد validation من الباك.
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  manualUnitPrice?: number;
}
