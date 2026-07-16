import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FindSaleInvoiceBatchesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, saleInvoiceId: number) {
    /*
     * First verify that the invoice belongs to the
     * authenticated pharmacy.
     */
    const saleInvoice = await this.prisma.saleInvoice.findFirst({
      where: {
        saleInvoiceId,

        pharmacyInvoice: {
          pharmacyId,
          invoiceType: PharmacyInvoiceType.SALE,
          status: PharmacyInvoiceStatus.POSTED,
        },
      },

      /*
       * Use an explicit select to return only the fields
       * required by this endpoint.
       */
      select: {
        saleInvoiceId: true,

        pharmacyInvoiceId: true,

        pharmacyInvoice: {
          select: {
            invoiceDate: true,
            status: true,
          },
        },

        items: {
          select: {
            saleInvoiceItemId: true,
            pharmacyDrugId: true,

            unitType: true,
            baseQuantity: true,
            unitFactorToBase: true,

            totalPrice: true,
            discountAmount: true,
            netTotalPrice: true,

            pharmacyDrug: {
              select: {
                // pharmacyDrugId: true,
                drugId: true,

                drug: {
                  select: {
                    source: true,

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

            batchAllocations: {
              select: {
                saleInvoiceItemBatchId: true,
                batchId: true,
                baseQuantity: true,
                createdAt: true,

                batch: {
                  select: {
                    batchId: true,
                    expiryDate: true,
                    receivedDate: true,
                    status: true,
                  },
                },

                /*
                 * Calculate the quantity already returned
                 * from this exact sale-batch allocation.
                 */
                returnItems: {
                  where: {
                    returnInvoice: {
                      pharmacyInvoice: {
                        status: PharmacyInvoiceStatus.POSTED,
                      },
                    },
                  },

                  select: {
                    baseQuantity: true,
                  },
                },
              },

              orderBy: [
                {
                  batch: {
                    expiryDate: 'asc',
                  },
                },
                {
                  batchId: 'asc',
                },
              ],
            },
          },

          orderBy: {
            saleInvoiceItemId: 'asc',
          },
        },
      },
    });

    if (!saleInvoice) {
      throw new NotFoundException('Sale invoice not found');
    }

    const items = saleInvoice.items.map((item) => {
      const tradeName =
        item.pharmacyDrug.drug.generalDrug?.tradeName ??
        item.pharmacyDrug.drug.privateDrug?.tradeName ??
        null;

      const soldDisplayQuantity =
        item.unitFactorToBase > 0
          ? item.baseQuantity / item.unitFactorToBase
          : null;

      const batches = item.batchAllocations.map((allocation) => {
        const returnedBaseQuantity = allocation.returnItems.reduce(
          (sum, returnItem) => sum + returnItem.baseQuantity,
          0,
        );

        const remainingReturnableBaseQuantity = Math.max(
          allocation.baseQuantity - returnedBaseQuantity,
          0,
        );

        return {
          saleInvoiceItemBatchId: allocation.saleInvoiceItemBatchId,

          batchId: allocation.batchId,

          soldBaseQuantity: allocation.baseQuantity,

          soldDisplayQuantity:
            item.unitFactorToBase > 0
              ? allocation.baseQuantity / item.unitFactorToBase
              : null,

          returnedBaseQuantity,

          remainingReturnableBaseQuantity,

          remainingReturnableDisplayQuantity:
            item.unitFactorToBase > 0
              ? remainingReturnableBaseQuantity / item.unitFactorToBase
              : null,

          batch: {
            batchId: allocation.batch.batchId,

            expiryDate: allocation.batch.expiryDate,

            receivedDate: allocation.batch.receivedDate,

            status: allocation.batch.status,
          },

          allocationCreatedAt: allocation.createdAt,
        };
      });

      const returnedBaseQuantity = batches.reduce(
        (sum, batch) => sum + batch.returnedBaseQuantity,
        0,
      );

      const remainingReturnableBaseQuantity = batches.reduce(
        (sum, batch) => sum + batch.remainingReturnableBaseQuantity,
        0,
      );

      const remainingReturnableDisplayQuantity =
        item.unitFactorToBase > 0
          ? remainingReturnableBaseQuantity / item.unitFactorToBase
          : null;

      return {
        saleInvoiceItemId: item.saleInvoiceItemId,

        pharmacyDrugId: item.pharmacyDrugId,

        drugId: item.pharmacyDrug.drugId,

        tradeName,

        source: item.pharmacyDrug.drug.source,

        unitType: item.unitType,

        unitFactorToBase: item.unitFactorToBase,

        soldBaseQuantity: item.baseQuantity,

        soldDisplayQuantity: soldDisplayQuantity,

        totalPrice: Number(item.totalPrice),

        discountAmount: Number(item.discountAmount),

        netTotalPrice: Number(item.netTotalPrice),

        returnedBaseQuantity,

        remainingReturnableBaseQuantity,

        remainingReturnableDisplayQuantity,

        batches,
      };
    });

    const totalBatchAllocations = items.reduce(
      (sum, item) => sum + item.batches.length,
      0,
    );

    return {
      saleInvoiceId: saleInvoice.saleInvoiceId,

      pharmacyInvoiceId: saleInvoice.pharmacyInvoiceId,

      invoiceDate: saleInvoice.pharmacyInvoice.invoiceDate,

      invoiceStatus: saleInvoice.pharmacyInvoice.status,

      itemsCount: items.length,

      totalBatchAllocations,

      items,
    };
  }
}
