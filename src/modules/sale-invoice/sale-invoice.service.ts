import { Injectable } from '@nestjs/common';
import { CreateSaleInvoiceDto } from './dto/create-sale-invoice.dto';
import { UpdateSaleInvoiceDto } from './dto/update-sale-invoice.dto';
import { CreateSaleInvoiceUseCase } from './use-cases/create-sale-invoice.usecase';
import { GetSaleInvoicesDto } from './dto/get-sale-invoices.dto';
import { FindAllSaleInvoicesUseCase } from './use-cases/find-all-sale-invoices.usecase';
import { FindSaleInvoiceByIdUseCase } from './use-cases/find-sale-invoice-by-id.usecase';
import { FindSaleInvoiceBatchesUseCase } from './use-cases/find-sale-invoice-batches.usecase';
import { UpdateSaleInvoicePaymentUseCase } from './use-cases/update-sale-invoice-payment.usecase';
import { UpdateSaleInvoicePaymentDto } from './dto/update-sale-invoice-payment.dto';

@Injectable()
export class SaleInvoiceService {
  constructor(
    private readonly createSaleInvoiceUseCase: CreateSaleInvoiceUseCase,
    private readonly findAllSaleInvoicesUseCase: FindAllSaleInvoicesUseCase,
    private readonly findSaleInvoiceByIdUseCase: FindSaleInvoiceByIdUseCase,
    private readonly findSaleInvoiceBatchesUseCase: FindSaleInvoiceBatchesUseCase,
    private readonly updateSaleInvoicePaymentUseCase: UpdateSaleInvoicePaymentUseCase,
  ) {}
  create(pharmacyId: number, dto: CreateSaleInvoiceDto) {
    return this.createSaleInvoiceUseCase.execute(pharmacyId, dto);
  }
  findAll(pharmacyId: number, query: GetSaleInvoicesDto) {
    return this.findAllSaleInvoicesUseCase.execute(pharmacyId, query);
  }
  findOne(pharmacyId: number, saleInvoiceId: number) {
    return this.findSaleInvoiceByIdUseCase.execute(pharmacyId, saleInvoiceId);
    // return this.findSaleInvoiceByIdUseCase.executeFrontendCandidate(pharmacyId, saleInvoiceId);
  }
  findBatchesBySaleInvoice(pharmacyId: number, saleInvoiceId: number) {
    return this.findSaleInvoiceBatchesUseCase.execute(
      pharmacyId,
      saleInvoiceId,
    );
  }
  updatePayment(
    pharmacyId: number,
    saleInvoiceId: number,
    dto: UpdateSaleInvoicePaymentDto,
  ) {
    return this.updateSaleInvoicePaymentUseCase.execute(
      pharmacyId,
      saleInvoiceId,
      dto,
    );
  }
}
