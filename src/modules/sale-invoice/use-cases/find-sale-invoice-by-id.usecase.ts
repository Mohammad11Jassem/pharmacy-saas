import { Injectable, NotFoundException } from '@nestjs/common';
import { PharmacyInvoiceType } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

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

        items: {
          include: {
            pharmacyDrug: {
              include: {
                drug: {
                  include: {
                    generalDrug: true,
                    privateDrug: true,
                  },
                },
              },
            },

            batchAllocations: {
              include: {
                batch: true,
              },
            },
          },
        },

        returns: {
          include: {
            pharmacyInvoice: true,
            items: {
              include: {
                pharmacyDrug: true,
                saleInvoiceItemBatch: {
                  include: {
                    batch: true,
                    saleInvoiceItem: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!saleInvoice) {
      throw new NotFoundException('Sale invoice not found');
    }

    return {
      ...saleInvoice,

      items: saleInvoice.items.map((item) => ({
        ...item,

        /**
         * لأننا لا نخزن displayQuantity في قاعدة البيانات.
         * نحسبها من:
         * baseQuantity / unitFactorToBase
         */
        displayQuantity:
          item.unitFactorToBase > 0
            ? item.baseQuantity / item.unitFactorToBase
            : null,

        batchAllocations: item.batchAllocations.map((allocation) => ({
          ...allocation,

          /**
           * هذا اختياري، فقط ليسهل على الواجهة فهم كمية كل allocation
           * بالنسبة لوحدة السطر الأصلية.
           */
          displayQuantityFromThisBatch:
            item.unitFactorToBase > 0
              ? allocation.baseQuantity / item.unitFactorToBase
              : null,
        })),
      })),
    };
  }
}
