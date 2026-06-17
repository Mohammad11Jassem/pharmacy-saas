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
import { CreateSaleInvoiceItemDto } from '../../sale-invoice-item/dto/create-sale-invoice-item.dto';
import { CreateInvoicePatientDto } from '../../patient/dto/create-invoice-patient.dto';

export class CreateSaleInvoiceDto {
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  patientId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInvoicePatientDto)
  patient?: CreateInvoicePatientDto;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsEnum(SaleType)
  @IsOptional()
  saleType?: SaleType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleInvoiceItemDto)
  items: CreateSaleInvoiceItemDto[];
}
