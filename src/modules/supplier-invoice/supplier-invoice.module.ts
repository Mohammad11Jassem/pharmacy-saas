import { Module } from '@nestjs/common';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { SupplierInvoiceController } from './supplier-invoice.controller';
import { BatchModule } from '../batch/batch.module';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { UpdateSupplierInvoicePaymentUseCase } from './use-cases/update-supplier-invoice-payment.usecase';

@Module({
  imports: [BatchModule],
  controllers: [SupplierInvoiceController],
  providers: [
    SupplierInvoiceService,
    UnitOfWork,
    UpdateSupplierInvoicePaymentUseCase,
  ],
})
export class SupplierInvoiceModule {}
