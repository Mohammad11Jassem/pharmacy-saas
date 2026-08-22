import { Type } from 'class-transformer';
import {
  IsInt,
  Min,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsDateString,
  IsNumber,
  MaxLength,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { CreateSupplierInvoiceItemDto } from '../../supplier-invoice-item/dto/create-supplier-invoice-item.dto';
import { PaymentStatus } from '../../../generated/prisma/enums';

export class CreateSupplierInvoiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  idempotencyKey: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  supplierId?: number;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string; // ISO date string

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierInvoiceItemDto)
  items: CreateSupplierInvoiceItemDto[];
}
