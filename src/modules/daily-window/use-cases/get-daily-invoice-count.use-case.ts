import { Injectable } from '@nestjs/common';

import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
  SupplierInvoiceStatus,
} from '../../../generated/prisma/enums';

import { PrismaService } from '../../../prisma/prisma.service';

import { parseDateOnly } from '../utils/date-only.util';

@Injectable()
export class GetDailyInvoiceCountUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    pharmacyId: number,
    date: string,
  ) {
    const invoiceDate =
      parseDateOnly(date);

    const [
      saleCount,
      returnCount,
      damageCount,
      purchaseCount,
    ] = await Promise.all([
      this.prisma.pharmacyInvoice.count({
        where: {
          pharmacyId,
          invoiceDate,

          invoiceType:
            PharmacyInvoiceType.SALE,

          status:
            PharmacyInvoiceStatus.POSTED,
        },
      }),

      this.prisma.pharmacyInvoice.count({
        where: {
          pharmacyId,
          invoiceDate,

          invoiceType:
            PharmacyInvoiceType.RETURN,

          status:
            PharmacyInvoiceStatus.POSTED,
        },
      }),

      this.prisma.pharmacyInvoice.count({
        where: {
          pharmacyId,
          invoiceDate,

          invoiceType:
            PharmacyInvoiceType.DAMAGE,

          status:
            PharmacyInvoiceStatus.POSTED,
        },
      }),

      this.prisma.supplierInvoice.count({
        where: {
          invoiceDate,

          status: {
            not:
              SupplierInvoiceStatus.CANCELLED,
          },

          supplier: {
            pharmacyId,
          },
        },
      }),
    ]);

    return {
      totalCount:
        saleCount +
        returnCount +
        damageCount +
        purchaseCount,

      breakdown: {
        saleCount,
        returnCount,
        damageCount,
        purchaseCount,
      },
    };
  }
}