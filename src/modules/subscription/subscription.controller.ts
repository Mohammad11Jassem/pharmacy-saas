import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AccountType } from '../../generated/prisma/enums';
import { Auth } from '../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../iam/authentication/enums/auth-type.enum';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import { AssignPrivateOfferDto } from './dto/assign-private-offer.dto';
import { ListSubscriptionPharmaciesDto } from './dto/list-subscription-pharmacies.dto';
import { SubscribePharmacyDto } from './dto/subscribe-pharmacy.dto';
import { SubscriptionService } from './subscription.service';
import { CreatePlanOfferDto } from './dto/create-plan-offer.dto';
import { ListPharmacySubscriptionsDto } from './dto/list-pharmacy-subscriptions.dto';

@ApiTags('Subscription')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ─── PUBLIC PLANS ─────────────────────────────

  @Auth(AuthType.None)
  @Get('plans/public')
  @ResponseMessage('Public subscription plans retrieved successfully.')
  listPublicPlans() {
    return this.subscriptionService.listPublicPlans();
  }

  // ─── ADMIN SUBSCRIBE PHARMACY ────────────────

  @Auth(AuthType.Bearer)
  @Roles(AccountType.ADMIN)
  @Post('admin/pharmacies/:pharmacyId/subscribe')
  @ResponseMessage('Pharmacy subscribed successfully.')
  subscribePharmacy(
    @Param('pharmacyId', ParseIntPipe)
    pharmacyId: number,

    @Body()
    dto: SubscribePharmacyDto,
  ) {
    return this.subscriptionService.subscribePharmacy(pharmacyId, dto);
  }

  // ─── PHARMACY PRIVATE OFFERS ─────────────────

  @Auth(AuthType.Bearer)
  @Roles(AccountType.PHARMACY)
  @Get('private-offers/me')
  @ResponseMessage('Private offers retrieved successfully.')
  listMyPrivateOffers(
    @ActiveUser('sub')
    pharmacyId: number,
  ) {
    // return this.subscriptionService.listPrivateOffers(pharmacyId);
    return 'This endpoint is temporarily disabled. Please call the backend team to enable it.';
  }

  // ─── ADMIN: PHARMACY PRIVATE OFFERS ──────────

  @Auth(AuthType.Bearer)
  @Roles(AccountType.ADMIN)
  @Get('admin/pharmacies/:pharmacyId/plans/:planId/private-offers')
  @ResponseMessage('Pharmacy private offers retrieved successfully.')
  listPharmacyPrivateOffers(
    @Param('pharmacyId', ParseIntPipe)
    pharmacyId: number,

    @Param('planId', ParseIntPipe)
    planId: number,
  ) {
    return this.subscriptionService.listPrivateOffers(pharmacyId, planId);
  }

  // ─── ADMIN ASSIGN PRIVATE OFFER ───────────────

  @Auth(AuthType.Bearer)
  @Roles(AccountType.ADMIN)
  @Post('admin/private-offers/:offerId/grants')
  @ResponseMessage('Private offer assigned successfully.')
  assignPrivateOffer(
    @Param('offerId', ParseIntPipe)
    offerId: number,

    @Body()
    dto: AssignPrivateOfferDto,
  ) {
    return this.subscriptionService.assignPrivateOffer(offerId, dto);
  }

  // ─── ADMIN LIST PHARMACIES ───────────────────

  @Auth(AuthType.Bearer)
  @Roles(AccountType.ADMIN)
  @Get('admin/pharmacies')
  @ResponseMessage('Pharmacies retrieved successfully.')
  listPharmacies(
    @Query()
    dto: ListSubscriptionPharmaciesDto,
  ) {
    return this.subscriptionService.listPharmacies(dto);
  }

  // ─── ADMIN CREATE PLAN OFFER ───────────────────

  @Auth(AuthType.Bearer)
  @Roles(AccountType.ADMIN)
  @Post('admin/plans/:planId/offers')
  @ResponseMessage('Plan offer created successfully.')
  createPlanOffer(
    @Param('planId', ParseIntPipe)
    planId: number,

    @Body()
    dto: CreatePlanOfferDto,
  ) {
    return this.subscriptionService.createPlanOffer(planId, dto);
  }

  @Get('admin/pharmacies/:pharmacyId/subscriptions')
  @Roles(AccountType.ADMIN)
  findPharmacySubscriptions(
    @Param('pharmacyId', ParseIntPipe)
    pharmacyId: number,
    @Query()
    dto: ListPharmacySubscriptionsDto,
  ) {
    return this.subscriptionService.findPharmacySubscriptions(pharmacyId, dto);
  }
}
