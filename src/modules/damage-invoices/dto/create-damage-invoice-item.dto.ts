// import {
//   IsEnum,
//   IsInt,
//   IsOptional,
//   IsPositive,
//   IsString,
//   MaxLength,
// } from 'class-validator';
// import { DamageReason } from '../../../generated/prisma/enums';

// export class CreateDamageInvoiceItemDto {
//   @IsInt()
//   @IsPositive()
//   batchId: number;

//   @IsInt()
//   @IsPositive()
//   quantityDamaged: number;

//   @IsEnum(DamageReason)
//   damageReason: DamageReason;

//   @IsOptional()
//   @IsString()
//   @MaxLength(1000)
//   notes?: string;
// }

import { Type } from 'class-transformer';
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
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pharmacyDrugId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  batchId?: number;

  @Type(() => Number)
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