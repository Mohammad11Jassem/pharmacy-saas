import type { PrismaClient } from '../../../src/generated/prisma/client';
import { PharmacySubscriptionStatus } from '../../../src/generated/prisma/enums';

export async function seedPharmacySubscription(
  prisma: PrismaClient,
  pharmacyId: number,
): Promise<void> {
  console.log(`Seeding subscription for pharmacy ${pharmacyId}...`);

  // ---------------------------------------------
  // 1. Check pharmacy
  // ---------------------------------------------

  const pharmacy = await prisma.pharmacy.findUnique({
    where: {
      pharmacyId,
    },

    select: {
      pharmacyId: true,
      pharmacyName: true,
    },
  });

  if (!pharmacy) {
    throw new Error(`Pharmacy with id ${pharmacyId} does not exist.`);
  }

  // ---------------------------------------------
  // 2. Get subscription plan
  // ---------------------------------------------

  const plan = await prisma.subscriptionPlan.findUnique({
    where: {
      code: 'PROFESSIONAL',
    },

    select: {
      planId: true,
      code: true,
      name: true,
      durationMonths: true,
      planPrice: true,
      currency: true,
    },
  });

  if (!plan) {
    throw new Error('PROFESSIONAL subscription plan does not exist.');
  }

  // ---------------------------------------------
  // 3. Check existing active subscription
  // ---------------------------------------------

  const existingSubscription = await prisma.pharmacySubscription.findFirst({
    where: {
      pharmacyId,

      status: PharmacySubscriptionStatus.ACTIVE,
    },

    select: {
      pharmacySubscriptionId: true,
    },
  });

  if (existingSubscription) {
    console.log(`✓ Pharmacy ${pharmacyId} already has an ACTIVE subscription.`);

    return;
  }

  // ---------------------------------------------
  // 4. Subscription period
  // ---------------------------------------------

  const startsAt = new Date();

  const endsAt = new Date(startsAt);

  endsAt.setUTCMonth(endsAt.getUTCMonth() + plan.durationMonths);

  // ---------------------------------------------
  // 5. Create subscription
  // ---------------------------------------------

  const subscription = await prisma.pharmacySubscription.create({
    data: {
      pharmacy: {
        connect: {
          pharmacyId,
        },
      },

      plan: {
        connect: {
          planId: plan.planId,
        },
      },

      status: PharmacySubscriptionStatus.ACTIVE,

      startsAt,
      endsAt,

      basePrice: plan.planPrice,
      finalPrice: plan.planPrice,

      currency: plan.currency,
    },

    select: {
      pharmacySubscriptionId: true,

      pharmacyId: true,

      planId: true,

      status: true,

      basePrice: true,

      finalPrice: true,

      currency: true,

      startsAt: true,

      endsAt: true,
    },
  });

  console.log(
    `✓ ${plan.code} subscription created for pharmacy ${pharmacy.pharmacyName}`,
  );

  console.table([subscription]);
}
