import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DamageReason } from '../../../generated/prisma/enums';
import { CreateSingleDrugDamageBatchAllocationDto } from './create-single-drug-damage-batch-allocation.dto';

export class CreateSingleDrugDamageInvoiceDto {
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pharmacyDrugId: number;

  /**
   * الكمية الإجمالية المتلفة من هذا الدواء.
   */
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantityDamaged: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  damageReason: string;

  /**
   * ملاحظة مشتركة على عناصر الإتلاف.
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  itemNotes?: string;

  /**
   * إذا لم تُرسل:
   * الباك يوزع الإتلاف تلقائياً على أقرب الدفعات انتهاءً للصلاحية.
   *
   * إذا أُرسلت:
   * يجب أن يكون مجموع quantityDamaged داخلها مساوياً للـ quantityDamaged الأساسي.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSingleDrugDamageBatchAllocationDto)
  batchAllocations?: CreateSingleDrugDamageBatchAllocationDto[];
}
