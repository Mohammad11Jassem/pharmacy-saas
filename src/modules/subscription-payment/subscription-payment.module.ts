import { Module } from '@nestjs/common';

import { StripeService } from './stripe/stripe.service';
import { SubscriptionPaymentController } from './subscription-payment.controller';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { CreateSubscriptionCheckoutUseCase } from './use-cases/create-subscription-checkout.usecase';
import { StripeWebhookController } from './stripe-webhook.controller';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { HandleStripeWebhookUseCase } from './use-cases/handle-stripe-webhook.usecase';
import { GetSubscriptionPaymentStatusUseCase } from './use-cases/get-subscription-payment-status.usecase';

@Module({
  controllers: [SubscriptionPaymentController, StripeWebhookController],

  providers: [
    StripeService,

    SubscriptionPaymentService,

    UnitOfWork,

    CreateSubscriptionCheckoutUseCase,

    HandleStripeWebhookUseCase,

    GetSubscriptionPaymentStatusUseCase,
  ],

  exports: [StripeService, SubscriptionPaymentService],
})
export class SubscriptionPaymentModule {}
