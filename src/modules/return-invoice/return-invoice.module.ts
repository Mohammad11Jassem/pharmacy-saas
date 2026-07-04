import { Module } from '@nestjs/common';
import { ReturnInvoiceService } from './return-invoice.service';
import { ReturnInvoiceController } from './return-invoice.controller';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { CreateReturnInvoiceUseCase } from './use-cases/create-return-invoice.usecase';
import { FindReturnInvoicesBySaleUseCase } from './use-cases/find-return-invoices-by-sale.usecase';
import { ListReturnInvoicesUseCase } from './use-cases/list-return-invoices.usecase';
import { FindReturnInvoiceDetailsUseCase } from './use-cases/find-return-invoice-details.usecase';

@Module({
  controllers: [ReturnInvoiceController],
  providers: [
    ReturnInvoiceService,
    CreateReturnInvoiceUseCase,
    FindReturnInvoicesBySaleUseCase,
    ListReturnInvoicesUseCase,
    FindReturnInvoiceDetailsUseCase,
    UnitOfWork,
  ],
})
export class ReturnInvoiceModule {}
