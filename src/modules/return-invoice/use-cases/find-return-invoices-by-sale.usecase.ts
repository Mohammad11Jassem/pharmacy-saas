import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PharmacyInvoiceType,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../../common/pagination/pagination.util';
import {
  GetReturnInvoicesBySaleDto,
  ReturnInvoiceSortBy,
  SortOrder,
} from '../dto/get-return-invoices-by-sale.dto';

@Injectable()
export class FindReturnInvoicesBySaleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pharmacyId: number,
    saleInvoiceId: number,
    query: GetReturnInvoicesBySaleDto,
  ) {
    this.validateDateRange(query);
    this.validateRefundRange(query);

    await this.assertSaleInvoiceBelongsToPharmacy(
      pharmacyId,
      saleInvoiceId,
    );

    const { page, limit, skip, take } = getPaginationParams(
      query.page,
      query.limit,
    );

    const where = this.buildWhere(pharmacyId, saleInvoiceId, query);
    const orderBy = this.buildOrderBy(query);

    const [items, total] = await Promise.all([
      this.prisma.returnInvoice.findMany({
        where,
        include: {
          pharmacyInvoice: {
            include: {
              patient: true,
            },
          },

          referenceSaleInvoice: {
            include: {
              pharmacyInvoice: true,
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

              saleInvoiceItemBatch: {
                include: {
                  batch: true,
                  saleInvoiceItem: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take,
      }),

      this.prisma.returnInvoice.count({
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

        /**
         * كمية البيع الأصلية الخارجة من نفس SaleInvoiceItemBatch
         * محولة حسب وحدة سطر البيع الأصلي.
         */
        originalSoldDisplayQuantity:
          item.saleInvoiceItemBatch.saleInvoiceItem.unitFactorToBase > 0
            ? item.saleInvoiceItemBatch.baseQuantity /
              item.saleInvoiceItemBatch.saleInvoiceItem.unitFactorToBase
            : null,
      })),
    }));

    return toPaginatedResult(mappedItems, total, page, limit);
  }

  private async assertSaleInvoiceBelongsToPharmacy(
    pharmacyId: number,
    saleInvoiceId: number,
  ): Promise<void> {
    const saleInvoice = await this.prisma.saleInvoice.findFirst({
      where: {
        saleInvoiceId,
        pharmacyInvoice: {
          pharmacyId,
          invoiceType: PharmacyInvoiceType.SALE,
        },
      },
      select: {
        saleInvoiceId: true,
      },
    });

    if (!saleInvoice) {
      throw new NotFoundException('Sale invoice not found');
    }
  }

  private buildWhere(
    pharmacyId: number,
    saleInvoiceId: number,
    query: GetReturnInvoicesBySaleDto,
  ): Prisma.ReturnInvoiceWhereInput {
    const pharmacyInvoiceWhere: Prisma.PharmacyInvoiceWhereInput = {
      pharmacyId,
      invoiceType: PharmacyInvoiceType.RETURN,
    };

    if (query.invoiceStatus) {
      pharmacyInvoiceWhere.status = query.invoiceStatus;
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
          idempotencyKey: {
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

    const where: Prisma.ReturnInvoiceWhereInput = {
      referenceSaleInvoiceId: saleInvoiceId,
      pharmacyInvoice: pharmacyInvoiceWhere,
    };

    if (query.returnInvoiceId) {
      where.returnInvoiceId = query.returnInvoiceId;
    }

    if (query.pharmacyInvoiceId) {
      where.pharmacyInvoiceId = query.pharmacyInvoiceId;
    }

    if (
      query.minRefund !== undefined ||
      query.maxRefund !== undefined
    ) {
      const refundFilter: Prisma.DecimalFilter = {};

      if (query.minRefund !== undefined) {
        refundFilter.gte = new Prisma.Decimal(query.minRefund);
      }

      if (query.maxRefund !== undefined) {
        refundFilter.lte = new Prisma.Decimal(query.maxRefund);
      }

      where.subtotalRefund = refundFilter;
    }

    if (
      query.pharmacyDrugId ||
      query.unitType ||
      query.returnReason ||
      query.restockToInventory !== undefined ||
      query.batchId ||
      query.saleInvoiceItemBatchId
    ) {
      const itemWhere: Prisma.ReturnInvoiceItemWhereInput = {};

      if (query.pharmacyDrugId) {
        itemWhere.pharmacyDrugId = query.pharmacyDrugId;
      }

      if (query.unitType) {
        itemWhere.unitType = query.unitType;
      }

      if (query.returnReason) {
        itemWhere.returnReason = query.returnReason;
      }

      if (query.restockToInventory !== undefined) {
        itemWhere.restockToInventory = query.restockToInventory;
      }

      if (query.saleInvoiceItemBatchId) {
        itemWhere.saleInvoiceItemBatchId = query.saleInvoiceItemBatchId;
      }

      if (query.batchId) {
        itemWhere.saleInvoiceItemBatch = {
          batchId: query.batchId,
        };
      }

      where.items = {
        some: itemWhere,
      };
    }

    return where;
  }

  private buildOrderBy(
    query: GetReturnInvoicesBySaleDto,
  ): Prisma.ReturnInvoiceOrderByWithRelationInput {
    const sortOrder = query.sortOrder ?? SortOrder.DESC;

    switch (query.sortBy) {
      case ReturnInvoiceSortBy.INVOICE_DATE:
        return {
          pharmacyInvoice: {
            invoiceDate: sortOrder,
          },
        };

      case ReturnInvoiceSortBy.SUBTOTAL_REFUND:
        return {
          subtotalRefund: sortOrder,
        };

      case ReturnInvoiceSortBy.RETURN_INVOICE_ID:
        return {
          returnInvoiceId: sortOrder,
        };

      case ReturnInvoiceSortBy.CREATED_AT:
      default:
        return {
          createdAt: sortOrder,
        };
    }
  }

  private validateDateRange(query: GetReturnInvoicesBySaleDto): void {
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

  private validateRefundRange(query: GetReturnInvoicesBySaleDto): void {
    if (
      query.minRefund !== undefined &&
      query.maxRefund !== undefined &&
      query.minRefund > query.maxRefund
    ) {
      throw new BadRequestException(
        'minRefund must be less than or equal to maxRefund',
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