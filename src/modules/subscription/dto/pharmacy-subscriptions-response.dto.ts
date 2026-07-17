import {
  DiscountType,
  OfferScope,
  PharmacySubscriptionStatus,
  SubscriptionPlanType,
} from '../../../generated/prisma/enums';

/*
 * Basic pharmacy information.
 */
export type PharmacySubscriptionsPharmacyResponseDto = {
  pharmacyId: number;

  pharmacyName: string;

  pharmacyCode: string | null;
};

/*
 * Plan information returned with each subscription.
 */
export type PharmacySubscriptionPlanResponseDto = {
  planId: number;

  code: string;

  name: string;

  type: SubscriptionPlanType;

  durationMonths: number;
};

/*
 * Applied offer information.
 *
 * It will be null when no offer was used.
 */
export type PharmacySubscriptionAppliedOfferResponseDto = {
  appliedOfferId: number;

  offerId: number;

  code: string;

  title: string;

  scope: OfferScope;

  discountType: DiscountType;

  discountValue: number;
};

/*
 * One complete pharmacy subscription.
 *
 * This type is used for both:
 *
 * 1- currentSubscription
 * 2- every item inside subscriptions
 *
 * This guarantees that they return
 * the same information.
 */
export type PharmacySubscriptionHistoryItemResponseDto = {
  pharmacySubscriptionId: number;

  status: PharmacySubscriptionStatus;

  startsAt: Date;

  endsAt: Date;

  plan: PharmacySubscriptionPlanResponseDto;

  basePrice: number;

  finalPrice: number;

  currency: string;

  appliedOffer:
    | PharmacySubscriptionAppliedOfferResponseDto
    | null;

  createdAt: Date;

  updatedAt: Date;
};

/*
 * Pagination metadata.
 */
export type PharmacySubscriptionsPaginationResponseDto = {
  page: number;

  limit: number;

  totalItems: number;

  totalPages: number;

  hasNextPage: boolean;

  hasPreviousPage: boolean;
};

/*
 * Complete API response.
 */
export type PharmacySubscriptionsResponseDto = {
  pharmacy: PharmacySubscriptionsPharmacyResponseDto;

  /*
   * The subscription running now.
   *
   * It is returned independently from pagination
   * so the frontend can always access it.
   */
  currentSubscription:
    | PharmacySubscriptionHistoryItemResponseDto
    | null;

  /*
   * Paginated subscription history.
   *
   * Every item contains the same information
   * returned by currentSubscription.
   */
  subscriptions: PharmacySubscriptionHistoryItemResponseDto[];

  pagination: PharmacySubscriptionsPaginationResponseDto;
};