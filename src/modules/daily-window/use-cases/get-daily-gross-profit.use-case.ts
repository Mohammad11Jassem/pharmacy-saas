import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';

import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
} from '../../../generated/prisma/enums';

import { PrismaService } from '../../../prisma/prisma.service';

import { parseDateOnly } from '../utils/date-only.util';

@Injectable()
export class GetDailyGrossProfitUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, date: string) {
    const invoiceDate = parseDateOnly(date);

    const [salesAggregate, returnsAggregate, soldAllocations, returnedItems] =
      await Promise.all([
        this.prisma.saleInvoice.aggregate({
          where: {
            pharmacyInvoice: {
              pharmacyId,
              invoiceDate,

              invoiceType: PharmacyInvoiceType.SALE,

              status: PharmacyInvoiceStatus.POSTED,
            },
          },

          _sum: {
            totalAmount: true,
          },
        }),

        this.prisma.returnInvoice.aggregate({
          where: {
            pharmacyInvoice: {
              pharmacyId,
              invoiceDate,

              invoiceType: PharmacyInvoiceType.RETURN,

              status: PharmacyInvoiceStatus.POSTED,
            },
          },

          _sum: {
            subtotalRefund: true,
          },
        }),

        this.prisma.saleInvoiceItemBatch.findMany({
          where: {
            saleInvoiceItem: {
              saleInvoice: {
                pharmacyInvoice: {
                  pharmacyId,
                  invoiceDate,

                  invoiceType: PharmacyInvoiceType.SALE,

                  status: PharmacyInvoiceStatus.POSTED,
                },
              },
            },
          },

          select: {
            baseQuantity: true,
            unitCostAtSale: true,
          },
        }),

        this.prisma.returnInvoiceItem.findMany({
          where: {
            returnInvoice: {
              pharmacyInvoice: {
                pharmacyId,
                invoiceDate,

                invoiceType: PharmacyInvoiceType.RETURN,

                status: PharmacyInvoiceStatus.POSTED,
              },
            },
          },

          select: {
            baseQuantity: true,
            restockToInventory: true,

            saleInvoiceItemBatch: {
              select: {
                unitCostAtSale: true,
              },
            },
          },
        }),
      ]);

    const zero = new Prisma.Decimal(0);

    const salesRevenue = salesAggregate._sum.totalAmount ?? zero;

    const returnAmount = returnsAggregate._sum.subtotalRefund ?? zero;

    let salesCostOfGoods = new Prisma.Decimal(0); //تكلفة شراء جميع الوحدات المباعة

    let restoredInventoryCost = new Prisma.Decimal(0); //تكلفة الوحدات المرتجعة والتي عادت فعلياً إلى المخزون

    let missingCostBaseQuantity = 0; //عدد الوحدات التي لا نعرف تكلفة شرائها

    //حساب تكلفة الوحدات المباعة
    for (const allocation of soldAllocations) {
      if (allocation.unitCostAtSale === null) {
        missingCostBaseQuantity += allocation.baseQuantity;

        continue;
      }

      salesCostOfGoods = salesCostOfGoods.plus(
        allocation.unitCostAtSale.mul(allocation.baseQuantity),
      );
    }

    for (const returnedItem of returnedItems) {
      /**
       * COGS is reversed only when the returned
       * quantity goes back to inventory.
       */
      if (!returnedItem.restockToInventory) {
        continue;
      }

      const unitCostAtSale = returnedItem.saleInvoiceItemBatch.unitCostAtSale;

      if (unitCostAtSale === null) {
        missingCostBaseQuantity += returnedItem.baseQuantity;

        continue;
      }

      restoredInventoryCost = restoredInventoryCost.plus(
        unitCostAtSale.mul(returnedItem.baseQuantity),
      );
    }

    const netSalesRevenue = salesRevenue.minus(returnAmount);

    const netCostOfGoodsSold = salesCostOfGoods.minus(restoredInventoryCost);

    const isComplete = missingCostBaseQuantity === 0;

    const grossProfit = netSalesRevenue.minus(netCostOfGoodsSold);

    /**
     * 
     salesRevenue
    مجموع مبالغ فواتير البيع في اليوم.
    
    returnAmount
    مجموع المبالغ التي أُعيدت للزبائن في اليوم.
    netSalesRevenue
    المبيعات ناقص المرتجعات.
    salesCostOfGoods
    تكلفة شراء جميع الوحدات المباعة.
    restoredInventoryCost
    تكلفة الوحدات المرتجعة التي عادت إلى المخزون.
    netCostOfGoodsSold
    تكلفة البضاعة المباعة بعد عكس تكلفة المخزون المستعاد.
    grossProfitAmount
    الربح الإجمالي الفعلي.
    missingCostBaseQuantity
    عدد الوحدات التي لم توجد لها تكلفة شراء محفوظة.
    isComplete
    هل حساب الربح كامل وموثوق؟
     */
    return {
      salesRevenue: salesRevenue.toNumber(),

      returnAmount: returnAmount.toNumber(),

      netSalesRevenue: netSalesRevenue.toNumber(),

      salesCostOfGoods: salesCostOfGoods.toNumber(),

      restoredInventoryCost: restoredInventoryCost.toNumber(),

      netCostOfGoodsSold: netCostOfGoodsSold.toNumber(),

      grossProfitAmount: isComplete ? grossProfit.toNumber() : null,

      missingCostBaseQuantity,

      isComplete,

      currency: 'SYP' as const,
    };
  }
}
