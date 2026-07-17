import { Module } from '@nestjs/common';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { AssignPrivateOfferUseCase } from './use-cases/assign-private-offer.usecase';
import { ListPharmaciesWithOffersUseCase } from './use-cases/list-pharmacies-with-offers.usecase';
import { ListPrivateOffersUseCase } from './use-cases/list-private-offers.usecase';
import { ListPublicSubscriptionPlansUseCase } from './use-cases/list-public-subscription-plans.usecase';
import { SubscribePharmacyUseCase } from './use-cases/subscribe-pharmacy.usecase';
import { CreatePlanOfferUseCase } from './use-cases/create-plan-offer.usecase';
import { FindPharmacySubscriptionsUseCase } from './use-cases/find-pharmacy-subscriptions.usecase';

@Module({
  controllers: [
    SubscriptionController,
  ],
  exports: [SubscriptionService],
  providers: [
    SubscriptionService,

    UnitOfWork,

    ListPublicSubscriptionPlansUseCase,

    SubscribePharmacyUseCase,

    ListPrivateOffersUseCase,

    AssignPrivateOfferUseCase,

    ListPharmaciesWithOffersUseCase,
    CreatePlanOfferUseCase,
    FindPharmacySubscriptionsUseCase
  ],
})
export class SubscriptionModule {}