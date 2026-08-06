import { Injectable } from '@nestjs/common';

import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
} from '../../../generated/prisma/enums';

import { PrismaService } from '../../../prisma/prisma.service';

import { parseDateOnly } from '../utils/date-only.util';

@Injectable()
export class GetDailyGrossSalesUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    pharmacyId: number,
    date: string,
  ) {
    const invoiceDate =
      parseDateOnly(date);

    const result =
      await this.prisma.saleInvoice.aggregate({
        where: {
          pharmacyInvoice: {
            pharmacyId,
            invoiceDate,

            invoiceType:
              PharmacyInvoiceType.SALE,

            status:
              PharmacyInvoiceStatus.POSTED,
          },
        },

        _sum: {
          totalAmount: true,
        },
      });

    return {
      amount: Number(
        result._sum.totalAmount ?? 0,
      ),

      currency: 'SYP' as const,
    };
  }
}