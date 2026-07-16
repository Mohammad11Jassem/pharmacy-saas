import {
  DiscountType,
  OfferScope,
  PharmacySubscriptionStatus,
} from '../../../generated/prisma/enums';

export type SubscribePharmacyPlanResponseDto = {
  planId: number;

  code: string;

  name: string;

  durationMonths: number;
};

export type SubscribePharmacyAppliedOfferResponseDto = {
  appliedOfferId: number;

  offerId: number;

  code: string;

  title: string;

  scope: OfferScope;

  discountType: DiscountType;

  discountValue: number;
};

export type SubscribePharmacyResponseDto = {
  pharmacySubscriptionId: number;

  pharmacyId: number;

  status: PharmacySubscriptionStatus;

  startsAt: Date;

  endsAt: Date;

  plan: SubscribePharmacyPlanResponseDto;

  basePrice: number;

  finalPrice: number;

  currency: string;

  appliedOffer:
    | SubscribePharmacyAppliedOfferResponseDto
    | null;
};