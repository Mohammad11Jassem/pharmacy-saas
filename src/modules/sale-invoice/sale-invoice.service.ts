import { Injectable } from '@nestjs/common';
import { CreateSaleInvoiceDto } from './dto/create-sale-invoice.dto';
import { UpdateSaleInvoiceDto } from './dto/update-sale-invoice.dto';
import { CreateSaleInvoiceUseCase } from './use-cases/create-sale-invoice.usecase';
import { GetSaleInvoicesDto } from './dto/get-sale-invoices.dto';
import { FindAllSaleInvoicesUseCase } from './use-cases/find-all-sale-invoices.usecase';
import { FindSaleInvoiceByIdUseCase } from './use-cases/find-sale-invoice-by-id.usecase';

@Injectable()
export class SaleInvoiceService {
  constructor(
    private readonly createSaleInvoiceUseCase: CreateSaleInvoiceUseCase,
    private readonly findAllSaleInvoicesUseCase: FindAllSaleInvoicesUseCase,
    private readonly findSaleInvoiceByIdUseCase: FindSaleInvoiceByIdUseCase,
  ) {}
  create(pharmacyId: number, dto: CreateSaleInvoiceDto) {
    return this.createSaleInvoiceUseCase.execute(pharmacyId, dto);
  }
  findAll(pharmacyId: number, query: GetSaleInvoicesDto) {
    return this.findAllSaleInvoicesUseCase.execute(pharmacyId, query);
  }
  findOne(pharmacyId: number, saleInvoiceId: number) {
    return this.findSaleInvoiceByIdUseCase.execute(pharmacyId, saleInvoiceId);
  }
  update(id: number, updateSaleInvoiceDto: UpdateSaleInvoiceDto) {
    return `This action updates a #${id} saleInvoice`;
  }

  remove(id: number) {
    return `This action removes a #${id} saleInvoice`;
  }
}
