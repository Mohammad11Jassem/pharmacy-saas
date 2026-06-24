import { Module } from '@nestjs/common';
import { ReturnInvoiceItemService } from './return-invoice-item.service';
import { ReturnInvoiceItemController } from './return-invoice-item.controller';

@Module({
  controllers: [ReturnInvoiceItemController],
  providers: [ReturnInvoiceItemService],
})
export class ReturnInvoiceItemModule {}
