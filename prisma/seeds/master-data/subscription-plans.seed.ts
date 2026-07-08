import type { PrismaClient } from '../../../src/generated/prisma/client';
import {
  DiscountType,
  OfferScope,
  SubscriptionPlanStatus,
  SubscriptionPlanType,
} from '../../../src/generated/prisma/enums';

type SubscriptionPlanSeed = {
  code: string;
  name: string;
  description: string;
  durationMonths: number;
  planPrice: string;
  currency: string;
  type: SubscriptionPlanType;

  offer: {
    code: string;
    title: string;
    description: string;
    discountType: DiscountType;
    discountValue: string;
  };
};

const subscriptionPlans: SubscriptionPlanSeed[] = [
  {
    code: 'STARTER',
    name: 'Starter',
    description:
      'ابدأ إدارة صيدليتك من مكان واحد. نظّم الأدوية والمخزون والموردين والفواتير، وتابع التنبيهات والعمليات اليومية بسهولة ووضوح.',

    durationMonths: 12,

    planPrice: '1500000.00',

    currency: 'SP',

    type: SubscriptionPlanType.STARTER,

    offer: {
      code: 'STARTER_LAUNCH_20',

      title: 'عرض البداية',

      description:
        'خصم خاص لفترة محدودة لمساعدة الصيدليات على بدء التحول إلى الإدارة الرقمية بسهولة.',

      discountType: DiscountType.PERCENTAGE,

      discountValue: '20.00',
    },
  },

  {
    code: 'PROFESSIONAL',
    name: 'Professional',
    description:
      'شغّل صيدليتك بذكاء أكبر مع أدوات متقدمة لإدارة العمليات، متابعة المخزون، تنظيم الطلبات، والاستفادة من المساعد الدوائي الذكي لدعم العمل اليومي.',

    durationMonths: 12,

    planPrice: '3000000.00',

    currency: 'SP',

    type: SubscriptionPlanType.PROFESSIONAL,

    offer: {
      code: 'PROFESSIONAL_LAUNCH_25',

      title: 'العرض الاحترافي',

      description:
        'احصل على خصم لفترة محدودة واستفد من أدوات أكثر تقدماً لإدارة وتشغيل الصيدلية بفعالية.',

      discountType: DiscountType.PERCENTAGE,

      discountValue: '25.00',
    },
  },

  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    description:
      'استفد من الإمكانات الكاملة للبيانات والذكاء الاصطناعي. تحليلات متقدمة، توقع الطلب على الأدوية، دعم قرارات إعادة الطلب، ومراقبة مخاطر انتهاء الصلاحية لتحسين أداء الصيدلية.',

    durationMonths: 12,

    planPrice: '5000000.00',

    currency: 'SP',

    type: SubscriptionPlanType.ENTERPRISE,

    offer: {
      code: 'ENTERPRISE_LAUNCH_30',

      title: 'عرض الذكاء المتقدم',

      description:
        'خصم مميز لفترة محدودة للوصول إلى أدوات التحليل والذكاء الاصطناعي المتقدمة في Medixa.',

      discountType: DiscountType.PERCENTAGE,

      discountValue: '30.00',
    },
  },
];

function createOfferPeriod(): {
  startsAt: Date;
  endsAt: Date;
} {
  const startsAt = new Date();

  startsAt.setUTCHours(
    0,
    0,
    0,
    0,
  );

  const endsAt = new Date(startsAt);

  endsAt.setUTCMonth(
    endsAt.getUTCMonth() + 3,
  );

  endsAt.setUTCHours(
    23,
    59,
    59,
    999,
  );

  return {
    startsAt,
    endsAt,
  };
}

export async function seedSubscriptionPlans(
  prisma: PrismaClient,
): Promise<void> {
  console.log(
    'Seeding subscription plans and public offers...',
  );

  const {
    startsAt,
    endsAt,
  } = createOfferPeriod();

  for (
    const seedPlan of subscriptionPlans
  ) {
    const plan =
      await prisma.subscriptionPlan.upsert({
        where: {
          code: seedPlan.code,
        },

        update: {
          name: seedPlan.name,

          description:
            seedPlan.description,

          durationMonths:
            seedPlan.durationMonths,

          planPrice:
            seedPlan.planPrice,

          currency:
            seedPlan.currency,

          type:
            seedPlan.type,

          status:
            SubscriptionPlanStatus.ACTIVE,
        },

        create: {
          code:
            seedPlan.code,

          name:
            seedPlan.name,

          description:
            seedPlan.description,

          durationMonths:
            seedPlan.durationMonths,

          planPrice:
            seedPlan.planPrice,

          currency:
            seedPlan.currency,

          type:
            seedPlan.type,

          status:
            SubscriptionPlanStatus.ACTIVE,
        },

        select: {
          planId: true,
          code: true,
          name: true,
        },
      });

    const offer =
      await prisma.planOffer.upsert({
        where: {
          code:
            seedPlan.offer.code,
        },

        update: {
          planId:
            plan.planId,

          title:
            seedPlan.offer.title,

          description:
            seedPlan.offer.description,

          scope:
            OfferScope.PUBLIC,

          discountType:
            seedPlan.offer
              .discountType,

          discountValue:
            seedPlan.offer
              .discountValue,

          isActive:
            true,

          startsAt,

          endsAt,
        },

        create: {
          planId:
            plan.planId,

          code:
            seedPlan.offer.code,

          title:
            seedPlan.offer.title,

          description:
            seedPlan.offer.description,

          scope:
            OfferScope.PUBLIC,

          discountType:
            seedPlan.offer
              .discountType,

          discountValue:
            seedPlan.offer
              .discountValue,

          isActive:
            true,

          startsAt,

          endsAt,
        },

        select: {
          offerId: true,
          code: true,
          title: true,
          discountType: true,
          discountValue: true,
        },
      });

    console.log(
      `✓ Plan ${plan.code} seeded with public offer ${offer.code}`,
    );
  }

  console.log(
    'Subscription plans and public offers seeded successfully.',
  );
}