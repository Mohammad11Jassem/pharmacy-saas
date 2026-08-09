import { Injectable } from '@nestjs/common';

import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';

import { CreateSubscriptionCheckoutUseCase } from './use-cases/create-subscription-checkout.usecase';
import { GetSubscriptionPaymentStatusUseCase } from './use-cases/get-subscription-payment-status.usecase';

@Injectable()
export class SubscriptionPaymentService {
  constructor(
    private readonly createSubscriptionCheckoutUseCase: CreateSubscriptionCheckoutUseCase,
    private readonly getSubscriptionPaymentStatusUseCase: GetSubscriptionPaymentStatusUseCase,
  ) {}

  createCheckout(pharmacyId: number, dto: CreateSubscriptionCheckoutDto) {
    return this.createSubscriptionCheckoutUseCase.execute(pharmacyId, dto);
  }
  getPaymentStatus(pharmacyId: number, subscriptionPaymentId: number) {
    return this.getSubscriptionPaymentStatusUseCase.execute(
      pharmacyId,
      subscriptionPaymentId,
    );
  }
}
