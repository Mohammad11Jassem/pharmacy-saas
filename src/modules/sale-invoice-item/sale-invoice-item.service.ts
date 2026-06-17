import { Injectable } from '@nestjs/common';
import { CreateSaleInvoiceItemDto } from './dto/create-sale-invoice-item.dto';
import { UpdateSaleInvoiceItemDto } from './dto/update-sale-invoice-item.dto';

@Injectable()
export class SaleInvoiceItemService {
  create(createSaleInvoiceItemDto: CreateSaleInvoiceItemDto) {
    return 'This action adds a new saleInvoiceItem';
  }

  findAll() {
    return `This action returns all saleInvoiceItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} saleInvoiceItem`;
  }

  update(id: number, updateSaleInvoiceItemDto: UpdateSaleInvoiceItemDto) {
    return `This action updates a #${id} saleInvoiceItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} saleInvoiceItem`;
  }
}
