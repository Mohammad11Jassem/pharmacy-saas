import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ReturnReason,
  UnitType,
} from '../../../generated/prisma/client';

export class CreateReturnInvoiceItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  saleInvoiceItemBatchId: number;

  @IsEnum(UnitType)
  unitType: UnitType;

  /**
   * الكمية التي أدخلها المستخدم حسب الوحدة المختارة.
   * مثال: 1 BOX أو 1 STRIP
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayQuantity: number;

//   /**
//    * عامل التحويل للوحدة الأساسية وقت المرتجع.
//    * مثال:
//    * BOX = 4 STRIP
//    * STRIP = 1 STRIP
//    */
//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   unitFactorToBase: number;

  @IsEnum(ReturnReason)
  @IsOptional()
  returnReason?: ReturnReason;

  /**
   * true  => الكمية ترجع إلى المخزون القابل للبيع
   * false => مرتجع غير قابل للبيع، لا نرجعه للمخزون
   */
  @IsBoolean()
  @IsOptional()
  restockToInventory?: boolean;
}
