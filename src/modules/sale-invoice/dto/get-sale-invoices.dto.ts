import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  PaymentStatus,
  PharmacyInvoiceStatus,
  SaleType,
  UnitType,
} from '../../../generated/prisma/client';

export enum SaleInvoiceSortBy {
  CREATED_AT = 'createdAt',
  INVOICE_DATE = 'invoiceDate',
  TOTAL_AMOUNT = 'totalAmount',
  SALE_INVOICE_ID = 'saleInvoiceId',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetSaleInvoicesDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  saleInvoiceId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pharmacyInvoiceId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  patientId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pharmacyDrugId?: number;

  @IsEnum(UnitType)
  @IsOptional()
  unitType?: UnitType;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsEnum(SaleType)
  @IsOptional()
  saleType?: SaleType;

  @IsEnum(PharmacyInvoiceStatus)
  @IsOptional()
  invoiceStatus?: PharmacyInvoiceStatus;

  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  toDate?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  minTotal?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  maxTotal?: number;

  /**
   * يبحث في:
   * patient.fullName
   * patient.phone
   * patient.nationalId
   * pharmacyInvoice.notes
   */
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(SaleInvoiceSortBy)
  @IsOptional()
  sortBy?: SaleInvoiceSortBy = SaleInvoiceSortBy.CREATED_AT;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;
}