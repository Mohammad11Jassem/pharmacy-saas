import { Prisma } from '../../../generated/prisma/client';

/**
 * يجلب فقط البيانات اللازمة لاستخراج tradeName لكل عنصر طلب شراء.
 *
 * PurchaseOrderItem
 *   -> PharmacyDrug
 *     -> Drug
 *       -> GeneralDrug | PrivateDrug
 */
export const purchaseOrderItemsWithTradeNameInclude = {
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
} satisfies Prisma.PurchaseOrderInclude;

export type PurchaseOrderWithTradeNamePayload = Prisma.PurchaseOrderGetPayload<{
  include: typeof purchaseOrderItemsWithTradeNameInclude;
}>;

/**
 * يحذف كائن pharmacyDrug الداخلي،
 * ويضع tradeName مباشرة داخل كل item.
 *
 * يدعم أيضاً النتائج التي تحتوي علاقات إضافية مثل supplier.
 */
export function mapPurchaseOrderResponse<
  T extends PurchaseOrderWithTradeNamePayload,
>(purchaseOrder: T) {
  return {
    ...purchaseOrder,

    items: purchaseOrder.items.map(({ pharmacyDrug, ...item }) => ({
      ...item,

      tradeName:
        pharmacyDrug.drug.generalDrug?.tradeName ??
        pharmacyDrug.drug.privateDrug?.tradeName ??
        null,
    })),
  };
}







/**
 * العلاقات اللازمة لقائمة طلبات الشراء.
 *
 * لا نجلب عناصر الطلب نفسها،
 * وإنما نجلب عددها فقط من قاعدة البيانات.
 */
export const purchaseOrderListInclude = {
  supplier: true,

  _count: {
    select: {
      items: true,
    },
  },
} satisfies Prisma.PurchaseOrderInclude;

export type PurchaseOrderListPayload =
  Prisma.PurchaseOrderGetPayload<{
    include: typeof purchaseOrderListInclude;
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
export function mapPurchaseOrderListResponse(
  purchaseOrder: PurchaseOrderListPayload,
) {
  const { _count, ...data } = purchaseOrder;

  return {
    ...data,
    itemsCount: _count.items,
  };
}