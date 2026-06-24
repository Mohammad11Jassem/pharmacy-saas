import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ReturnReason,
  UnitType,
} from '../../../generated/prisma/client';
import { CreateReturnInvoiceItemDto } from '../../return-invoice-item/dto/create-return-invoice-item.dto';

export class CreateReturnInvoiceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  referenceSaleInvoiceId: number;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReturnInvoiceItemDto)
  items: CreateReturnInvoiceItemDto[];
}