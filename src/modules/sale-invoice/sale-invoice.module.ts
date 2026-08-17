import { Module } from '@nestjs/common';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { SaleInvoiceController } from './sale-invoice.controller';
import { SaleInvoiceService } from './sale-invoice.service';
import { CreateSaleInvoiceUseCase } from './use-cases/create-sale-invoice.usecase';
import { PatientModule } from '../patient/patient.module';
import { FindAllSaleInvoicesUseCase } from './use-cases/find-all-sale-invoices.usecase';
import { FindSaleInvoiceByIdUseCase } from './use-cases/find-sale-invoice-by-id.usecase';
import { FindSaleInvoiceBatchesUseCase } from './use-cases/find-sale-invoice-batches.usecase';
import { SaleInvoicePostingService } from './services/sale-invoice-posting.service';
import { NotificationModule } from '../../notification/notification.module';


@Module({
  imports: [PatientModule,NotificationModule],
  controllers: [SaleInvoiceController],
  providers: [
    SaleInvoiceService,
    UnitOfWork,
    CreateSaleInvoiceUseCase,
    SaleInvoicePostingService,
    FindAllSaleInvoicesUseCase,
    FindSaleInvoiceByIdUseCase,
    FindSaleInvoiceBatchesUseCase,
  ],
  exports: [SaleInvoicePostingService],
})
export class SaleInvoiceModule {}