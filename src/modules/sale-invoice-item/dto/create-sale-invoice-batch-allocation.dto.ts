import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSaleInvoiceBatchAllocationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  batchId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayQuantity: number;
}