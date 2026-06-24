import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { SaleInvoiceService } from './sale-invoice.service';
import { CreateSaleInvoiceDto } from './dto/create-sale-invoice.dto';
import { UpdateSaleInvoiceDto } from './dto/update-sale-invoice.dto';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { AccountType } from '../../generated/prisma/enums';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import { CurrentPharmacy } from '../../common/decorators/current-pharmacy.decorator';
import { GetSaleInvoicesDto } from './dto/get-sale-invoices.dto';

@Roles(AccountType.PHARMACY)
@Controller('sale-invoice')
export class SaleInvoiceController {
  constructor(private readonly saleInvoiceService: SaleInvoiceService) {}

  @Post('create')
  create(
    // @ActiveUser('sub') pharmacyId: number,
    @CurrentPharmacy() pharmacyId: number,
    @Body() dto: CreateSaleInvoiceDto,
  ) {
    return this.saleInvoiceService.create(pharmacyId, dto);
  }
  @Get()
  findAll(
    @CurrentPharmacy() pharmacyId: number,
    @Query() query: GetSaleInvoicesDto,
  ) {
    return this.saleInvoiceService.findAll(pharmacyId, query);
  }

  @Get(':saleInvoiceId')
  findOne(
    @CurrentPharmacy() pharmacyId: number,
    @Param('saleInvoiceId', ParseIntPipe) saleInvoiceId: number,
  ) {
    return this.saleInvoiceService.findOne(pharmacyId, saleInvoiceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSaleInvoiceDto: UpdateSaleInvoiceDto,
  ) {
    return this.saleInvoiceService.update(+id, updateSaleInvoiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.saleInvoiceService.remove(+id);
  }
}
