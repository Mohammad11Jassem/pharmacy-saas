export type RagSubscriptionPolicy = {
  pharmacySubscriptionId: number;
  pharmacyId: number;

  planId: number;
  planCode: string;
  planName: string;

  ragEnabled: boolean;

  /**
   * null means unlimited.
   */
  maxCompletedTurnsPerConversation: number | null;

  /**
   * null means unlimited.
   */
  monthlyRequestLimit: number | null;

  /**
   * Current monthly usage window.
   *
   * It is anchored to the subscription startsAt date,
   * not necessarily to the first day of the calendar month.
   */
  usagePeriodStart: Date;
  usagePeriodEnd: Date;

  subscriptionStartsAt: Date;
  subscriptionEndsAt: Date;
};