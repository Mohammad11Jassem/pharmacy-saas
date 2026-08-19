import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class AddSupplierInvoiceBatchItemDto {
  @IsInt()
  supplierInvoiceItemId: number;

  //يجب تغيير الحقل من initialQuantity إلى boxQuantity
  @IsInt()
  @Min(1)
  initialQuantity: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class AddBatchesToSupplierInvoiceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddSupplierInvoiceBatchItemDto)
  batches: AddSupplierInvoiceBatchItemDto[];
}
