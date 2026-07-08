import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { DamageInvoiceService } from './damage-invoice.service';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import { Auth } from '../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../iam/authentication/enums/auth-type.enum';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { AccountType } from '../../generated/prisma/enums';
import { CreateDamageInvoiceDto } from './dto/create-damage-invoice.dto';
import { CreateDamageInvoiceItemDto } from './dto/create-damage-invoice-item.dto';
import { UpdateDamageInvoiceItemDto } from './dto/update-damage-invoice-item.dto';
import { CreateSingleDrugDamageInvoiceDto } from './dto/create-single-drug-damage-invoice.dto';
import { ListDamageInvoicesDto } from './dto/list-damage-invoices.dto';

@Auth(AuthType.Bearer)
@Roles(AccountType.PHARMACY)
@Controller('damage-invoices')
export class DamageInvoiceController {
  constructor(private readonly damageInvoiceService: DamageInvoiceService) {}

  @Post()
  async create(
    @ActiveUser('sub') pharmacyId: number,
    @Body() dto: CreateDamageInvoiceDto,
  ) {
    return await this.damageInvoiceService.create(pharmacyId, dto);
  }

  @Get()
  list(
    @ActiveUser('sub') pharmacyId: number,
    @Query() dto: ListDamageInvoicesDto,
  ) {
    return this.damageInvoiceService.list(pharmacyId, dto);
  }

  @Get(':damageInvoiceId')
  getOne(
    @ActiveUser('sub') pharmacyId: number,

    @Param('damageInvoiceId', ParseIntPipe)
    damageInvoiceId: number,
  ) {
    return this.damageInvoiceService.getOne(pharmacyId, damageInvoiceId);
  }

  @Post(':damageInvoiceId/items')
  addItem(
    @ActiveUser('sub') pharmacyId: number,

    @Param('damageInvoiceId', ParseIntPipe)
    damageInvoiceId: number,

    @Body()
    dto: CreateDamageInvoiceItemDto,
  ) {
    return this.damageInvoiceService.addItem(pharmacyId, damageInvoiceId, dto);
  }

  @Post(':damageInvoiceId/items/:itemId')
  updateItem(
    @ActiveUser('sub')
    pharmacyId: number,

    @Param('damageInvoiceId', ParseIntPipe)
    damageInvoiceId: number,

    @Param('itemId', ParseIntPipe)
    itemId: number,

    @Body()
    dto: UpdateDamageInvoiceItemDto,
  ) {
    return this.damageInvoiceService.updateDamageInvoiceItem(
      pharmacyId,
      damageInvoiceId,
      itemId,
      dto,
    );
  }

  @Post('create-damage-invoice-for-single-drug')
  async createSingleDrugDamageInvoice(
    @ActiveUser('sub') pharmacyId: number,
    @Body() dto: CreateSingleDrugDamageInvoiceDto,
  ) {
    return await this.damageInvoiceService.createSingleDrugDamageInvoice(
      pharmacyId,
      dto,
    );
  }
}
