import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { AccountType } from '../../generated/prisma/enums';

import { Auth } from '../../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../../iam/authentication/enums/auth-type.enum';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';

import { StripeService } from './stripe/stripe.service';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';

@Controller('subscription-payments')
export class SubscriptionPaymentController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
  ) {}

  @Auth(AuthType.Bearer)
  @Roles(AccountType.ADMIN)
  @Get('stripe/test')
  testStripeConnection() {
    return this.stripeService.testConnection();
  }

  @Auth(AuthType.Bearer)
  @Roles(AccountType.PHARMACY_OWNER)
  @Post('pharmacies/:pharmacyId/checkout')
  @ResponseMessage('Subscription checkout created successfully.')
  createCheckout(
    @ActiveUser('sub') ownerUserId: number,

    @Param('pharmacyId', ParseIntPipe)
    pharmacyId: number,
    @Body()
    dto: CreateSubscriptionCheckoutDto,
  ) {
    return this.subscriptionPaymentService.createCheckout(
      ownerUserId,
      pharmacyId,
      dto,
    );
  }

  @Auth(AuthType.Bearer)
  @Roles(AccountType.PHARMACY_OWNER)
  @Get(':id/status')
  @ResponseMessage('Subscription payment status retrieved successfully.')
  getPaymentStatus(
    @ActiveUser('sub') ownerUserId: number,

    @Param('id', ParseIntPipe)
    subscriptionPaymentId: number,
  ) {
    return this.subscriptionPaymentService.getPaymentStatus(
      ownerUserId,
      subscriptionPaymentId,
    );
  }
}
