import { Module } from '@nestjs/common';
import { ReturnInvoiceService } from './return-invoice.service';
import { ReturnInvoiceController } from './return-invoice.controller';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { CreateReturnInvoiceUseCase } from './use-cases/create-return-invoice.usecase';
import { FindReturnInvoicesBySaleUseCase } from './use-cases/find-return-invoices-by-sale.usecase';
import { FindReturnInvoiceDetailsUseCase } from './use-cases/find-return-invoice-details.usecase';

@Module({
  controllers: [ReturnInvoiceController],
  providers: [
    ReturnInvoiceService,
    CreateReturnInvoiceUseCase,
    FindReturnInvoicesBySaleUseCase,
    FindReturnInvoiceDetailsUseCase,
    UnitOfWork,
  ],
})
export class ReturnInvoiceModule {}
