import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReturnInvoiceItemService } from './return-invoice-item.service';
import { CreateReturnInvoiceItemDto } from './dto/create-return-invoice-item.dto';
import { UpdateReturnInvoiceItemDto } from './dto/update-return-invoice-item.dto';

@Controller('return-invoice-item')
export class ReturnInvoiceItemController {
  constructor(private readonly returnInvoiceItemService: ReturnInvoiceItemService) {}

  @Post()
  create(@Body() createReturnInvoiceItemDto: CreateReturnInvoiceItemDto) {
    return this.returnInvoiceItemService.create(createReturnInvoiceItemDto);
  }

  @Get()
  findAll() {
    return this.returnInvoiceItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.returnInvoiceItemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReturnInvoiceItemDto: UpdateReturnInvoiceItemDto) {
    return this.returnInvoiceItemService.update(+id, updateReturnInvoiceItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.returnInvoiceItemService.remove(+id);
  }
}
