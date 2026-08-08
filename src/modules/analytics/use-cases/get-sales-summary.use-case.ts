import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { AnalyticsPeriod } from '../utils/analytics-period.util';

@Injectable()
export class GetSalesSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: { pharmacyKey: number; period: AnalyticsPeriod }) {
    const { pharmacyKey, period } = params;

    const result = await this.prisma.factBillsDaily.aggregate({
      where: {
        pharmacyKey,

        dateKey: {
          gte: period.fromDateKey,

          lte: period.toDateKey,
        },
      },

      _sum: {
        grossSalesAmount: true,

        netSalesAmount: true,

        saleInvoiceCount: true,
      },
    });

    return {
      period: {
        fromDate: period.fromDate,

        toDate: period.toDate,
      },

      grossSalesAmount: Number(result._sum.grossSalesAmount ?? 0),

      netSalesAmount: Number(result._sum.netSalesAmount ?? 0),

      saleInvoiceCount: result._sum.saleInvoiceCount ?? 0,
    };
  }
}
