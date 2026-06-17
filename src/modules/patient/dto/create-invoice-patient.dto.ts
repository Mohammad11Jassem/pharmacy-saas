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

export class CreateInvoicePatientDto {
  @IsString()
  fullName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  nationalId?: string;
}