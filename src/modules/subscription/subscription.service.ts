import { Injectable } from '@nestjs/common';
import { AssignPrivateOfferDto } from './dto/assign-private-offer.dto';
import { ListSubscriptionPharmaciesDto } from './dto/list-subscription-pharmacies.dto';
import { SubscribePharmacyDto } from './dto/subscribe-pharmacy.dto';
import { AssignPrivateOfferUseCase } from './use-cases/assign-private-offer.usecase';
import { ListPharmaciesWithOffersUseCase } from './use-cases/list-pharmacies-with-offers.usecase';
import { ListPrivateOffersUseCase } from './use-cases/list-private-offers.usecase';
import { ListPublicSubscriptionPlansUseCase } from './use-cases/list-public-subscription-plans.usecase';
import { SubscribePharmacyUseCase } from './use-cases/subscribe-pharmacy.usecase';
import { CreatePlanOfferUseCase } from './use-cases/create-plan-offer.usecase';
import { CreatePlanOfferDto } from './dto/create-plan-offer.dto';
import { Prisma } from '../../generated/prisma/client';
import { FindPharmacySubscriptionsUseCase } from './use-cases/find-pharmacy-subscriptions.usecase';
import { ListPharmacySubscriptionsDto } from './dto/list-pharmacy-subscriptions.dto';
import { PharmacySubscriptionsResponseDto } from './dto/pharmacy-subscriptions-response.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly listPublicSubscriptionPlansUseCase: ListPublicSubscriptionPlansUseCase,

    private readonly subscribePharmacyUseCase: SubscribePharmacyUseCase,

    private readonly listPrivateOffersUseCase: ListPrivateOffersUseCase,

    private readonly assignPrivateOfferUseCase: AssignPrivateOfferUseCase,

    private readonly listPharmaciesWithOffersUseCase: ListPharmaciesWithOffersUseCase,
    private readonly createPlanOfferUseCase: CreatePlanOfferUseCase,
    private readonly findPharmacySubscriptionsUseCase: FindPharmacySubscriptionsUseCase,
  ) {}

  listPublicPlans() {
    return this.listPublicSubscriptionPlansUseCase.execute();
  }

  subscribePharmacy(pharmacyId: number, dto: SubscribePharmacyDto) {
    return this.subscribePharmacyUseCase.execute(pharmacyId, dto);
  }

  listPrivateOffers(pharmacyId: number) {
    return this.listPrivateOffersUseCase.execute(pharmacyId);
  }

  assignPrivateOffer(offerId: number, dto: AssignPrivateOfferDto) {
    return this.assignPrivateOfferUseCase.execute(offerId, dto);
  }

  listPharmacies(dto: ListSubscriptionPharmaciesDto) {
    return this.listPharmaciesWithOffersUseCase.execute(dto);
  }

  createPlanOffer(planId: number, dto: CreatePlanOfferDto) {
    return this.createPlanOfferUseCase.execute(planId, dto);
  }

  subscribePharmacyInsideTransaction(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    dto: SubscribePharmacyDto,
  ) {
    return this.subscribePharmacyUseCase.executeInsideTransaction(
      tx,
      pharmacyId,
      dto,
    );
  }

  findPharmacySubscriptions(
    pharmacyId: number,
    dto: ListPharmacySubscriptionsDto,
  ): Promise<PharmacySubscriptionsResponseDto> {
    return this.findPharmacySubscriptionsUseCase.execute(pharmacyId, dto);
  }
}
