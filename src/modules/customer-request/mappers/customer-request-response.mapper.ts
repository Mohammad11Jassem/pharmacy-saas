import { Prisma } from '../../../generated/prisma/client';

/**
 * نجلب فقط العلاقات اللازمة لمعرفة tradeName.
 *
 * PharmacyDrug
 *   → Drug
 *     → GeneralDrug أو PrivateDrug
 */
export const customerRequestWithTradeNameInclude = {
  items: {
    include: {
      pharmacyDrug: {
        select: {
          drug: {
            select: {
              generalDrug: {
                select: {
                  tradeName: true,
                },
              },

              privateDrug: {
                select: {
                  tradeName: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CustomerRequestInclude;

export type CustomerRequestWithTradeNamePayload =
  Prisma.CustomerRequestGetPayload<{
    include: typeof customerRequestWithTradeNameInclude;
  }>;

/**
 * يحذف العلاقة الداخلية pharmacyDrug
 * ويضيف tradeName مباشرة داخل كل item.
 */
export function mapCustomerRequestResponse(
  request: CustomerRequestWithTradeNamePayload,
) {
  return {
    ...request,

    items: request.items.map(({ pharmacyDrug, ...item }) => ({
      ...item,

      tradeName:
        pharmacyDrug.drug.generalDrug?.tradeName ??
        pharmacyDrug.drug.privateDrug?.tradeName ??
        null,
    })),
  };
}









/**
 * العلاقات المطلوبة لقائمة طلبات الزبائن.
 *
 * لا يتم جلب عناصر الطلب نفسها،
 * وإنما عدد العناصر فقط.
 */
export const customerRequestListInclude = {
  _count: {
    select: {
      items: true,
    },
  },
} satisfies Prisma.CustomerRequestInclude;

export type CustomerRequestListPayload =
  Prisma.CustomerRequestGetPayload<{
    include: typeof customerRequestListInclude;
  }>;

/**
 * يحول:
 *
 * _count: {
 *   items: 2
 * }
 *
 * إلى:
 *
 * itemsCount: 2
 */
export function mapCustomerRequestListResponse(
  request: CustomerRequestListPayload,
) {
  const { _count, ...data } = request;

  return {
    ...data,
    itemsCount: _count.items,
  };
}