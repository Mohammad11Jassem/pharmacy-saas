import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePharmacyDrugBatchDto {
  
  @Type(() => Number)
  @IsInt()
  @Min(1)
  initialQuantity: number;


  @IsDateString()
  expiryDate?: string;


  @IsDateString()
  receivedDate?: string;
}