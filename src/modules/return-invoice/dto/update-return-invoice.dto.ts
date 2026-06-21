import { PartialType } from '@nestjs/swagger';
import { CreateReturnInvoiceDto } from './create-return-invoice.dto';

export class UpdateReturnInvoiceDto extends PartialType(CreateReturnInvoiceDto) {}
