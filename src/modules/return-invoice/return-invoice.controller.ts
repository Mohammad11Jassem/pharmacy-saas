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
import { ReturnInvoiceService } from './return-invoice.service';
import { CreateReturnInvoiceDto } from './dto/create-return-invoice.dto';
import { UpdateReturnInvoiceDto } from './dto/update-return-invoice.dto';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { AccountType } from '../../generated/prisma/enums';
import { CurrentPharmacy } from '../../common/decorators/current-pharmacy.decorator';
import { GetReturnInvoicesBySaleDto } from './dto/get-return-invoices-by-sale.dto';
import { GetReturnInvoicesQueryDto } from './dto/get-return-invoices-query.dto';

@Roles(AccountType.PHARMACY)
@Controller('return-invoice')
export class ReturnInvoiceController {
  constructor(private readonly returnInvoiceService: ReturnInvoiceService) {}

  @Post('create')
  create(
    // @ActiveUser('sub') pharmacyId: number,
    @CurrentPharmacy() pharmacyId: number,
    @Body() dto: CreateReturnInvoiceDto,
  ) {
    return this.returnInvoiceService.create(pharmacyId, dto);
  }

  @Get()
  findAll(
    @CurrentPharmacy() pharmacyId: number,
    @Query() query: GetReturnInvoicesQueryDto,
  ) {
    return this.returnInvoiceService.findAll(pharmacyId, query);
  }

  @Get('by-sale/:saleInvoiceId')
  findBySaleInvoice(
    @CurrentPharmacy() pharmacyId: number,
    @Param('saleInvoiceId', ParseIntPipe) saleInvoiceId: number,
    @Query() query: GetReturnInvoicesBySaleDto,
  ) {
    return this.returnInvoiceService.findBySaleInvoice(
      pharmacyId,
      saleInvoiceId,
      query,
    );
  }

  @Get(':returnInvoiceId')
  findOne(
    @CurrentPharmacy() pharmacyId: number,
    @Param('returnInvoiceId', ParseIntPipe) returnInvoiceId: number,
  ) {
    return this.returnInvoiceService.findOne(pharmacyId, returnInvoiceId);
  }
}
