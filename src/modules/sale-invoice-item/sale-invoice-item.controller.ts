import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SaleInvoiceItemService } from './sale-invoice-item.service';
import { CreateSaleInvoiceItemDto } from './dto/create-sale-invoice-item.dto';
import { UpdateSaleInvoiceItemDto } from './dto/update-sale-invoice-item.dto';

@Controller('sale-invoice-item')
export class SaleInvoiceItemController {
  constructor(private readonly saleInvoiceItemService: SaleInvoiceItemService) {}

  @Post()
  create(@Body() createSaleInvoiceItemDto: CreateSaleInvoiceItemDto) {
    return this.saleInvoiceItemService.create(createSaleInvoiceItemDto);
  }

  @Get()
  findAll() {
    return this.saleInvoiceItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.saleInvoiceItemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSaleInvoiceItemDto: UpdateSaleInvoiceItemDto) {
    return this.saleInvoiceItemService.update(+id, updateSaleInvoiceItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.saleInvoiceItemService.remove(+id);
  }
}
