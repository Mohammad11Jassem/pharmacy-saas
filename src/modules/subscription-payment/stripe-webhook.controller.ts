import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';

import type {
  Request,
} from 'express';

import { Auth } from '../../iam/authentication/decorators/auth.decorator';

import {
  AuthType,
} from '../../iam/authentication/enums/auth-type.enum';

import { HandleStripeWebhookUseCase } from './use-cases/handle-stripe-webhook.usecase';

import { StripeService } from './stripe/stripe.service';

@Auth(AuthType.None)
@Controller('subscription-payments/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeService:
      StripeService,

    private readonly handleStripeWebhookUseCase:
      HandleStripeWebhookUseCase,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req()
    request: RawBodyRequest<Request>,

    @Headers('stripe-signature')
    signature?: string,
  ) {
    if (!signature) {
      throw new BadRequestException(
        'Missing Stripe signature.',
      );
    }

    if (!request.rawBody) {
      throw new BadRequestException(
        'Missing raw request body.',
      );
    }

    let event;

    try {
      event =
        this.stripeService.constructWebhookEvent(
          request.rawBody,
          signature,
        );
    } catch {
      throw new BadRequestException(
        'Invalid Stripe webhook signature.',
      );
    }

    await this.handleStripeWebhookUseCase.execute(
      event,
    );

    return {
      received: true,
    };
  }
}