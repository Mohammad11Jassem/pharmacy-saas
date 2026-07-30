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
import { CustomerRequestService } from './customer-request.service';
import { CreateCustomerRequestDto } from './dto/create-customer-request.dto';
import { UpdateCustomerRequestDto } from './dto/update-customer-request.dto';
import { CurrentPharmacy } from '../../common/decorators/current-pharmacy.decorator';
import { GetCustomerRequestsDto } from './dto/get-customer-request.dto';
import { Auth } from '../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../iam/authentication/enums/auth-type.enum';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { AccountType } from '../../generated/prisma/enums';
import { CheckoutCustomerRequestDto } from './dto/checkout-customer-request.dto';
import { GetCustomerRequestSaleInvoicesDto } from './dto/get-customer-request-sale-invoices.dto';

@Controller('customer-request')
export class CustomerRequestController {
  constructor(
    private readonly customerRequestService: CustomerRequestService,
  ) {}

  @Roles(AccountType.PHARMACY)
  @Post('create')
  create(
    @CurrentPharmacy() pharmacyId: number,
    @Body() createCustomerRequestDto: CreateCustomerRequestDto,
  ) {
    return this.customerRequestService.create(
      pharmacyId,
      createCustomerRequestDto,
    );
  }

  @Get()
  findAll(
    @CurrentPharmacy() pharmacyId: number,
    @Query() query: GetCustomerRequestsDto,
  ) {
    return this.customerRequestService.findAll(pharmacyId, query);
  }

  @Roles(AccountType.PHARMACY)
  @Get(':id/sale-invoices')
  findSaleInvoices(
    @CurrentPharmacy() pharmacyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetCustomerRequestSaleInvoicesDto,
  ) {
    return this.customerRequestService.findSaleInvoices(pharmacyId, id, query);
  }

  @Get(':id')
  findOne(
    @CurrentPharmacy() pharmacyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerRequestService.findOne(pharmacyId, id);
  }

  @Roles(AccountType.PHARMACY)
  @Get(':id/checkout-preview')
  getCheckoutPreview(
    @CurrentPharmacy() pharmacyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerRequestService.getCheckoutPreview(pharmacyId, id);
  }
  @Roles(AccountType.PHARMACY)
  @Post(':id/checkout')
  checkout(
    @CurrentPharmacy() pharmacyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckoutCustomerRequestDto,
  ) {
    return this.customerRequestService.checkout(pharmacyId, id, dto);
  }

  @Roles(AccountType.PHARMACY)
  @Post(':id/cancel')
  cancel(
    @CurrentPharmacy() pharmacyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerRequestService.cancel(pharmacyId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerRequestDto: UpdateCustomerRequestDto,
  ) {
    return this.customerRequestService.update(+id, updateCustomerRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerRequestService.remove(+id);
  }
}
