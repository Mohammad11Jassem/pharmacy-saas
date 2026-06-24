import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PharmacyInvoiceType,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  GetSaleInvoicesDto,
  SaleInvoiceSortBy,
  SortOrder,
} from '../dto/get-sale-invoices.dto';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../../common/pagination/pagination.util';

@Injectable()
export class FindAllSaleInvoicesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, query: GetSaleInvoicesDto) {
    this.validateDateRange(query);
    this.validateTotalRange(query);

    const { page, limit, skip, take } = getPaginationParams(
      query.page,
      query.limit,
    );

    const where = this.buildWhere(pharmacyId, query);
    const orderBy = this.buildOrderBy(query);

    const [items, total] = await Promise.all([
      this.prisma.saleInvoice.findMany({
        where,
        include: {
          pharmacyInvoice: {
            include: {
              patient: true,
            },
          },
          items: {
            include: {
              pharmacyDrug: true,
              batchAllocations: {
                include: {
                  batch: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take,
      }),

      this.prisma.saleInvoice.count({
        where,
      }),
    ]);

    const mappedItems = items.map((invoice) => ({
      ...invoice,

      items: invoice.items.map((item) => ({
        ...item,

        /**
         * لأننا لا نخزن displayQuantity في DB.
         * نحسبها من:
         * baseQuantity / unitFactorToBase
         */
        displayQuantity:
          item.unitFactorToBase > 0
            ? item.baseQuantity / item.unitFactorToBase
            : null,
      })),
    }));

    return toPaginatedResult(mappedItems, total, page, limit);
  }

  private buildWhere(
    pharmacyId: number,
    query: GetSaleInvoicesDto,
  ): Prisma.SaleInvoiceWhereInput {
    const pharmacyInvoiceWhere: Prisma.PharmacyInvoiceWhereInput = {
      pharmacyId,
      invoiceType: PharmacyInvoiceType.SALE,
    };

    if (query.invoiceStatus) {
      pharmacyInvoiceWhere.status = query.invoiceStatus;
    }

    if (query.patientId) {
      pharmacyInvoiceWhere.patientId = query.patientId;
    }

    if (query.fromDate || query.toDate) {
      pharmacyInvoiceWhere.invoiceDate = {};

      if (query.fromDate) {
        pharmacyInvoiceWhere.invoiceDate.gte = this.getStartOfDay(
          query.fromDate,
        );
      }

      if (query.toDate) {
        pharmacyInvoiceWhere.invoiceDate.lte = this.getEndOfDay(
          query.toDate,
        );
      }
    }

    if (query.search?.trim()) {
      const search = query.search.trim();

      pharmacyInvoiceWhere.OR = [
        {
          notes: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          patient: {
            is: {
              fullName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          patient: {
            is: {
              phone: {
                contains: search,
              },
            },
          },
        },
        {
          patient: {
            is: {
              nationalId: {
                contains: search,
              },
            },
          },
        },
      ];
    }

    const where: Prisma.SaleInvoiceWhereInput = {
      pharmacyInvoice: pharmacyInvoiceWhere,
    };

    if (query.saleInvoiceId) {
      where.saleInvoiceId = query.saleInvoiceId;
    }

    if (query.pharmacyInvoiceId) {
      where.pharmacyInvoiceId = query.pharmacyInvoiceId;
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.saleType) {
      where.saleType = query.saleType;
    }

    if (
      query.minTotal !== undefined ||
      query.maxTotal !== undefined
    ) {
      const totalAmountFilter: Prisma.DecimalFilter = {};

      if (query.minTotal !== undefined) {
        totalAmountFilter.gte = new Prisma.Decimal(query.minTotal);
      }

      if (query.maxTotal !== undefined) {
        totalAmountFilter.lte = new Prisma.Decimal(query.maxTotal);
      }

      where.totalAmount = totalAmountFilter;
    }

    if (query.pharmacyDrugId || query.unitType) {
      const itemWhere: Prisma.SaleInvoiceItemWhereInput = {};

      if (query.pharmacyDrugId) {
        itemWhere.pharmacyDrugId = query.pharmacyDrugId;
      }

      if (query.unitType) {
        itemWhere.unitType = query.unitType;
      }

      where.items = {
        some: itemWhere,
      };
    }

    return where;
  }

  private buildOrderBy(
    query: GetSaleInvoicesDto,
  ): Prisma.SaleInvoiceOrderByWithRelationInput {
    const sortOrder = query.sortOrder ?? SortOrder.DESC;

    switch (query.sortBy) {
      case SaleInvoiceSortBy.INVOICE_DATE:
        return {
          pharmacyInvoice: {
            invoiceDate: sortOrder,
          },
        };

      case SaleInvoiceSortBy.TOTAL_AMOUNT:
        return {
          totalAmount: sortOrder,
        };

      case SaleInvoiceSortBy.SALE_INVOICE_ID:
        return {
          saleInvoiceId: sortOrder,
        };

      case SaleInvoiceSortBy.CREATED_AT:
      default:
        return {
          createdAt: sortOrder,
        };
    }
  }

  private validateDateRange(query: GetSaleInvoicesDto): void {
    if (
      query.fromDate &&
      query.toDate &&
      new Date(query.fromDate) > new Date(query.toDate)
    ) {
      throw new BadRequestException(
        'fromDate must be before or equal to toDate',
      );
    }
  }

  private validateTotalRange(query: GetSaleInvoicesDto): void {
    if (
      query.minTotal !== undefined &&
      query.maxTotal !== undefined &&
      query.minTotal > query.maxTotal
    ) {
      throw new BadRequestException(
        'minTotal must be less than or equal to maxTotal',
      );
    }
  }

  private getStartOfDay(value: string): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getEndOfDay(value: string): Date {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
  }
}