import { BadRequestException, Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';

import { ListDamageInvoicesDto } from '../dto/list-damage-invoices.dto';

import {
  listDamageInvoiceSelect,
  mapDamageInvoiceListItem,
} from '../mapper/list-damage-invoice.mapper';

@Injectable()
export class ListDamageInvoicesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, dto: ListDamageInvoicesDto) {
    const { page, limit, status, fromDate, toDate, pharmacyDrugId } = dto;

    // Pagination
    const safePage = Math.max(Number(page) || 1, 1);

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const skip = (safePage - 1) * safeLimit;

    // Parse dates
    const parsedFromDate = fromDate ? new Date(fromDate) : undefined;

    const parsedToDate = toDate ? new Date(toDate) : undefined;

    // Validate date range
    if (parsedFromDate && parsedToDate && parsedFromDate > parsedToDate) {
      throw new BadRequestException(
        'fromDate must be before or equal to toDate',
      );
    }

    // Include the whole toDate day
    if (parsedToDate) {
      parsedToDate.setUTCHours(23, 59, 59, 999);
    }

    // Filters
    const where: Prisma.DamageInvoiceWhereInput = {
      pharmacyInvoice: {
        pharmacyId,

        // ... Spread Operator means take the status filter only if it's provided..
        // this statement is equivalent to if(status) { where.pharmacyInvoice.status = status } (condition && value) and means that if status is not provided, it will not be included in the where clause.
        ...(status && {
          status,
        }),

        ...((parsedFromDate || parsedToDate) && {
          invoiceDate: {
            ...(parsedFromDate && {
              gte: parsedFromDate,
            }),

            ...(parsedToDate && {
              lte: parsedToDate,
            }),
          },
        }),
      },

      ...(pharmacyDrugId && {
        items: {
          some: {
            // we use some here because we want to filter damage invoices that have at least one item with the specified pharmacyDrugId. If we used every, it would mean that all items in the damage invoice must have the specified pharmacyDrugId, which is not what we want.
            batch: {
              pharmacyDrugId,
            },
          },
        },
      }),
    };

    /**
     * the long code for the previous where clause is equivalent to the following code, but the previous code is more readable and maintainable.
     * const pharmacyInvoiceFilter: Prisma.PharmacyInvoiceWhereInput = {
  pharmacyId: pharmacyId,
};

if (status) {
  pharmacyInvoiceFilter.status = status;
}

if (parsedFromDate || parsedToDate) {
  pharmacyInvoiceFilter.invoiceDate = {};

  if (parsedFromDate) {
    pharmacyInvoiceFilter.invoiceDate.gte = parsedFromDate;
  }

  if (parsedToDate) {
    pharmacyInvoiceFilter.invoiceDate.lte = parsedToDate;
  }
}


const where: Prisma.DamageInvoiceWhereInput = {
  pharmacyInvoice: pharmacyInvoiceFilter,
};


if (pharmacyDrugId) {
  where.items = {
    some: {
      batch: {
        pharmacyDrugId: pharmacyDrugId,
      },
    },
  };
}
     */
    const [damageInvoices, total] = await Promise.all([
      this.prisma.damageInvoice.findMany({
        where,

        skip,

        take: safeLimit,

        orderBy: {
          damageInvoiceId: 'desc',
        },

        select: listDamageInvoiceSelect,
      }),

      this.prisma.damageInvoice.count({
        where,
      }),
    ]);

    const mappedDamageInvoices = damageInvoices.map(mapDamageInvoiceListItem);

    const pages = Math.ceil(total / safeLimit);

    return {
      damageInvoices: mappedDamageInvoices,

      page: safePage,

      limit: safeLimit,

      total,

      pages,

      hasNextPage: safePage < pages,

      hasPreviousPage: safePage > 1,
    };
  }
}
