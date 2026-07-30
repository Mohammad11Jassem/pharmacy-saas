// import { Prisma } from '../../../generated/prisma/client';

// /**
//  * نجلب فقط العلاقات اللازمة لمعرفة tradeName.
//  *
//  * PharmacyDrug
//  *   → Drug
//  *     → GeneralDrug أو PrivateDrug
//  */
// export const customerRequestWithTradeNameInclude = {
//   items: {
//     include: {
//       pharmacyDrug: {
//         select: {
//           drug: {
//             select: {
//               generalDrug: {
//                 select: {
//                   tradeName: true,
//                 },
//               },

//               privateDrug: {
//                 select: {
//                   tradeName: true,
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//   },
// } satisfies Prisma.CustomerRequestInclude;

// export type CustomerRequestWithTradeNamePayload =
//   Prisma.CustomerRequestGetPayload<{
//     include: typeof customerRequestWithTradeNameInclude;
//   }>;

// /**
//  * يحذف العلاقة الداخلية pharmacyDrug
//  * ويضيف tradeName مباشرة داخل كل item.
//  */
// export function mapCustomerRequestResponse(
//   request: CustomerRequestWithTradeNamePayload,
// ) {
//   return {
//     ...request,

//     items: request.items.map(({ pharmacyDrug, ...item }) => ({
//       ...item,

//       tradeName:
//         pharmacyDrug.drug.generalDrug?.tradeName ??
//         pharmacyDrug.drug.privateDrug?.tradeName ??
//         null,
//     })),
//   };
// }









// /**
//  * العلاقات المطلوبة لقائمة طلبات الزبائن.
//  *
//  * لا يتم جلب عناصر الطلب نفسها،
//  * وإنما عدد العناصر فقط.
//  */
// export const customerRequestListInclude = {
//   _count: {
//     select: {
//       items: true,
//     },
//   },
// } satisfies Prisma.CustomerRequestInclude;

// export type CustomerRequestListPayload =
//   Prisma.CustomerRequestGetPayload<{
//     include: typeof customerRequestListInclude;
//   }>;

// /**
//  * يحول:
//  *
//  * _count: {
//  *   items: 2
//  * }
//  *
//  * إلى:
//  *
//  * itemsCount: 2
//  */
// export function mapCustomerRequestListResponse(
//   request: CustomerRequestListPayload,
// ) {
//   const { _count, ...data } = request;

//   return {
//     ...data,
//     itemsCount: _count.items,
//   };
// }







import { resolveLargestSaleUnit } from '../../../common/sale-units/largest-sale-unit.util';
import { Prisma } from '../../../generated/prisma/client';

/**
 * Relations required by the customer-request details endpoint.
 *
 * Each request item includes only the drug packaging information needed to:
 * - resolve the trade name;
 * - resolve the largest sale unit;
 * - calculate the remaining requested quantity.
 *
 * The invoices themselves are not loaded here. Only their count is returned;
 * the paginated history is available from /:id/sale-invoices.
 */
export const customerRequestDetailsInclude = {
  items: {
    orderBy: {
      customerRequestItemId: 'asc',
    },
    include: {
      pharmacyDrug: {
        select: {
          sellPart: true,
          drug: {
            select: {
              generalDrug: {
                select: {
                  tradeName: true,
                  unitsPerBox: true,
                },
              },
              privateDrug: {
                select: {
                  tradeName: true,
                  unitsPerBox: true,
                },
              },
            },
          },
        },
      },
    },
  },
  _count: {
    select: {
      saleInvoices: true,
    },
  },
} satisfies Prisma.CustomerRequestInclude;

export type CustomerRequestDetailsPayload =
  Prisma.CustomerRequestGetPayload<{
    include: typeof customerRequestDetailsInclude;
  }>;

/**
 * Maps the internal Prisma relations to a frontend-oriented customer-request
 * details response.
 */
export function mapCustomerRequestResponse(
  request: CustomerRequestDetailsPayload,
) {
  const { items, _count, ...requestData } = request;

  const mappedItems = items.map(({ pharmacyDrug, ...item }) => {
    const drugData =
      pharmacyDrug.drug.generalDrug ?? pharmacyDrug.drug.privateDrug;

    if (!drugData) {
      throw new Error(
        `Drug data is missing for pharmacyDrugId ${item.pharmacyDrugId}`,
      );
    }

    const largestSaleUnit = resolveLargestSaleUnit(
      drugData.unitsPerBox,
      pharmacyDrug.sellPart,
    );

    const remainingQuantity = Math.max(
      item.requestedQuantity - item.fulfilledQuantity,
      0,
    );

    return {
      ...item,
      tradeName: drugData.tradeName,
      unitType: largestSaleUnit.unitType,
      unitLabel: largestSaleUnit.unitLabel,
      unitFactorToBase: largestSaleUnit.unitFactorToBase,
      remainingQuantity,
      isFulfilled: remainingQuantity === 0,
    };
  });

  const fulfilledItemsCount = mappedItems.filter(
    (item) => item.isFulfilled,
  ).length;

  const remainingItemsCount = mappedItems.length - fulfilledItemsCount;

  return {
    ...requestData,
    fulfillmentSummary: {
      itemsCount: mappedItems.length,
      fulfilledItemsCount,
      remainingItemsCount,
      saleInvoicesCount: _count.saleInvoices,
      isFullyFulfilled:
        mappedItems.length > 0 && remainingItemsCount === 0,
    },
    items: mappedItems,
  };
}

/**
 * Relations required by the customer-request list endpoint.
 * Only the items count is loaded, not the items themselves.
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
 * Converts _count.items to the frontend-friendly itemsCount property.
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
