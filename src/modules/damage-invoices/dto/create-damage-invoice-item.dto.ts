import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { DamageReason } from '../../../generated/prisma/enums';

export class CreateDamageInvoiceItemDto {
  @IsInt()
  @IsPositive()
  batchId: number;

  @IsInt()
  @IsPositive()
  quantityDamaged: number;

  @IsEnum(DamageReason)
  damageReason: DamageReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}