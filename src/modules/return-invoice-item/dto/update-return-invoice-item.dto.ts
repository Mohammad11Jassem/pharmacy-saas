import { PartialType } from '@nestjs/swagger';
import { CreateReturnInvoiceItemDto } from './create-return-invoice-item.dto';

export class UpdateReturnInvoiceItemDto extends PartialType(CreateReturnInvoiceItemDto) {}
