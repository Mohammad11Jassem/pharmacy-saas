import { Injectable } from '@nestjs/common';
import { CreateReturnInvoiceItemDto } from './dto/create-return-invoice-item.dto';
import { UpdateReturnInvoiceItemDto } from './dto/update-return-invoice-item.dto';

@Injectable()
export class ReturnInvoiceItemService {
  create(createReturnInvoiceItemDto: CreateReturnInvoiceItemDto) {
    return 'This action adds a new returnInvoiceItem';
  }

  findAll() {
    return `This action returns all returnInvoiceItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} returnInvoiceItem`;
  }

  update(id: number, updateReturnInvoiceItemDto: UpdateReturnInvoiceItemDto) {
    return `This action updates a #${id} returnInvoiceItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} returnInvoiceItem`;
  }
}
