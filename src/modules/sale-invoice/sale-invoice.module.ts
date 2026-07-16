import { Module } from '@nestjs/common';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { SaleInvoiceController } from './sale-invoice.controller';
import { SaleInvoiceService } from './sale-invoice.service';
import { CreateSaleInvoiceUseCase } from './use-cases/create-sale-invoice.usecase';
import { PatientModule } from '../patient/patient.module';
import { FindAllSaleInvoicesUseCase } from './use-cases/find-all-sale-invoices.usecase';
import { FindSaleInvoiceByIdUseCase } from './use-cases/find-sale-invoice-by-id.usecase';
import { FindSaleInvoiceBatchesUseCase } from './use-cases/find-sale-invoice-batches.usecase';

@Module({
  imports: [PatientModule],
  controllers: [SaleInvoiceController],
  providers: [
    SaleInvoiceService,
    UnitOfWork,
    CreateSaleInvoiceUseCase,
    FindAllSaleInvoicesUseCase,
    FindSaleInvoiceByIdUseCase,
    FindSaleInvoiceBatchesUseCase,
  ],
})
export class SaleInvoiceModule {}
