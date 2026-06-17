import { Module } from '@nestjs/common';
import { SaleInvoiceItemService } from './sale-invoice-item.service';
import { SaleInvoiceItemController } from './sale-invoice-item.controller';

@Module({
  controllers: [SaleInvoiceItemController],
  providers: [SaleInvoiceItemService],
})
export class SaleInvoiceItemModule {}
