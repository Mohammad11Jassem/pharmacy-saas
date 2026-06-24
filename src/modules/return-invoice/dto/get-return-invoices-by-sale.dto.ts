import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  PharmacyInvoiceStatus,
  ReturnReason,
  UnitType,
} from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export enum ReturnInvoiceSortBy {
  CREATED_AT = 'createdAt',
  INVOICE_DATE = 'invoiceDate',
  SUBTOTAL_REFUND = 'subtotalRefund',
  RETURN_INVOICE_ID = 'returnInvoiceId',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

function toOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}

export class GetReturnInvoicesBySaleDto extends PaginationQueryDto{
//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @IsOptional()
//   page?: number = 1;

//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @IsOptional()
//   limit?: number = 20;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  returnInvoiceId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pharmacyInvoiceId?: number;

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
  minRefund?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  maxRefund?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pharmacyDrugId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  batchId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  saleInvoiceItemBatchId?: number;

  @IsEnum(UnitType)
  @IsOptional()
  unitType?: UnitType;

  @IsEnum(ReturnReason)
  @IsOptional()
  returnReason?: ReturnReason;

  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  @IsOptional()
  restockToInventory?: boolean;

  /**
   * يبحث في:
   * pharmacyInvoice.notes
   * pharmacyInvoice.idempotencyKey
   * patient.fullName
   * patient.phone
   * patient.nationalId
   */
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(ReturnInvoiceSortBy)
  @IsOptional()
  sortBy?: ReturnInvoiceSortBy = ReturnInvoiceSortBy.CREATED_AT;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;
}