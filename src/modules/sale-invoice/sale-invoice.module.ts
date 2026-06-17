import { Module } from '@nestjs/common';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { SaleInvoiceController } from './sale-invoice.controller';
import { SaleInvoiceService } from './sale-invoice.service';
import { CreateSaleInvoiceUseCase } from './use-cases/create-sale-invoice.usecase';

@Module({
  controllers: [
    SaleInvoiceController,
  ],
  providers: [
    SaleInvoiceService,
    UnitOfWork,
    CreateSaleInvoiceUseCase,
  ],
})
export class SaleInvoiceModule {}