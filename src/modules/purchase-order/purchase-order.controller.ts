import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CurrentPharmacy } from '../../common/decorators/current-pharmacy.decorator';
import { Request } from 'express';
import { ActiveUserData } from '../../iam/interfaces/actice-user-data.interface';
import { AccountType } from '../../generated/prisma/enums';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { PurchaseOrderFilterDto } from './dto/create-purchase-order-filter.dto';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import { SmartSuggestionsService } from './smart-suggestions/smart-suggestions.service';
import { Auth } from '../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../iam/authentication/enums/auth-type.enum';

type RequestWithUser = Request & {
  user?: ActiveUserData;
};
@Controller('purchase-order')
export class PurchaseOrderController {
  constructor(
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly smartSuggestionsService: SmartSuggestionsService,
  ) {}

  @Roles(AccountType.PHARMACY)
  @Post('create')
  create(
    @CurrentPharmacy() pharmacyId: number,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.create(pharmacyId, dto);
  }

  @Roles(AccountType.PHARMACY)
  @Get()
  findAll(
    @CurrentPharmacy() pharmacyId: number,
    @Query() filters: PurchaseOrderFilterDto,
  ) {
    return this.purchaseOrderService.findAll(pharmacyId, filters);
  }

  /**
   * ==========================================================
   * SMART SUGGESTIONS
   * ==========================================================
   *
   * الأدوية التي ينصح النظام بطلبها.
   */
  @Auth(AuthType.Bearer)
  @Roles(AccountType.PHARMACY)
  @Get('smart-suggestions')
  getSmartSuggestions(
    @CurrentPharmacy()
    pharmacyId: number,
  ) {
    return this.smartSuggestionsService.getSmartSuggestions(pharmacyId);
  }

  /**
   * ==========================================================
   * INCOMING ORDERS
   * ==========================================================
   *
   * يعرض طلبات المورد المرسلة والتي لم يتم
   * استلام عناصرها بعد.
   *
   * يشمل:
   *
   * UPCOMING
   * TODAY
   * OVERDUE
   */
  @Auth(AuthType.Bearer)
  @Roles(AccountType.PHARMACY)
  @Get('incoming-orders')
  getIncomingOrders(
    @CurrentPharmacy()
    pharmacyId: number,
  ) {
    return this.smartSuggestionsService.getIncomingOrders(pharmacyId);
  }

  @Get(':id')
  findOne(
    @CurrentPharmacy() pharmacyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.purchaseOrderService.findOne(pharmacyId, id);
  }
  @Get('test')
  test(@Req() req: RequestWithUser) {
    return {
      pharmacyId: req.user.sub,
    };
  }
}
