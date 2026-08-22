import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  SaleInvoiceDetailsFrontendRecord,
  saleInvoiceDetailsFrontendSelect,
} from '../queries/sale-invoice-details-frontend.query';
import {
  CustomerRequestItemExecutionSnapshot,
  mapSaleInvoiceDetailsFrontendResponse,
} from '../mappers/sale-invoice-details-frontend.mapper';
import { calculateSalePaymentSummary } from '../utils/sale-payment-summary.util';

type ExecutionSourceItem = {
  saleInvoiceItemId: number;
  customerRequestItemId: number | null;
  customerRequestItem: {
    requestedQuantity: number;
  } | null;
};
@Injectable()
export class FindSaleInvoiceByIdUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, saleInvoiceId: number) {
    const saleInvoice = await this.prisma.saleInvoice.findFirst({
      where: {
        saleInvoiceId,
        pharmacyInvoice: {
          pharmacyId,
          invoiceType: PharmacyInvoiceType.SALE,
        },
      },

      include: {
        pharmacyInvoice: {
          include: {
            patient: true,
          },
        },

        customerRequest: {
          select: {
            customerRequestId: true,
            customerName: true,
            customerPhone: true,
            notes: true,
            status: true,
            requestedAt: true,
            completedAt: true,
            cancelledAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        items: {
          include: {
            customerRequestItem: {
              select: {
                customerRequestItemId: true,
                customerRequestId: true,
                pharmacyDrugId: true,
                requestedQuantity: true,
                fulfilledQuantity: true,
                status: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
              },
            },

            /**
             * نجلب pharmacyDrug داخلياً فقط للوصول إلى tradeName.
             * لن نعيد pharmacyDrug ضمن الـ response.
             */
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
        returns: {
          where: {
            pharmacyInvoice: {
              status: PharmacyInvoiceStatus.POSTED,
            },
          },
          select: {
            subtotalRefund: true,
          },
        },
      },
    });

    if (!saleInvoice) {
      throw new NotFoundException('Sale invoice not found');
    }

    const executionBySaleItemId =
      await this.buildCustomerRequestExecutionBySaleItemId(
        saleInvoice.customerRequestId,
        saleInvoice.items,
      );

    const { returns, ...saleInvoiceFields } = saleInvoice;

    const paymentSummary = calculateSalePaymentSummary(
      saleInvoice.totalAmount,
      saleInvoice.paidAmount,
      returns.map((returnInvoice) => returnInvoice.subtotalRefund),
    );

    return {
      ...saleInvoiceFields,
      ...paymentSummary,

      items: saleInvoice.items.map((item) => {
        /**
         * نستخرج pharmacyDrug حتى لا يظهر داخل الـ response.
         * بقية خصائص العنصر تبقى كما كانت في مواضعها الحالية.
         */
        const { pharmacyDrug, ...itemFields } = item;

        const tradeName =
          pharmacyDrug.drug.generalDrug?.tradeName ??
          pharmacyDrug.drug.privateDrug?.tradeName ??
          null;

        return {
          ...itemFields,

          /**
           * بدلاً من:
           * item.pharmacyDrug.drug.generalDrug.tradeName
           *
           * سيقرأ الفرونت:
           * item.tradeName
           */
          tradeName,

          customerRequestExecution:
            executionBySaleItemId.get(item.saleInvoiceItemId) ?? null,

          /**
           * لأن displayQuantity غير مخزنة في قاعدة البيانات،
           * نحسبها من الكمية الأساسية ومعامل التحويل.
           */
          displayQuantity:
            item.unitFactorToBase > 0
              ? item.baseQuantity / item.unitFactorToBase
              : null,
        };
      }),
    };
  }

  async executeFrontendCandidate(pharmacyId: number, saleInvoiceId: number) {
    const saleInvoice = await this.prisma.saleInvoice.findFirst({
      where: {
        saleInvoiceId,
        pharmacyInvoice: {
          pharmacyId,
          invoiceType: PharmacyInvoiceType.SALE,
        },
      },
      select: saleInvoiceDetailsFrontendSelect,
    });

    if (!saleInvoice) {
      throw new NotFoundException('Sale invoice not found');
    }

    const executionBySaleItemId =
      await this.buildCustomerRequestExecutionBySaleItemId(
        saleInvoice.customerRequest?.customerRequestId ?? null,
        saleInvoice.items,
      );

    return mapSaleInvoiceDetailsFrontendResponse(
      saleInvoice,
      executionBySaleItemId,
    );
  }

  private async buildCustomerRequestExecutionBySaleItemId(
    customerRequestId: number | null,
    items: readonly ExecutionSourceItem[],
  ): Promise<Map<number, CustomerRequestItemExecutionSnapshot>> {
    if (customerRequestId === null) {
      return new Map();
    }

    const linkedItems = items.filter(
      (item) =>
        item.customerRequestItemId !== null &&
        item.customerRequestItem !== null,
    );

    if (linkedItems.length === 0) {
      return new Map();
    }

    const requestItemIds = [
      ...new Set(
        linkedItems.map((item) => item.customerRequestItemId as number),
      ),
    ];

    const history = await this.prisma.saleInvoiceItem.findMany({
      where: {
        customerRequestItemId: {
          in: requestItemIds,
        },
        saleInvoice: {
          customerRequestId,
          pharmacyInvoice: {
            status: PharmacyInvoiceStatus.POSTED,
          },
        },
      },
      select: {
        saleInvoiceItemId: true,
        saleInvoiceId: true,
        customerRequestItemId: true,
        baseQuantity: true,
        unitFactorToBase: true,
        saleInvoice: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    history.sort((left, right) => {
      const createdAtDifference =
        left.saleInvoice.createdAt.getTime() -
        right.saleInvoice.createdAt.getTime();

      if (createdAtDifference !== 0) {
        return createdAtDifference;
      }

      if (left.saleInvoiceId !== right.saleInvoiceId) {
        return left.saleInvoiceId - right.saleInvoiceId;
      }

      return left.saleInvoiceItemId - right.saleInvoiceItemId;
    });

    const requestedQuantityByRequestItemId = new Map(
      linkedItems.map((item) => [
        item.customerRequestItemId as number,
        item.customerRequestItem?.requestedQuantity ?? 0,
      ]),
    );

    const currentSaleItemIds = new Set(
      linkedItems.map((item) => item.saleInvoiceItemId),
    );

    const fulfilledSoFarByRequestItemId = new Map<number, number>();
    const result = new Map<number, CustomerRequestItemExecutionSnapshot>();

    for (const historyItem of history) {
      const requestItemId = historyItem.customerRequestItemId;

      if (requestItemId === null) {
        continue;
      }

      const requestedQuantity =
        requestedQuantityByRequestItemId.get(requestItemId);

      if (requestedQuantity === undefined) {
        continue;
      }

      const soldQuantity =
        historyItem.unitFactorToBase > 0
          ? historyItem.baseQuantity / historyItem.unitFactorToBase
          : 0;

      const fulfilledBeforeInvoice =
        fulfilledSoFarByRequestItemId.get(requestItemId) ?? 0;

      const remainingBeforeInvoice = Math.max(
        requestedQuantity - fulfilledBeforeInvoice,
        0,
      );

      const appliedToRequestQuantity = Math.min(
        soldQuantity,
        remainingBeforeInvoice,
      );

      const extraSaleQuantity = Math.max(
        soldQuantity - appliedToRequestQuantity,
        0,
      );

      const fulfilledQuantityAfterInvoice = Math.min(
        fulfilledBeforeInvoice + appliedToRequestQuantity,
        requestedQuantity,
      );

      const remainingQuantityAfterInvoice = Math.max(
        requestedQuantity - fulfilledQuantityAfterInvoice,
        0,
      );

      fulfilledSoFarByRequestItemId.set(
        requestItemId,
        fulfilledQuantityAfterInvoice,
      );

      if (currentSaleItemIds.has(historyItem.saleInvoiceItemId)) {
        result.set(historyItem.saleInvoiceItemId, {
          customerRequestItemId: requestItemId,
          requestedQuantity,
          soldQuantity,
          appliedToRequestQuantity,
          extraSaleQuantity,
          fulfilledQuantityAfterInvoice,
          remainingQuantityAfterInvoice,
        });
      }
    }

    return result;
  }

  // async executeFrontendCandidate(pharmacyId: number, saleInvoiceId: number) {
  //   const saleInvoice = await this.prisma.saleInvoice.findFirst({
  //     where: {
  //       saleInvoiceId,
  //       pharmacyInvoice: {
  //         pharmacyId,
  //         invoiceType: PharmacyInvoiceType.SALE,
  //       },
  //     },
  //     select: saleInvoiceDetailsFrontendSelect,
  //   });

  //   if (!saleInvoice) {
  //     throw new NotFoundException('Sale invoice not found');
  //   }

  //   const executionBySaleItemId =
  //     await this.buildCustomerRequestExecutionBySaleItemId(saleInvoice);

  //   return mapSaleInvoiceDetailsFrontendResponse(
  //     saleInvoice,
  //     executionBySaleItemId,
  //   );
  // }

  // private async buildCustomerRequestExecutionBySaleItemId(
  //   saleInvoice: SaleInvoiceDetailsFrontendRecord,
  // ): Promise<Map<number, CustomerRequestItemExecutionSnapshot>> {
  //   if (!saleInvoice.customerRequest) {
  //     return new Map();
  //   }

  //   const linkedItems = saleInvoice.items.filter(
  //     (item) =>
  //       item.customerRequestItemId !== null &&
  //       item.customerRequestItem !== null,
  //   );

  //   if (linkedItems.length === 0) {
  //     return new Map();
  //   }

  //   const requestItemIds = [
  //     ...new Set(
  //       linkedItems.map((item) => item.customerRequestItemId as number),
  //     ),
  //   ];

  //   const history = await this.prisma.saleInvoiceItem.findMany({
  //     where: {
  //       customerRequestItemId: {
  //         in: requestItemIds,
  //       },
  //       saleInvoice: {
  //         customerRequestId: saleInvoice.customerRequest.customerRequestId,
  //         pharmacyInvoice: {
  //           status: PharmacyInvoiceStatus.POSTED,
  //         },
  //       },
  //     },
  //     select: {
  //       saleInvoiceItemId: true,
  //       saleInvoiceId: true,
  //       customerRequestItemId: true,
  //       baseQuantity: true,
  //       unitFactorToBase: true,
  //       saleInvoice: {
  //         select: {
  //           createdAt: true,
  //         },
  //       },
  //     },
  //   });

  //   history.sort((left, right) => {
  //     const createdAtDifference =
  //       left.saleInvoice.createdAt.getTime() -
  //       right.saleInvoice.createdAt.getTime();

  //     if (createdAtDifference !== 0) {
  //       return createdAtDifference;
  //     }

  //     if (left.saleInvoiceId !== right.saleInvoiceId) {
  //       return left.saleInvoiceId - right.saleInvoiceId;
  //     }

  //     return left.saleInvoiceItemId - right.saleInvoiceItemId;
  //   });

  //   const requestedQuantityByRequestItemId = new Map(
  //     linkedItems.map((item) => [
  //       item.customerRequestItemId as number,
  //       item.customerRequestItem?.requestedQuantity ?? 0,
  //     ]),
  //   );

  //   const currentSaleItemIds = new Set(
  //     linkedItems.map((item) => item.saleInvoiceItemId),
  //   );

  //   const fulfilledSoFarByRequestItemId = new Map<number, number>();
  //   const result = new Map<number, CustomerRequestItemExecutionSnapshot>();

  //   for (const historyItem of history) {
  //     const customerRequestItemId = historyItem.customerRequestItemId;

  //     if (customerRequestItemId === null) {
  //       continue;
  //     }

  //     const requestedQuantity = requestedQuantityByRequestItemId.get(
  //       customerRequestItemId,
  //     );

  //     if (requestedQuantity === undefined) {
  //       continue;
  //     }

  //     const soldQuantity = this.toExactDisplayQuantity(
  //       historyItem.baseQuantity,
  //       historyItem.unitFactorToBase,
  //     );

  //     const fulfilledBeforeInvoice =
  //       fulfilledSoFarByRequestItemId.get(customerRequestItemId) ?? 0;

  //     const remainingBeforeInvoice = Math.max(
  //       requestedQuantity - fulfilledBeforeInvoice,
  //       0,
  //     );

  //     const appliedToRequestQuantity = Math.min(
  //       soldQuantity,
  //       remainingBeforeInvoice,
  //     );

  //     const extraSaleQuantity = Math.max(
  //       soldQuantity - appliedToRequestQuantity,
  //       0,
  //     );

  //     const fulfilledQuantityAfterInvoice = Math.min(
  //       fulfilledBeforeInvoice + appliedToRequestQuantity,
  //       requestedQuantity,
  //     );

  //     const remainingQuantityAfterInvoice = Math.max(
  //       requestedQuantity - fulfilledQuantityAfterInvoice,
  //       0,
  //     );

  //     fulfilledSoFarByRequestItemId.set(
  //       customerRequestItemId,
  //       fulfilledQuantityAfterInvoice,
  //     );

  //     if (currentSaleItemIds.has(historyItem.saleInvoiceItemId)) {
  //       result.set(historyItem.saleInvoiceItemId, {
  //         customerRequestItemId,
  //         requestedQuantity,
  //         soldQuantity,
  //         appliedToRequestQuantity,
  //         extraSaleQuantity,
  //         fulfilledQuantityAfterInvoice,
  //         remainingQuantityAfterInvoice,
  //       });
  //     }
  //   }

  //   return result;
  // }

  // private toExactDisplayQuantity(
  //   baseQuantity: number,
  //   unitFactorToBase: number,
  // ): number {
  //   if (unitFactorToBase <= 0 || baseQuantity % unitFactorToBase !== 0) {
  //     throw new InternalServerErrorException(
  //       'Stored sale quantity cannot be converted to its display unit',
  //     );
  //   }

  //   return baseQuantity / unitFactorToBase;
  // }
}
