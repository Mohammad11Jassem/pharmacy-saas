import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { buildHistoricalDateWindow } from '../utils/historical-date-window.util';

@Injectable()
export class GetInvoiceActivityUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyKey: number, days: number) {
    const period = buildHistoricalDateWindow(days);

    // ==================================================
    // PREVIOUS PERIOD
    // ==================================================

    const currentFromDate = new Date(`${period.fromDate}T00:00:00.000Z`);

    /*
     * Previous period ends one day
     * before the current period starts.
     */
    const previousToDate = new Date(currentFromDate);

    previousToDate.setUTCDate(previousToDate.getUTCDate() - 1);

    /*
     * Because the range is inclusive,
     * we subtract days - 1.
     *
     * Example:
     *
     * current:
     * 2026-07-10 -> 2026-08-08
     *
     * previous:
     * 2026-06-10 -> 2026-07-09
     */
    const previousFromDate = new Date(previousToDate);

    previousFromDate.setUTCDate(previousFromDate.getUTCDate() - (days - 1));

    const buildDateKey = (date: Date) => {
      const year = date.getUTCFullYear();

      const month = String(date.getUTCMonth() + 1).padStart(2, '0');

      const day = String(date.getUTCDate()).padStart(2, '0');

      return Number(`${year}${month}${day}`);
    };

    const previousFromDateKey = buildDateKey(previousFromDate);

    const previousToDateKey = buildDateKey(previousToDate);

    // ==================================================
    // CURRENT + PREVIOUS AGGREGATION
    // ==================================================

    const [currentResult, previousResult] = await Promise.all([
      this.prisma.factBillsDaily.aggregate({
        where: {
          pharmacyKey,

          dateKey: {
            gte: period.fromDateKey,

            lte: period.toDateKey,
          },
        },

        _sum: {
          saleInvoiceCount: true,
          returnInvoiceCount: true,
          damageInvoiceCount: true,
          supplierInvoiceCount: true,
        },
      }),

      this.prisma.factBillsDaily.aggregate({
        where: {
          pharmacyKey,

          dateKey: {
            gte: previousFromDateKey,

            lte: previousToDateKey,
          },
        },

        _sum: {
          saleInvoiceCount: true,
          returnInvoiceCount: true,
          damageInvoiceCount: true,
          supplierInvoiceCount: true,
        },
      }),
    ]);

    // ==================================================
    // CURRENT TOTAL ACTIVITY
    // ==================================================

    const currentSaleCount = currentResult._sum.saleInvoiceCount ?? 0;

    const currentReturnCount = currentResult._sum.returnInvoiceCount ?? 0;

    const currentDamageCount = currentResult._sum.damageInvoiceCount ?? 0;

    const currentSupplierCount = currentResult._sum.supplierInvoiceCount ?? 0;

    const currentTotalActivity =
      currentSaleCount +
      currentReturnCount +
      currentDamageCount +
      currentSupplierCount;

    // ==================================================
    // PREVIOUS TOTAL ACTIVITY
    // ==================================================

    const previousTotalActivity =
      (previousResult._sum.saleInvoiceCount ?? 0) +
      (previousResult._sum.returnInvoiceCount ?? 0) +
      (previousResult._sum.damageInvoiceCount ?? 0) +
      (previousResult._sum.supplierInvoiceCount ?? 0);

    // ==================================================
    // ACTIVITY RATIO
    // ==================================================

    let value = '0.00x';

    let note = `لا توجد بيانات كافية للمقارنة مع الـ ${days} يوم السابقة`;

    if (previousTotalActivity > 0) {
      const ratio = currentTotalActivity / previousTotalActivity;

      const percentageChange =
        ((currentTotalActivity - previousTotalActivity) /
          previousTotalActivity) *
        100;

      value = `${ratio.toFixed(2)}x`;

      if (percentageChange > 0) {
        note = `${percentageChange.toFixed(1)}% أسرع من الـ ${days} يوم السابقة`;
      } else if (percentageChange < 0) {
        note = `${Math.abs(percentageChange).toFixed(
          1,
        )}% أبطأ من الـ ${days} يوم السابقة`;
      } else {
        note = `نفس معدل الحركة مقارنة بالـ ${days} يوم السابقة`;
      }
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    return {
      days,

      period: {
        fromDate: period.fromDate,

        toDate: period.toDate,
      },

      totalValue: {
        value,
        note,
      },

      items: [
        {
          type: 'SALE',

          count: currentSaleCount,
        },

        {
          type: 'RETURN',

          count: currentReturnCount,
        },

        {
          type: 'DAMAGE',

          count: currentDamageCount,
        },

        {
          type: 'SUPPLIER',

          count: currentSupplierCount,
        },
      ],
    };
  }
}
