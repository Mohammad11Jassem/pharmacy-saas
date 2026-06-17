import { Injectable } from '@nestjs/common';
import { CreateSaleInvoiceDto } from './dto/create-sale-invoice.dto';
import { UpdateSaleInvoiceDto } from './dto/update-sale-invoice.dto';
import { CreateSaleInvoiceUseCase } from './use-cases/create-sale-invoice.usecase';

@Injectable()
export class SaleInvoiceService {
  constructor(
    private readonly createSaleInvoiceUseCase: CreateSaleInvoiceUseCase,
  ) {}
  create(pharmacyId: number, dto: CreateSaleInvoiceDto) {
    return this.createSaleInvoiceUseCase.execute(pharmacyId, dto);
  }
  findAll() {
    return `This action returns all saleInvoice`;
  }

  findOne(id: number) {
    return `This action returns a #${id} saleInvoice`;
  }

  update(id: number, updateSaleInvoiceDto: UpdateSaleInvoiceDto) {
    return `This action updates a #${id} saleInvoice`;
  }

  remove(id: number) {
    return `This action removes a #${id} saleInvoice`;
  }
}
