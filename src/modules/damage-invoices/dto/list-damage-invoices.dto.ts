import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import {
  PharmacyInvoiceStatus,
} from '../../../generated/prisma/client';

export class ListDamageInvoicesDto {
  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;


  // Filter by invoice status
  @IsOptional()
  @IsEnum(PharmacyInvoiceStatus)
  status?: PharmacyInvoiceStatus;


  // Filter from date
  @IsOptional()
  @IsDateString()
  fromDate?: string;


  // Filter to date
  @IsOptional()
  @IsDateString()
  toDate?: string;


  // Filter by pharmacy drug
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pharmacyDrugId?: number;
}