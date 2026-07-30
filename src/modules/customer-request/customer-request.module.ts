import { Module } from '@nestjs/common';
import { CustomerRequestService } from './customer-request.service';
import { CustomerRequestController } from './customer-request.controller';
import { GetCustomerRequestCheckoutPreviewUseCase } from './use-cases/get-customer-request-checkout-preview.usecase';
import { CheckoutCustomerRequestUseCase } from './use-cases/checkout-customer-request.usecase';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { SaleInvoiceModule } from '../sale-invoice/sale-invoice.module';
import { FindCustomerRequestSaleInvoicesUseCase } from './use-cases/find-customer-request-sale-invoices.usecase';
import { CancelCustomerRequestUseCase } from './use-cases/cancel-customer-request.usecase';

@Module({
  imports: [SaleInvoiceModule],
  controllers: [CustomerRequestController],
  providers: [
    CustomerRequestService,
    UnitOfWork,
    GetCustomerRequestCheckoutPreviewUseCase,
    CheckoutCustomerRequestUseCase,
    FindCustomerRequestSaleInvoicesUseCase,
    CancelCustomerRequestUseCase,
  ],
})
export class CustomerRequestModule {}
