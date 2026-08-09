import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey =
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');

    this.stripe = new Stripe(secretKey);
  }

  getClient(): Stripe {
    return this.stripe;
  }

  createCheckoutSession(
    params: Stripe.Checkout.SessionCreateParams,
    idempotencyKey: string,
  ) {
    return this.stripe.checkout.sessions.create(params, {
      idempotencyKey,
    });
  }

  retrieveCheckoutSession(stripeCheckoutSessionId: string) {
    return this.stripe.checkout.sessions.retrieve(stripeCheckoutSessionId);
  }

  async testConnection() {
    return this.stripe.balance.retrieve();
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }
}
