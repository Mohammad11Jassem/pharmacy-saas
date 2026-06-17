import { PartialType } from '@nestjs/swagger';
import { CreateSaleInvoiceItemDto } from './create-sale-invoice-item.dto';

export class UpdateSaleInvoiceItemDto extends PartialType(CreateSaleInvoiceItemDto) {}
