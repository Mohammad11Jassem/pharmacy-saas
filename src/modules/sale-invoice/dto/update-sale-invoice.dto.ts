import { PartialType } from '@nestjs/swagger';
import { CreateSaleInvoiceDto } from './create-sale-invoice.dto';

export class UpdateSaleInvoiceDto extends PartialType(CreateSaleInvoiceDto) {}
