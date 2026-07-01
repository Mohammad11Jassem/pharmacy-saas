import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSingleDrugDamageBatchAllocationDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  batchId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantityDamaged: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}