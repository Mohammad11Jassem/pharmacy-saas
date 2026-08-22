import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { PaymentStatus } from '../../../generated/prisma/client';

export class UpdateSupplierInvoicePaymentDto {
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  paidAmount?: number;
}
