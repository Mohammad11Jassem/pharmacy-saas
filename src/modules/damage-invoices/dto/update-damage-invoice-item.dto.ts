import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { DamageReason } from '../../../generated/prisma/enums';

export class UpdateDamageInvoiceItemDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  quantityDamaged?: number;

  @IsOptional()
  @IsEnum(DamageReason)
  damageReason?: DamageReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}